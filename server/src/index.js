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
import {
  S3_BUCKET,
  checkS3Health,
  ensureBucketExists,
  getObjectBufferFromS3,
  getObjectFromS3,
  getPresignedDownloadUrl,
  isValidImageBuffer,
  uploadBufferToS3
} from './storage.js'
import { generateExecutiveReportPdf, generatePqrReceiptPdf } from './pdf.js'
import { checkSmtpHealth, getMailProviderInfo, sendReportNotification, sendTestEmail } from './mailer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })

const PORT = Number(process.env.API_PORT || 3001)
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173'
const LEGACY_UPLOADS_DIR = path.resolve(__dirname, '../uploads')

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9._-]+$/

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

function createRateLimiter({ windowMs, max, keyFn }) {
  const hits = new Map()
  setInterval(() => {
    const now = Date.now()
    for (const [k, entry] of hits.entries()) {
      if (now > entry.resetAt) hits.delete(k)
    }
  }, Math.min(windowMs, 60000)).unref()

  return (req, res, next) => {
    const key = keyFn(req)
    const now = Date.now()
    let entry = hits.get(key)
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs }
      hits.set(key, entry)
    }
    entry.count++
    if (entry.count > max) {
      const retrySec = Math.max(1, Math.ceil((entry.resetAt - now) / 1000))
      res.setHeader('Retry-After', String(retrySec))
      return res.status(429).json({
        error: 'Demasiados intentos. Por favor espera unos minutos antes de intentar de nuevo.'
      })
    }
    next()
  }
}

const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyFn: (req) => `login:${req.ip}:${String(req.body?.email || '').toLowerCase()}`
})

const reportRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyFn: (req) => `report:${req.ip}`
})

function parseCoordinate(raw, min, max, label) {
  if (raw === undefined || raw === null || raw === '') return null
  const num = Number(raw)
  if (!Number.isFinite(num) || num < min || num > max) {
    throw Object.assign(new Error(`Coordenada ${label} fuera de rango (${min} a ${max}).`), { statusCode: 400 })
  }
  return num
}

function createMemoryUploader() {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (!ALLOWED_MIME.has(file.mimetype)) {
        return cb(new Error('Solo se permiten imágenes JPG, PNG o WEBP (máx. 5 MB).'))
      }
      cb(null, true)
    }
  })
}

const uploadImage = createMemoryUploader()

async function uploadValidatedImageToS3(file, folder) {
  if (!file) return null
  if (!isValidImageBuffer(file.buffer)) {
    throw Object.assign(new Error('El archivo subido no es una imagen JPG, PNG o WEBP válida.'), { statusCode: 400 })
  }
  const ext = file.mimetype === 'image/png' ? 'png' : file.mimetype === 'image/webp' ? 'webp' : 'jpg'
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`
  const key = `${folder}/${filename}`
  await uploadBufferToS3({
    key,
    body: file.buffer,
    contentType: file.mimetype,
    metadata: { folder }
  })
  return `/api/files/${folder}/${filename}`
}

function extractS3KeyFromAssetPath(assetPath) {
  if (!assetPath) return null
  if (assetPath.startsWith('/api/files/')) {
    return assetPath.slice('/api/files/'.length)
  }
  if (assetPath.startsWith('/uploads/')) {
    return assetPath.slice('/uploads/'.length)
  }
  return null
}

async function readAssetBuffer(assetPath) {
  const key = extractS3KeyFromAssetPath(assetPath)
  if (!key) return null
  const s3Buf = await getObjectBufferFromS3(key)
  if (s3Buf) return s3Buf
  // Fallback legacy local disk (solo para archivos previos a la migración S3)
  const localPath = path.join(LEGACY_UPLOADS_DIR, key)
  if (localPath.startsWith(LEGACY_UPLOADS_DIR) && fs.existsSync(localPath)) {
    return fs.readFileSync(localPath)
  }
  return null
}

function escapeCsvCell(value) {
  const raw = value === null || value === undefined ? '' : String(value)
  // Prevenir CSV / Excel Formula Injection
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
  return `"${safe.replace(/"/g, '""')}"`
}

function buildFilteredReportsQuery({ periodo, categoria, zona, nivelRiesgo }) {
  const clauses = []
  const params = []

  if (periodo === 'hoy') {
    clauses.push(`r.created_at >= date_trunc('day', NOW() AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota'`)
  } else if (periodo === '7dias') {
    clauses.push(`r.created_at >= NOW() - INTERVAL '7 days'`)
  } else if (periodo === '30dias') {
    clauses.push(`r.created_at >= NOW() - INTERVAL '30 days'`)
  }

  if (categoria && categoria !== 'todos' && ALLOWED_CATEGORIES.has(categoria)) {
    params.push(categoria)
    clauses.push(`r.category = $${params.length}`)
  }

  if (zona && zona !== 'todas' && !Number.isNaN(Number(zona))) {
    params.push(Number(zona))
    clauses.push(`r.zone_id = $${params.length}`)
  }

  if (nivelRiesgo && nivelRiesgo !== 'todos' && ALLOWED_PRIORITIES.has(String(nivelRiesgo).toUpperCase())) {
    params.push(String(nivelRiesgo).toUpperCase())
    clauses.push(`r.priority = $${params.length}`)
  }

  const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : ''
  return {
    sql: `SELECT r.*, z.name AS zone_name, z.sla_hours
          FROM public.reports r
          LEFT JOIN public.zones z ON z.id = r.zone_id
          ${where}
          ORDER BY r.created_at DESC`,
    params
  }
}

async function createAndArchivePqrPdf(report, actorId = null) {
  const { rows: history } = await pool.query(
    `SELECT previous_status, new_status, notes, created_at
     FROM public.report_history
     WHERE report_id = $1
     ORDER BY created_at DESC`,
    [report.id]
  )

  const [photoBuffer, evidenceBuffer] = await Promise.all([
    readAssetBuffer(report.photo_path),
    readAssetBuffer(report.evidence_path)
  ])

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const fileName = `Comprobante-${report.tracking_code}.pdf`
  const s3Key = `pdfs/pqr/${report.tracking_code}-${timestamp}.pdf`

  const pdfBuffer = await generatePqrReceiptPdf({
    report,
    history,
    photoBuffer,
    evidenceBuffer,
    s3Key
  })

  const uploaded = await uploadBufferToS3({
    key: s3Key,
    body: pdfBuffer,
    contentType: 'application/pdf',
    metadata: {
      doc_type: 'COMPROBANTE_PQR',
      tracking_code: report.tracking_code
    }
  })

  const { rows: docRows } = await pool.query(
    `INSERT INTO public.documents (
      report_id, doc_type, s3_bucket, s3_key, file_name, mime_type, size_bytes, sha256_hash, generated_by
    ) VALUES ($1, 'COMPROBANTE_PQR', $2, $3, $4, 'application/pdf', $5, $6, $7)
    RETURNING *`,
    [report.id, uploaded.bucket, uploaded.key, fileName, uploaded.size, uploaded.sha256, actorId]
  )

  return { pdfBuffer, uploaded, savedDoc: docRows[0], fileName }
}

function dispatchEmailAsync(reportId, eventType, { notes = null, actorId = null } = {}) {
  setImmediate(async () => {
    try {
      const { rows } = await pool.query(
        `SELECT r.*, z.name AS zone_name
         FROM public.reports r
         LEFT JOIN public.zones z ON z.id = r.zone_id
         WHERE r.id = $1`,
        [reportId]
      )
      const report = rows[0]
      if (!report || !report.reporter_email) return

      let pdfAttachment = null
      if (report.status === 'CERRADO') {
        const archived = await createAndArchivePqrPdf(report, actorId)
        pdfAttachment = {
          buffer: archived.pdfBuffer,
          fileName: archived.fileName,
          sha256: archived.uploaded.sha256
        }
      }

      await sendReportNotification({ report, eventType, notes, pdfAttachment })
    } catch (err) {
      console.error(`Error en notificación async (${eventType}) para reporte #${reportId}:`, err.message)
    }
  })
}

const app = express()
app.disable('x-powered-by')

// Cabeceras de seguridad
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(self)')
  res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' data: blob:; frame-ancestors 'none'")
  next()
})

app.use(
  cors({
    origin: CORS_ORIGIN.split(',').map((s) => s.trim()),
    credentials: true,
    exposedHeaders: ['Content-Disposition', 'X-Document-SHA256', 'X-S3-Key', 'X-Document-Id']
  })
)
app.use(express.json({ limit: '2mb' }))
if (fs.existsSync(LEGACY_UPLOADS_DIR)) {
  app.use('/uploads', express.static(LEGACY_UPLOADS_DIR, { maxAge: '1d' }))
}

// ─────────────────────────────────────────────
// HEALTHCHECK (Postgres + MinIO S3 + SMTP)
// ─────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    const [, , smtp] = await Promise.all([
      pool.query('SELECT 1'),
      checkS3Health(),
      checkSmtpHealth().catch(() => null)
    ])
    res.json({
      status: 'ok',
      database: 'postgresql',
      storage: 's3-minio',
      bucket: S3_BUCKET,
      mail: smtp ? smtp.label : `unavailable (${getMailProviderInfo().provider})`,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    res.status(503).json({ status: 'error', error: err.message })
  }
})

// ─────────────────────────────────────────────
// PROXY SEGURO DE ARCHIVOS DESDE MINIO S3
// ─────────────────────────────────────────────
app.get('/api/files/:folder/:filename', async (req, res) => {
  try {
    const { folder, filename } = req.params
    if (!['reports', 'evidences'].includes(folder) || !SAFE_FILENAME_REGEX.test(filename)) {
      return res.status(400).json({ error: 'Ruta de archivo inválida.' })
    }
    const key = `${folder}/${filename}`
    const obj = await getObjectFromS3(key)
    res.setHeader('Content-Type', obj.contentType)
    if (obj.contentLength) res.setHeader('Content-Length', String(obj.contentLength))
    res.setHeader('Cache-Control', 'public, max-age=86400')
    obj.body.pipe(res)
  } catch (err) {
    const code = err?.$metadata?.httpStatusCode === 404 || err?.name === 'NoSuchKey' ? 404 : 500
    res.status(code).json({ error: code === 404 ? 'Archivo no encontrado en S3.' : 'Error leyendo objeto S3.' })
  }
})

// ─────────────────────────────────────────────
// AUTENTICACIÓN (JWT + SCRYPT)
// ─────────────────────────────────────────────
app.post('/api/auth/login', loginRateLimiter, async (req, res) => {
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
// ZONAS (Público: catálogo geográfico)
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

app.post('/api/reports', reportRateLimiter, optionalAuth, uploadImage.single('photo'), async (req, res) => {
  try {
    const body = req.body || {}
    const category = ALLOWED_CATEGORIES.has(body.category) ? body.category : 'otro'
    const priority = ALLOWED_PRIORITIES.has(body.priority) ? body.priority : 'BAJA'
    const source = ALLOWED_SOURCES.has(body.source) ? body.source : 'WEB'
    const address = String(body.address || '').trim() || 'Ubicación seleccionada en mapa'
    const zoneId = body.zone_id ? Number(body.zone_id) : null
    const lat = parseCoordinate(body.lat, -90, 90, 'lat')
    const lng = parseCoordinate(body.lng, -180, 180, 'lng')

    if (!zoneId || Number.isNaN(zoneId)) {
      return res.status(400).json({ error: 'Debe seleccionar una zona válida.' })
    }

    const photoPath = await uploadValidatedImageToS3(req.file, 'reports')

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
            lat,
            lng,
            photoPath,
            source
          ]
        )

        const report = rows[0]
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
    dispatchEmailAsync(created.id, 'REPORT_CREATED', { actorId: req.user?.id || null })

    res.status(201).json({
      id: created.id,
      tracking_code: created.tracking_code,
      status: created.status,
      work_order: created.work_order,
      photo_path: created.photo_path
    })
  } catch (err) {
    const code = err.statusCode || 500
    console.error('POST /api/reports error:', err)
    res.status(code).json({ error: err.message || 'Error al registrar reporte.' })
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

// Generar y archivar en MinIO S3 el Comprobante Legal PQR en PDF
app.get('/api/reports/track/:code/pdf', optionalAuth, async (req, res) => {
  try {
    const code = String(req.params.code || '').trim().toUpperCase()
    if (!code) return res.status(400).json({ error: 'Código PQR requerido.' })

    const { rows } = await pool.query(
      `SELECT
         r.id, r.tracking_code, r.status, r.address, r.sector, r.category,
         r.priority, r.created_at, r.resolved_at, r.closed_at, r.updated_at,
         r.photo_path, r.evidence_path, r.work_order, r.zone_id,
         z.name AS zone_name
       FROM public.reports r
       LEFT JOIN public.zones z ON z.id = r.zone_id
       WHERE UPPER(r.tracking_code) = $1`,
      [code]
    )

    const report = rows[0]
    if (!report) {
      return res.status(404).json({ error: 'Reporte no encontrado.' })
    }

    const { pdfBuffer, uploaded, savedDoc, fileName } = await createAndArchivePqrPdf(report, req.user?.id || null)

    if (req.query.format === 'json') {
      const presignedUrl = await getPresignedDownloadUrl(savedDoc.s3_key, { fileName })
      return res.json({
        document: savedDoc,
        download_url: `/api/documents/${savedDoc.id}/download?code=${encodeURIComponent(report.tracking_code)}`,
        presigned_url: presignedUrl
      })
    }

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.setHeader('Content-Length', String(pdfBuffer.length))
    res.setHeader('X-Document-SHA256', uploaded.sha256)
    res.setHeader('X-S3-Key', uploaded.key)
    res.setHeader('X-Document-Id', String(savedDoc.id))
    res.send(pdfBuffer)
  } catch (err) {
    console.error('GET /api/reports/track/:code/pdf error:', err)
    res.status(500).json({ error: 'Error al generar el comprobante PDF.' })
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

// Actualizar reporte (RBAC estricto)
app.patch(
  '/api/reports/:id',
  requireAuth,
  requireRoles('admin', 'supervisor', 'operator'),
  uploadImage.single('evidence'),
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

      if (newStatus === 'CERRADO' && !['admin', 'supervisor'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Solo supervisores o administradores pueden cerrar un reporte.' })
      }

      if (body.assigned_operator_id && !UUID_REGEX.test(String(body.assigned_operator_id))) {
        return res.status(400).json({ error: 'ID de operador asignado inválido.' })
      }

      const evidencePath = await uploadValidatedImageToS3(req.file, 'evidences')

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
      if (newStatus) {
        dispatchEmailAsync(updated.id, `STATUS_${updated.status}`, {
          notes: body.notes || null,
          actorId: req.user.id
        })
      }

      res.json(updated)
    } catch (err) {
      const code = err.statusCode || 500
      console.error('PATCH /api/reports/:id error:', err)
      res.status(code).json({ error: err.message || 'Error al actualizar reporte.' })
    }
  }
)

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
      dispatchEmailAsync(reportId, 'STATUS_ASIGNADO', { actorId: req.user.id })
    }

    res.json({ crew_id: crewId })
  } catch (err) {
    console.error('POST /api/reports/:id/assign-auto error:', err)
    res.status(500).json({ error: 'Error al asignar cuadrilla automáticamente.' })
  }
})

// ─────────────────────────────────────────────
// EVIDENCIAS DE CAMPO (S3 / MINIO)
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
  uploadImage.single('photo'),
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

      const lat = parseCoordinate(body.lat, -90, 90, 'lat')
      const lng = parseCoordinate(body.lng, -180, 180, 'lng')
      const hoursSpent = body.hours_spent !== undefined && body.hours_spent !== '' ? Number(body.hours_spent) : 0

      const evidenceUrl = await uploadValidatedImageToS3(req.file, 'evidences')

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
              lat,
              lng,
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
      dispatchEmailAsync(reportId, `STATUS_${result.nextStatus}`, {
        notes: description,
        actorId: req.user.id
      })
      res.status(201).json(result)
    } catch (err) {
      const code = err.statusCode || 500
      console.error('POST evidences error:', err)
      res.status(code).json({ error: err.message || 'Error al registrar evidencia.' })
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
    dispatchEmailAsync(reportId, `STATUS_${nextStatus}`, {
      notes: comments,
      actorId: req.user.id
    })
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

    const rating = await withTransaction(
      async (client) => {
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
      },
      { notes: 'Reporte calificado por ciudadano en encuesta CSAT' }
    )

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
    const userId = String(req.params.id || '')
    if (!UUID_REGEX.test(userId)) {
      return res.status(400).json({ error: 'ID de operario inválido.' })
    }
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
// ANALÍTICA Y EXPORTACIÓN DE REPORTES (PDF EN S3 + CSV)
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

// Exportar Informe Ejecutivo PDF y archivarlo en MinIO S3
app.post('/api/analytics/export/pdf', requireAuth, requireRoles('admin', 'supervisor'), async (req, res) => {
  try {
    const filters = {
      periodo: req.body?.periodo || 'todos',
      categoria: req.body?.categoria || 'todos',
      zona: req.body?.zona ?? 'todas',
      nivelRiesgo: req.body?.nivelRiesgo || 'todos'
    }

    const query = buildFilteredReportsQuery(filters)
    const [reportsRes, zonesRes, crewsRes, slaRes] = await Promise.all([
      pool.query(query.sql, query.params),
      pool.query('SELECT * FROM public.reports_by_zone'),
      pool.query('SELECT * FROM public.crew_efficiency ORDER BY crew_name ASC'),
      pool.query('SELECT * FROM public.vw_kpi_sla_compliance')
    ])

    const reports = reportsRes.rows
    const pendingStatuses = new Set([
      'REPORTADO',
      'CLASIFICADO',
      'ASIGNADO',
      'EN_PROGRESO',
      'EVIDENCIA_PENDIENTE',
      'VERIFICACION_SUPERVISOR'
    ])
    const resolvedStatuses = new Set(['RESUELTO', 'CERRADO', 'EVALUADO'])

    const summary = {
      total: reports.length,
      pending: reports.filter((r) => pendingStatuses.has(r.status)).length,
      resolved: reports.filter((r) => resolvedStatuses.has(r.status)).length,
      critical: reports.filter((r) => pendingStatuses.has(r.status) && r.priority === 'CRITICA').length,
      slaPct: slaRes.rows[0]?.compliance_percentage ?? null
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `Informe-Ejecutivo-ESSMAR-${timestamp.slice(0, 10)}.pdf`
    const s3Key = `pdfs/executive/informe-ejecutivo-${timestamp}.pdf`

    const pdfBuffer = await generateExecutiveReportPdf({
      generatedBy: req.user.full_name || req.user.email,
      filters,
      summary,
      byZone: zonesRes.rows,
      crews: crewsRes.rows,
      reports,
      s3Key
    })

    const uploaded = await uploadBufferToS3({
      key: s3Key,
      body: pdfBuffer,
      contentType: 'application/pdf',
      metadata: {
        doc_type: 'REPORTE_EJECUTIVO',
        generated_by: req.user.email
      }
    })

    const { rows: docRows } = await pool.query(
      `INSERT INTO public.documents (
        report_id, doc_type, s3_bucket, s3_key, file_name, mime_type, size_bytes, sha256_hash, generated_by
      ) VALUES (NULL, 'REPORTE_EJECUTIVO', $1, $2, $3, 'application/pdf', $4, $5, $6)
      RETURNING *`,
      [uploaded.bucket, uploaded.key, fileName, uploaded.size, uploaded.sha256, req.user.id]
    )

    const savedDoc = docRows[0]

    if (req.query.download === '1') {
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
      res.setHeader('Content-Length', String(pdfBuffer.length))
      res.setHeader('X-Document-SHA256', uploaded.sha256)
      res.setHeader('X-S3-Key', uploaded.key)
      res.setHeader('X-Document-Id', String(savedDoc.id))
      return res.send(pdfBuffer)
    }

    const presignedUrl = await getPresignedDownloadUrl(savedDoc.s3_key, { fileName })
    res.status(201).json({
      document: savedDoc,
      download_url: `/api/documents/${savedDoc.id}/download`,
      presigned_url: presignedUrl
    })
  } catch (err) {
    console.error('POST /api/analytics/export/pdf error:', err)
    res.status(500).json({ error: 'Error al generar el informe ejecutivo PDF.' })
  }
})

// Exportar reportes filtrados a CSV (UTF-8 BOM compatible con Excel)
app.get('/api/analytics/export/csv', requireAuth, requireRoles('admin', 'supervisor'), async (req, res) => {
  try {
    const query = buildFilteredReportsQuery({
      periodo: req.query.periodo || 'todos',
      categoria: req.query.categoria || 'todos',
      zona: req.query.zona || 'todas',
      nivelRiesgo: req.query.nivelRiesgo || 'todos'
    })
    const { rows } = await pool.query(query.sql, query.params)

    const headers = [
      'PQR',
      'Fecha',
      'Categoria',
      'Prioridad',
      'Estado',
      'Zona',
      'Direccion',
      'Cuadrilla',
      'Canal',
      'Reincidente',
      'Horas_Atencion'
    ]
    const lines = [
      headers.join(','),
      ...rows.map((r) =>
        [
          r.tracking_code,
          r.created_at,
          r.category,
          r.priority,
          r.status,
          r.zone_name || '',
          r.address,
          r.work_order || '',
          r.source,
          r.is_recurrent ? 'SI' : 'NO',
          r.attention_hours ?? ''
        ]
          .map(escapeCsvCell)
          .join(',')
      )
    ]

    const csvContent = '\uFEFF' + lines.join('\r\n')
    const fileName = `Reportes-ESSMAR-${new Date().toISOString().slice(0, 10)}.csv`
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.send(csvContent)
  } catch (err) {
    console.error('GET /api/analytics/export/csv error:', err)
    res.status(500).json({ error: 'Error al exportar CSV.' })
  }
})

// ─────────────────────────────────────────────
// REPOSITORIO DE DOCUMENTOS PDF ARCHIVADOS EN S3
// ─────────────────────────────────────────────
app.get('/api/documents', requireAuth, requireRoles('admin', 'supervisor'), async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT d.*, r.tracking_code, u.full_name AS generator_name, u.email AS generator_email
       FROM public.documents d
       LEFT JOIN public.reports r ON r.id = d.report_id
       LEFT JOIN public.users u ON u.id = d.generated_by
       ORDER BY d.created_at DESC
       LIMIT 50`
    )
    res.json(rows)
  } catch (err) {
    console.error('GET /api/documents error:', err)
    res.status(500).json({ error: 'Error al consultar documentos S3.' })
  }
})

app.get('/api/documents/:id/download', optionalAuth, async (req, res) => {
  try {
    const docId = Number(req.params.id)
    if (!Number.isInteger(docId) || docId <= 0) {
      return res.status(400).json({ error: 'ID de documento inválido.' })
    }

    const { rows } = await pool.query(
      `SELECT d.*, r.tracking_code
       FROM public.documents d
       LEFT JOIN public.reports r ON r.id = d.report_id
       WHERE d.id = $1`,
      [docId]
    )
    const doc = rows[0]
    if (!doc) return res.status(404).json({ error: 'Documento no encontrado.' })

    const isStaff = req.user && ['admin', 'supervisor'].includes(req.user.role)
    const codeParam = String(req.query.code || '').trim().toUpperCase()
    const isValidCitizenPqr = doc.doc_type === 'COMPROBANTE_PQR' && codeParam && codeParam === doc.tracking_code

    if (!isStaff && !isValidCitizenPqr) {
      return res.status(403).json({ error: 'No autorizado para descargar este documento.' })
    }

    const obj = await getObjectFromS3(doc.s3_key)
    res.setHeader('Content-Type', doc.mime_type || 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${doc.file_name.replace(/"/g, '')}"`)
    res.setHeader('X-Document-SHA256', doc.sha256_hash)
    res.setHeader('X-S3-Key', doc.s3_key)
    if (obj.contentLength) res.setHeader('Content-Length', String(obj.contentLength))
    obj.body.pipe(res)
  } catch (err) {
    console.error('GET /api/documents/:id/download error:', err)
    res.status(500).json({ error: 'Error al descargar documento desde S3.' })
  }
})

// ─────────────────────────────────────────────
// BITÁCORA DE NOTIFICACIONES (CORREO SMTP)
// ─────────────────────────────────────────────
app.get('/api/notifications', requireAuth, requireRoles('admin', 'supervisor'), async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT n.*, r.tracking_code
       FROM public.notification_logs n
       LEFT JOIN public.reports r ON r.id = n.report_id
       ORDER BY n.created_at DESC
       LIMIT 50`
    )
    res.json(rows)
  } catch (err) {
    console.error('GET /api/notifications error:', err)
    res.status(500).json({ error: 'Error al consultar bitácora de correos.' })
  }
})

app.post('/api/notifications/test', requireAuth, requireRoles('admin'), async (req, res) => {
  try {
    const to = String(req.body?.to || req.user.email || '').trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return res.status(400).json({ error: 'Correo de destino inválido.' })
    }
    const result = await sendTestEmail(to, req.user.email)
    res.json(result)
  } catch (err) {
    console.error('POST /api/notifications/test error:', err)
    res.status(502).json({ error: `Fallo enviando correo de prueba: ${err.message}` })
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
    await ensureBucketExists()
    await seedDatabase()
    app.listen(PORT, '127.0.0.1', () => {
      console.log(`ESSMAR SIGVI API escuchando en http://127.0.0.1:${PORT} (S3 bucket: ${S3_BUCKET})`)
    })
  } catch (err) {
    console.error('No se pudo inicializar el servidor:', err)
    process.exit(1)
  }
}

start()
