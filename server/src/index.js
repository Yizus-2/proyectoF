import express from 'express'
import cors from 'cors'
import multer from 'multer'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

import { pool, withTransaction } from './db.js'
import { optionalAuth, requireAuth, requireRoles, signToken, verifyPassword } from './auth.js'
import { addSseClient, broadcastEvent } from './events.js'
import { seedDatabase } from './seed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const PORT = Number(process.env.API_PORT || 3001)
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'
const UPLOADS_DIR = path.resolve(__dirname, '../uploads')

fs.mkdirSync(path.join(UPLOADS_DIR, 'reports'), { recursive: true })
fs.mkdirSync(path.join(UPLOADS_DIR, 'evidences'), { recursive: true })

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_CATEGORIES = new Set([
  'fuga_agua',
  'fuga_alcantarillado',
  'tuberia_rota',
  'dano_pavimento',
  'dano_infraestructura',
  'otro'
])
const ALLOWED_PRIORITIES = new Set(['BAJA', 'MEDIA', 'ALTA', 'CRITICA'])
const ALLOWED_STATUSES = new Set([
  'REPORTADO',
  'CLASIFICADO',
  'ASIGNADO',
  'EN_PROGRESO',
  'EVIDENCIA_PENDIENTE',
  'VERIFICACION_SUPERVISOR',
  'RESUELTO',
  'CERRADO',
  'EVALUADO',
  'RECHAZADO'
])
const ALLOWED_SOURCES = new Set([
  'WEB',
  'OFFLINE',
  'WHATSAPP',
  'APP_MOVIL',
  'TELEFONO',
  'CORREO',
  'PRESENCIAL',
  'BOTON_EMERGENCIA'
])

function createUploader(subfolder) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, path.join(UPLOADS_DIR, subfolder)),
    filename: (_req, file, cb) => {
      const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg'
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`)
    }
  })

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_MIME.has(file.mimetype)) {
        return cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP (máx. 5 MB).'))
      }
      cb(null, true)
    }
  })
}

const uploadReportPhoto = createUploader('reports')
const uploadEvidencePhoto = createUploader('evidences')

const app = express()

// Cabeceras básicas de seguridad
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  next()
})

app.use(
  cors({
    origin: CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true
  })
)
app.use(express.json({ limit: '2mb' }))
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '1d' }))

// ─────────────────────────────────────────────
// HEALTHCHECK
// ─────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', database: 'postgresql', timestamp: new Date().toISOString() })
  } catch (err) {
    res.status(503).json({ status: 'error', error: err.message })
  }
})

// ─────────────────────────────────────────────
// AUTENTICACIÓN (JWT + SCRYPT)
// ─────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase()
    const password = String(req.body?.password || '')
    if (!email || !password) {
      return res.status(400).json({ error: 'Correo y contraseña requeridos.' })
    }

    const { rows } = await pool.query(
      'SELECT id, email, password_hash, full_name, phone, role, zone_id, crew_id, is_active FROM public.users WHERE LOWER(email) = $1',
      [email]
    )
    const user = rows[0]
    if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) {
      return res.status(401).json({ error: 'Credenciales inválidas.' })
    }

    const token = signToken(user)
    const safeUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
      zone_id: user.zone_id,
      crew_id: user.crew_id
    }
    res.json({ token, user: safeUser })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Error interno al iniciar sesión.' })
  }
})

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({ user: req.user })
})

// ─────────────────────────────────────────────
// SERVER-SENT EVENTS (TIEMPO REAL)
// ─────────────────────────────────────────────
app.get('/api/events', requireAuth, requireRoles('admin', 'supervisor', 'operator'), (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`)

  addSseClient(res)

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n')
    } catch {
      clearInterval(heartbeat)
    }
  }, 25000)

  req.on('close', () => clearInterval(heartbeat))
})

// ─────────────────────────────────────────────
// ZONAS (Público: solo catálogo geográfico)
// ─────────────────────────────────────────────
app.get('/api/zones', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, name, code, description, sla_hours, lat, lng FROM public.zones ORDER BY name ASC'
    )
    res.json(rows)
  } catch (err) {
    console.error('GET /api/zones error:', err)
    res.status(500).json({ error: 'Error al consultar zonas.' })
  }
})

// ─────────────────────────────────────────────
// REPORTES CIUDADANOS Y GESTIÓN OPERATIVA
// ─────────────────────────────────────────────

// Crear reporte (ciudadano anónimo o usuario autenticado)
app.post('/api/reports', optionalAuth, uploadReportPhoto.single('photo'), async (req, res) => {
  try {
    const body = req.body || {}
    const category = ALLOWED_CATEGORIES.has(body.category) ? body.category : 'otro'
    const priority = ALLOWED_PRIORITIES.has(body.priority) ? body.priority : 'BAJA'
    const source = ALLOWED_SOURCES.has(body.source) ? body.source : 'WEB'
    const address = String(body.address || '').trim() || 'Ubicación seleccionada en mapa'
    const zoneId = body.zone_id ? Number(body.zone_id) : null
    const lat = body.lat !== undefined && body.lat !== '' && body.lat !== null ? Number(body.lat) : null
    const lng = body.lng !== undefined && body.lng !== '' && body.lng !== null ? Number(body.lng) : null

    if (!zoneId || Number.isNaN(zoneId)) {
      return res.status(400).json({ error: 'Debe seleccionar una zona válida.' })
    }

    const photoPath = req.file ? `/uploads/reports/${req.file.filename}` : null

    const created = await withTransaction(
      async (client) => {
        const { rows } = await client.query(
          `INSERT INTO public.reports (
            reporter_id, reporter_name, reporter_phone, reporter_email,
            category, priority, description, address, sector, zone_id, lat, lng, photo_path, source
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
          RETURNING *`,
          [
            req.user?.id || null,
            String(body.reporter_name || '').trim() || 'Ciudadano Anónimo',
            String(body.reporter_phone || '').trim() || null,
            String(body.reporter_email || '').trim() || null,
            category,
            priority,
            String(body.description || '').trim() || null,
            address,
            String(body.sector || '').trim() || null,
            zoneId,
            Number.isFinite(lat) ? lat : null,
            Number.isFinite(lng) ? lng : null,
            photoPath,
            source
          ]
        )

        const report = rows[0]

        // Intentar asignación automática de cuadrilla
        await client.query('SELECT public.assign_crew_automatically($1)', [report.id])

        const { rows: refreshed } = await client.query('SELECT * FROM public.reports WHERE id = $1', [report.id])
        return refreshed[0]
      },
      { userId: req.user?.id || null, notes: 'Asignación automática al crear reporte' }
    )

    broadcastEvent('report:created', {
      id: created.id,
      tracking_code: created.tracking_code,
      category: created.category,
      priority: created.priority,
      status: created.status
    })

    res.status(201).json({
      id: created.id,
      tracking_code: created.tracking_code,
      status: created.status,
      work_order: created.work_order
    })
  } catch (err) {
    console.error('POST /api/reports error:', err)
    res.status(500).json({ error: err.message || 'Error al registrar reporte.' })
  }
})

// Rastreo ciudadano PRIVACY-SAFE (NUNCA expone PII del reportante)
app.get('/api/reports/track/:code', async (req, res) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase()
    if (!code) return res.status(400).json({ error: 'Código PQR requerido.' })

    const { rows } = await pool.query(
      `SELECT
         r.id, r.tracking_code, r.status, r.address, r.sector, r.category,
         r.priority, r.created_at, r.resolved_at, r.closed_at,
         r.photo_path, r.evidence_path, r.work_order, r.zone_id,
         z.name AS zone_name
       FROM public.reports r
       LEFT JOIN public.zones z ON z.id = r.zone_id
       WHERE UPPER(r.tracking_code) = $1`,
      [code]
    )

    if (!rows[0]) {
      return res.status(404).json({
        error: 'No se encontró ningún reporte con este código. Verifica que esté bien escrito (ej: REP-YYYYMMDD-0001).'
      })
    }

    const report = rows[0]
    const { rows: history } = await pool.query(
      `SELECT previous_status, new_status, notes, created_at
       FROM public.report_history
       WHERE report_id = $1
       ORDER BY created_at DESC`,
      [report.id]
    )

    res.json({ report, history })
  } catch (err) {
    console.error('GET /api/reports/track error:', err)
    res.status(500).json({ error: 'Error al consultar reporte.' })
  }
})

// Listar todos los reportes (SOLO personal autenticado)
app.get('/api/reports', requireAuth, requireRoles('admin', 'supervisor', 'operator'), async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT r.*, z.name AS zone_name, z.sla_hours
       FROM public.reports r
       LEFT JOIN public.zones z ON z.id = r.zone_id
       ORDER BY r.created_at DESC`
    )
    res.json(rows)
  } catch (err) {
    console.error('GET /api/reports error:', err)
    res.status(500).json({ error: 'Error al listar reportes.' })
  }
})

// Actualizar reporte (RBAC estricto según rol)
app.patch(
  '/api/reports/:id',
  requireAuth,
  requireRoles('admin', 'supervisor', 'operator'),
  uploadEvidencePhoto.single('evidence'),
  async (req, res) => {
    try {
      const reportId = Number(req.params.id)
      if (!Number.isInteger(reportId) || reportId <= 0) {
        return res.status(400).json({ error: 'ID de reporte inválido.' })
      }

      const body = req.body || {}
      const newStatus = body.status ? String(body.status) : undefined
      if (newStatus && !ALLOWED_STATUSES.has(newStatus)) {
        return res.status(400).json({ error: 'Estado de reporte inválido.' })
      }

      // Solo admin/supervisor puede cerrar un reporte
      if (newStatus === 'CERRADO' && !['admin', 'supervisor'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Solo supervisores o administradores pueden cerrar un reporte.' })
      }

      const evidencePath = req.file ? `/uploads/evidences/${req.file.filename}` : undefined

      const updated = await withTransaction(
        async (client) => {
          const { rows: existingRows } = await client.query('SELECT * FROM public.reports WHERE id = $1', [reportId])
          const existing = existingRows[0]
          if (!existing) return null

          if (['CERRADO', 'EVALUADO', 'RECHAZADO'].includes(existing.status) && req.user.role !== 'admin') {
            throw Object.assign(new Error('Este reporte ya fue finalizado y no puede modificarse.'), { statusCode: 409 })
          }

          let assignedCrewId = existing.assigned_crew_id
          let workOrder = body.work_order !== undefined ? (String(body.work_order).trim() || null) : existing.work_order

          if (workOrder && workOrder !== existing.work_order) {
            const { rows: crewRows } = await client.query('SELECT id FROM public.crews WHERE name = $1', [workOrder])
            assignedCrewId = crewRows[0]?.id || null
          } else if (workOrder === null) {
            assignedCrewId = null
          }

          const { rows } = await client.query(
            `UPDATE public.reports
             SET
               status = COALESCE($1, status),
               work_order = $2,
               assigned_crew_id = $3,
               assigned_operator_id = COALESCE($4, assigned_operator_id),
               evidence_path = COALESCE($5, evidence_path)
             WHERE id = $6
             RETURNING *`,
            [
              newStatus || null,
              workOrder,
              assignedCrewId,
              body.assigned_operator_id || null,
              evidencePath || null,
              reportId
            ]
          )
          return rows[0]
        },
        { userId: req.user.id, notes: body.notes || `Actualizado por ${req.user.role}` }
      )

      if (!updated) return res.status(404).json({ error: 'Reporte no encontrado.' })

      broadcastEvent('report:updated', {
        id: updated.id,
        tracking_code: updated.tracking_code,
        status: updated.status
      })

      res.json(updated)
    } catch (err) {
      const code = err.statusCode || 500
      console.error('PATCH /api/reports/:id error:', err)
      res.status(code).json({ error: err.message || 'Error al actualizar reporte.' })
    }
  }
)

// Asignación automática de cuadrilla
app.post('/api/reports/:id/assign-auto', requireAuth, requireRoles('admin', 'supervisor'), async (req, res) => {
  try {
    const reportId = Number(req.params.id)
    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({ error: 'ID de reporte inválido.' })
    }

    const crewId = await withTransaction(
      async (client) => {
        const { rows } = await client.query('SELECT public.assign_crew_automatically($1) AS crew_id', [reportId])
        return rows[0]?.crew_id || null
      },
      { userId: req.user.id, notes: 'Asignación automática de cuadrilla solicitada desde panel' }
    )

    if (crewId) {
      broadcastEvent('report:updated', { id: reportId, crew_id: crewId })
    }

    res.json({ crew_id: crewId })
  } catch (err) {
    console.error('POST /api/reports/:id/assign-auto error:', err)
    res.status(500).json({ error: 'Error al asignar cuadrilla automáticamente.' })
  }
})

// ─────────────────────────────────────────────
// EVIDENCIAS DE CAMPO (OPERARIOS)
// ─────────────────────────────────────────────
app.get('/api/reports/:id/evidences', requireAuth, requireRoles('admin', 'supervisor', 'operator'), async (req, res) => {
  try {
    const reportId = Number(req.params.id)
    const { rows } = await pool.query(
      `SELECT e.*, u.full_name AS uploader_name, u.email AS uploader_email
       FROM public.evidences e
       LEFT JOIN public.users u ON u.id = e.uploaded_by
       WHERE e.report_id = $1
       ORDER BY e.created_at ASC`,
      [reportId]
    )
    res.json(rows)
  } catch (err) {
    console.error('GET evidences error:', err)
    res.status(500).json({ error: 'Error al cargar evidencias.' })
  }
})

app.post(
  '/api/reports/:id/evidences',
  requireAuth,
  requireRoles('admin', 'supervisor', 'operator'),
  uploadEvidencePhoto.single('photo'),
  async (req, res) => {
    try {
      const reportId = Number(req.params.id)
      const body = req.body || {}
      if (!req.file) {
        return res.status(400).json({ error: 'La fotografía de evidencia es obligatoria.' })
      }
      const description = String(body.description || '').trim()
      if (!description) {
        return res.status(400).json({ error: 'La descripción es obligatoria.' })
      }

      const evidenceUrl = `/uploads/evidences/${req.file.filename}`
      const lat = body.lat !== undefined && body.lat !== '' ? Number(body.lat) : null
      const lng = body.lng !== undefined && body.lng !== '' ? Number(body.lng) : null
      const hoursSpent = body.hours_spent !== undefined && body.hours_spent !== '' ? Number(body.hours_spent) : 0

      const result = await withTransaction(
        async (client) => {
          const { rows: repRows } = await client.query('SELECT id, status FROM public.reports WHERE id = $1', [reportId])
          const report = repRows[0]
          if (!report) return null

          const isArrival = report.status === 'ASIGNADO'
          const { rows: evRows } = await client.query(
            `INSERT INTO public.evidences (
              report_id, evidence_url, description, materials, hours_spent, lat, lng, uploaded_by
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            RETURNING *`,
            [
              reportId,
              evidenceUrl,
              description,
              isArrival ? 'N/A (Llegada al sitio)' : String(body.materials || '').trim() || null,
              isArrival ? 0 : (Number.isFinite(hoursSpent) && hoursSpent >= 0 ? hoursSpent : 0),
              Number.isFinite(lat) ? lat : null,
              Number.isFinite(lng) ? lng : null,
              req.user.id
            ]
          )

          const nextStatus = isArrival ? 'EN_PROGRESO' : 'RESUELTO'
          await client.query(
            `UPDATE public.reports
             SET status = $1,
                 evidence_path = CASE WHEN $1 = 'RESUELTO' THEN $2 ELSE evidence_path END
             WHERE id = $3`,
            [nextStatus, evidenceUrl, reportId]
          )

          return { evidence: evRows[0], nextStatus }
        },
        { userId: req.user.id, notes: description }
      )

      if (!result) return res.status(404).json({ error: 'Reporte no encontrado.' })

      broadcastEvent('report:updated', { id: reportId, status: result.nextStatus })
      res.status(201).json(result)
    } catch (err) {
      console.error('POST evidences error:', err)
      res.status(500).json({ error: err.message || 'Error al registrar evidencia.' })
    }
  }
)

// ─────────────────────────────────────────────
// VERIFICACIÓN DEL SUPERVISOR
// ─────────────────────────────────────────────
app.post('/api/reports/:id/verifications', requireAuth, requireRoles('admin', 'supervisor'), async (req, res) => {
  try {
    const reportId = Number(req.params.id)
    const decision = String(req.body?.decision || '')
    const comments = String(req.body?.comments || '').trim()

    if (!['APROBADO', 'RECHAZADO', 'REGLAMENTO_PENDIENTE'].includes(decision)) {
      return res.status(400).json({ error: 'Decisión de verificación inválida.' })
    }
    if (!comments) {
      return res.status(400).json({ error: 'El comentario de verificación es obligatorio.' })
    }

    const nextStatus =
      decision === 'APROBADO' ? 'CERRADO' : decision === 'RECHAZADO' ? 'RECHAZADO' : 'EN_PROGRESO'

    const verification = await withTransaction(
      async (client) => {
        const { rows: repRows } = await client.query('SELECT id FROM public.reports WHERE id = $1', [reportId])
        if (!repRows[0]) return null

        const { rows: verRows } = await client.query(
          `INSERT INTO public.verifications (report_id, supervisor_id, decision, comments)
           VALUES ($1,$2,$3,$4)
           RETURNING *`,
          [reportId, req.user.id, decision, comments]
        )

        await client.query(
          `UPDATE public.reports
           SET status = $1,
               resolved_at = CASE WHEN $2 = 'APROBADO' THEN COALESCE(resolved_at, NOW()) ELSE resolved_at END
           WHERE id = $3`,
          [nextStatus, decision, reportId]
        )

        return verRows[0]
      },
      { userId: req.user.id, notes: `Verificación (${decision}): ${comments}` }
    )

    if (!verification) return res.status(404).json({ error: 'Reporte no encontrado.' })

    broadcastEvent('report:updated', { id: reportId, status: nextStatus })
    res.status(201).json({ verification, nextStatus })
  } catch (err) {
    console.error('POST verifications error:', err)
    res.status(500).json({ error: 'Error al registrar verificación.' })
  }
})

// ─────────────────────────────────────────────
// ENCUESTAS CSAT (RATINGS)
// ─────────────────────────────────────────────
app.post('/api/ratings', optionalAuth, async (req, res) => {
  try {
    const trackingCode = String(req.body?.tracking_code || '').trim().toUpperCase()
    const score = Number(req.body?.score)
    const comment = String(req.body?.comment || '').trim() || null

    if (!trackingCode) return res.status(400).json({ error: 'Código PQR requerido.' })
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      return res.status(400).json({ error: 'La calificación debe ser un entero entre 1 y 5.' })
    }

    const rating = await withTransaction(async (client) => {
      const { rows: repRows } = await client.query(
        'SELECT id, status FROM public.reports WHERE UPPER(tracking_code) = $1',
        [trackingCode]
      )
      const report = repRows[0]
      if (!report) {
        throw Object.assign(new Error('Reporte no encontrado.'), { statusCode: 404 })
      }
      if (report.status === 'EVALUADO') {
        throw Object.assign(new Error('Este reporte ya fue evaluado previamente.'), { statusCode: 409 })
      }
      if (report.status !== 'CERRADO') {
        throw Object.assign(new Error('Solo se pueden evaluar reportes cerrados.'), { statusCode: 400 })
      }

      const { rows } = await client.query(
        `INSERT INTO public.ratings (report_id, citizen_id, score, comment)
         VALUES ($1,$2,$3,$4)
         RETURNING *`,
        [report.id, req.user?.id || null, score, comment]
      )
      return rows[0]
    }, { notes: 'Reporte calificado por ciudadano en encuesta CSAT' })

    broadcastEvent('report:updated', { id: rating.report_id, status: 'EVALUADO' })
    res.status(201).json(rating)
  } catch (err) {
    const code = err.statusCode || (err.code === '23505' ? 409 : 500)
    console.error('POST /api/ratings error:', err)
    res.status(code).json({ error: err.message || 'Error al registrar encuesta.' })
  }
})

// ─────────────────────────────────────────────
// OPERARIOS Y CUADRILLAS
// ─────────────────────────────────────────────
app.get('/api/crews', requireAuth, requireRoles('admin', 'supervisor', 'operator'), async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.zone_id, c.specialty, c.is_available, c.workload, c.lat, c.lng, z.name AS zone_name
       FROM public.crews c
       LEFT JOIN public.zones z ON z.id = c.zone_id
       ORDER BY c.name ASC`
    )
    res.json(rows)
  } catch (err) {
    console.error('GET /api/crews error:', err)
    res.status(500).json({ error: 'Error al consultar cuadrillas.' })
  }
})

app.get('/api/operators', requireAuth, requireRoles('admin', 'supervisor'), async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, email, full_name, phone, role, zone_id, crew_id
       FROM public.users
       WHERE role IN ('operator', 'supervisor')
       ORDER BY full_name ASC, email ASC`
    )
    res.json(rows)
  } catch (err) {
    console.error('GET /api/operators error:', err)
    res.status(500).json({ error: 'Error al consultar operarios.' })
  }
})

app.patch('/api/operators/:id', requireAuth, requireRoles('admin'), async (req, res) => {
  try {
    const userId = req.params.id
    const zoneId = req.body?.zone_id === null || req.body?.zone_id === '' ? null : Number(req.body?.zone_id)
    const crewId =
      req.body?.crew_id === undefined
        ? undefined
        : req.body?.crew_id === null || req.body?.crew_id === ''
          ? null
          : Number(req.body?.crew_id)

    const { rows } = await pool.query(
      `UPDATE public.users
       SET zone_id = $1,
           crew_id = CASE WHEN $2::boolean THEN $3 ELSE crew_id END,
           updated_at = NOW()
       WHERE id = $4 AND role IN ('operator', 'supervisor')
       RETURNING id, email, full_name, role, zone_id, crew_id`,
      [Number.isFinite(zoneId) ? zoneId : null, crewId !== undefined, Number.isFinite(crewId) ? crewId : null, userId]
    )

    if (!rows[0]) return res.status(404).json({ error: 'Operario no encontrado.' })
    res.json(rows[0])
  } catch (err) {
    console.error('PATCH /api/operators/:id error:', err)
    res.status(500).json({ error: 'Error al actualizar operario.' })
  }
})

// ─────────────────────────────────────────────
// ANALÍTICA (Vistas PostgreSQL)
// ─────────────────────────────────────────────
app.get('/api/analytics/zones', requireAuth, requireRoles('admin', 'supervisor', 'operator'), async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM public.reports_by_zone')
    res.json(rows)
  } catch (err) {
    console.error('GET /api/analytics/zones error:', err)
    res.status(500).json({ error: 'Error al consultar analítica por zona.' })
  }
})

app.get('/api/analytics/sla', requireAuth, requireRoles('admin', 'supervisor'), async (_req, res) => {
  try {
    const { rows: summary } = await pool.query('SELECT * FROM public.vw_kpi_sla_compliance')
    const { rows: crews } = await pool.query('SELECT * FROM public.crew_efficiency ORDER BY crew_name ASC')
    res.json({ sla: summary[0] || null, crews })
  } catch (err) {
    console.error('GET /api/analytics/sla error:', err)
    res.status(500).json({ error: 'Error al consultar analítica SLA.' })
  }
})

// Manejo centralizado de errores (ej. multer)
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err)
  res.status(400).json({ error: err.message || 'Solicitud inválida.' })
})

async function start() {
  try {
    await pool.query('SELECT 1')
    await seedDatabase()
    app.listen(PORT, '127.0.0.1', () => {
      console.log(`ESSMAR SIGVI API escuchando en http://127.0.0.1:${PORT}`)
    })
  } catch (err) {
    console.error('No se pudo inicializar el servidor:', err)
    process.exit(1)
  }
}

start()
