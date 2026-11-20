import PDFDocument from 'pdfkit'
import crypto from 'node:crypto'

const CATEGORY_LABELS = {
  fuga_agua: 'Fuga de Agua',
  fuga_alcantarillado: 'Alcantarillado',
  tuberia_rota: 'Tubería Rota',
  dano_pavimento: 'Daño Vial / Pavimento',
  dano_infraestructura: 'Infraestructura',
  otro: 'Otro'
}

const PRIORITY_LABELS = {
  CRITICA: 'CRÍTICA',
  ALTA: 'ALTA',
  MEDIA: 'MEDIA',
  BAJA: 'REGULAR'
}

function formatBogotaDate(dateInput) {
  if (!dateInput) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(dateInput))
}

function pdfToBuffer(doc) {
  return new Promise((resolve, reject) => {
    const chunks = []
    doc.on('data', (c) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}

function drawHeader(doc, title, subtitle) {
  doc.save()
  doc.rect(0, 0, doc.page.width, 88).fill('#1a1040')
  doc.rect(0, 84, doc.page.width, 4).fill('#06b6a0')

  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(18).text('ESSMAR SIGVI', 45, 22)
  doc.fillColor('#5eead4').font('Helvetica').fontSize(9.5).text(
    'Sistema de Gestión y Valoración de Incidentes — Santa Marta',
    45,
    44
  )

  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(12).text(title, 45, 62, {
    align: 'right',
    width: doc.page.width - 90
  })
  doc.restore()

  doc.y = 104
  if (subtitle) {
    doc.fillColor('#443c5c').font('Helvetica').fontSize(9.5).text(subtitle, 45, doc.y)
    doc.moveDown(0.7)
  }
}

function drawFooter(doc, refText) {
  const bottomY = doc.page.height - 46
  doc.save()
  doc.moveTo(45, bottomY - 8).lineTo(doc.page.width - 45, bottomY - 8).strokeColor('#d9d3e9').lineWidth(0.75).stroke()
  doc.fillColor('#6b7280').font('Helvetica').fontSize(8).text(
    `Documento oficial generado automáticamente por ESSMAR SIGVI | Expedido: ${formatBogotaDate(new Date())}`,
    45,
    bottomY,
    { width: doc.page.width - 90 }
  )
  if (refText) {
    doc.fillColor('#4b5563').font('Courier').fontSize(7.5).text(refText, 45, bottomY + 12, {
      width: doc.page.width - 90
    })
  }
  doc.restore()
}

function canEmbedImage(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 16) return false
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
  return isJpeg || isPng
}

/**
 * Genera el Comprobante Legal PQR en PDF A4 (sin PII sensible).
 */
export async function generatePqrReceiptPdf({ report, history = [], photoBuffer = null, evidenceBuffer = null, s3Key }) {
  const doc = new PDFDocument({ size: 'A4', margin: 45, bufferPages: true })

  drawHeader(
    doc,
    'COMPROBANTE LEGAL PQR',
    'Certificado oficial de radicación y trazabilidad de incidente ciudadano.'
  )

  // Caja destacada PQR
  const boxTop = doc.y
  doc.roundedRect(45, boxTop, doc.page.width - 90, 68, 8).fillAndStroke('#f4f2fb', '#d9d3e9')
  doc.fillColor('#6b7280').font('Helvetica-Bold').fontSize(8).text('CÓDIGO PQR PERMANENTE', 60, boxTop + 12)
  doc.fillColor('#2d1b69').font('Courier-Bold').fontSize(18).text(report.tracking_code || `#${report.id}`, 60, boxTop + 26)

  doc.fillColor('#6b7280').font('Helvetica-Bold').fontSize(8).text('ESTADO ACTUAL', 310, boxTop + 12)
  doc.fillColor('#0d9488').font('Helvetica-Bold').fontSize(13).text(report.status || 'REPORTADO', 310, boxTop + 26)

  doc.fillColor('#6b7280').font('Helvetica-Bold').fontSize(8).text('PRIORIDAD', 455, boxTop + 12)
  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(11).text(
    PRIORITY_LABELS[report.priority] || report.priority || 'MEDIA',
    455,
    boxTop + 27
  )

  doc.y = boxTop + 82

  // Sección Detalles del Incidente
  doc.fillColor('#1a1040').font('Helvetica-Bold').fontSize(11.5).text('1. Información del Incidente', 45, doc.y)
  doc.moveDown(0.4)

  const rows = [
    ['Categoría', CATEGORY_LABELS[report.category] || report.category],
    ['Dirección / Ubicación', report.address || 'No registrada'],
    ['Zona / Sector', [report.zone_name, report.sector].filter(Boolean).join(' — ') || 'No especificada'],
    ['Fecha de Radicación', formatBogotaDate(report.created_at)],
    ['Cuadrilla Asignada', report.work_order || 'Pendiente de asignación'],
    ['Fecha de Resolución', report.resolved_at ? formatBogotaDate(report.resolved_at) : 'En proceso']
  ]

  for (const [label, value] of rows) {
    const y = doc.y
    doc.fillColor('#4b5563').font('Helvetica-Bold').fontSize(9.5).text(`${label}:`, 50, y, { width: 150 })
    doc.fillColor('#111827').font('Helvetica').fontSize(9.5).text(String(value), 205, y, { width: 340 })
    doc.moveDown(0.35)
  }

  // Notificación legal si resuelto/cerrado/evaluado
  if (['RESUELTO', 'CERRADO', 'EVALUADO'].includes(report.status)) {
    doc.moveDown(0.4)
    const noticeY = doc.y
    doc.roundedRect(45, noticeY, doc.page.width - 90, 42, 6).fillAndStroke('#ecfdf5', '#10b981')
    doc.fillColor('#065f46').font('Helvetica-Bold').fontSize(9.5).text('CERTIFICACIÓN DE RESOLUCIÓN', 58, noticeY + 8)
    doc.fillColor('#064e3b').font('Helvetica').fontSize(8.8).text(
      `Este reporte consta como ${report.status} en el sistema institucional con fecha ${formatBogotaDate(report.resolved_at || report.closed_at || report.updated_at)}.`,
      58,
      noticeY + 21,
      { width: doc.page.width - 116 }
    )
    doc.y = noticeY + 54
  } else {
    doc.moveDown(0.5)
  }

  // Sección Historial de Actividad
  doc.fillColor('#1a1040').font('Helvetica-Bold').fontSize(11.5).text('2. Historial de Trazabilidad', 45, doc.y)
  doc.moveDown(0.4)

  const timeline = [
    ...history.map((h) => ({
      status: h.new_status,
      date: formatBogotaDate(h.created_at),
      notes: h.notes || (h.previous_status ? `Transición desde ${h.previous_status}` : 'Cambio de estado')
    })),
    {
      status: 'REPORTADO',
      date: formatBogotaDate(report.created_at),
      notes: 'Radicación inicial del incidente ciudadano'
    }
  ]

  // Encabezado de tabla
  const tableHeaderY = doc.y
  doc.rect(45, tableHeaderY, doc.page.width - 90, 20).fill('#ece8f6')
  doc.fillColor('#2d1b69').font('Helvetica-Bold').fontSize(8.5)
  doc.text('ESTADO', 52, tableHeaderY + 6, { width: 125 })
  doc.text('FECHA', 180, tableHeaderY + 6, { width: 120 })
  doc.text('OBSERVACIONES', 305, tableHeaderY + 6, { width: 240 })
  doc.y = tableHeaderY + 24

  for (const item of timeline) {
    if (doc.y > doc.page.height - 120) {
      doc.addPage()
      doc.y = 50
    }
    const rowY = doc.y
    doc.fillColor('#111827').font('Helvetica-Bold').fontSize(8.5).text(item.status, 52, rowY, { width: 125 })
    doc.fillColor('#4b5563').font('Helvetica').fontSize(8.5).text(item.date, 180, rowY, { width: 120 })
    doc.fillColor('#374151').font('Helvetica').fontSize(8.5).text(item.notes, 305, rowY, { width: 240 })
    doc.moveDown(0.4)
    doc.moveTo(45, doc.y).lineTo(doc.page.width - 45, doc.y).strokeColor('#ece8f6').lineWidth(0.5).stroke()
    doc.moveDown(0.3)
  }

  // Sección Evidencias Fotográficas (embebidas desde S3 si son JPEG/PNG válidos)
  const hasPhoto = canEmbedImage(photoBuffer)
  const hasEv = canEmbedImage(evidenceBuffer)
  if (hasPhoto || hasEv) {
    if (doc.y > doc.page.height - 230) {
      doc.addPage()
      doc.y = 50
    } else {
      doc.moveDown(0.6)
    }
    doc.fillColor('#1a1040').font('Helvetica-Bold').fontSize(11.5).text('3. Registro Fotográfico (S3)', 45, doc.y)
    doc.moveDown(0.5)
    const imgY = doc.y
    if (hasPhoto) {
      doc.fillColor('#4b5563').font('Helvetica-Bold').fontSize(8.5).text('Foto inicial del reporte', 50, imgY)
      try {
        doc.image(photoBuffer, 50, imgY + 14, { fit: [230, 145], align: 'left' })
      } catch {
        // Ignore corrupt/tiny image embedding failures
      }
    }
    if (hasEv) {
      const xPos = hasPhoto ? 305 : 50
      doc.fillColor('#4b5563').font('Helvetica-Bold').fontSize(8.5).text('Evidencia de resolución (Operador)', xPos, imgY)
      try {
        doc.image(evidenceBuffer, xPos, imgY + 14, { fit: [230, 145], align: 'left' })
      } catch {
        // Ignore
      }
    }
  }

  // Firma de verificación determinista sobre los metadatos del reporte
  const verificationDigest = crypto
    .createHash('sha256')
    .update(`${report.tracking_code}|${report.status}|${report.created_at}|${s3Key}`)
    .digest('hex')
    .slice(0, 24)
    .toUpperCase()

  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    drawFooter(doc, `Archivo S3: ${s3Key} | Sello verificación: ${verificationDigest} | Pág. ${i + 1}/${range.count}`)
  }

  return pdfToBuffer(doc)
}

/**
 * Genera el Informe Ejecutivo de Indicadores y Operaciones en PDF A4.
 */
export async function generateExecutiveReportPdf({
  generatedBy,
  filters,
  summary,
  byZone,
  crews,
  reports,
  s3Key
}) {
  const doc = new PDFDocument({ size: 'A4', margin: 45, bufferPages: true })

  drawHeader(
    doc,
    'INFORME EJECUTIVO DE INDICADORES',
    `Generado por: ${generatedBy || 'Sistema'} | Período: ${filters.periodo || 'todos'} | Categoría: ${filters.categoria || 'todos'} | Urgencia: ${filters.nivelRiesgo || 'todos'}`
  )

  // 1. Tarjetas KPI
  doc.fillColor('#1a1040').font('Helvetica-Bold').fontSize(11.5).text('1. Resumen Ejecutivo de KPIs', 45, doc.y)
  doc.moveDown(0.45)

  const cards = [
    { label: 'Total Reportes', value: String(summary.total), color: '#2d1b69' },
    { label: 'Pendientes', value: String(summary.pending), color: '#d97706' },
    { label: 'Resueltos', value: String(summary.resolved), color: '#059669' },
    { label: 'Críticos Activos', value: String(summary.critical), color: '#dc2626' },
    {
      label: 'Cumplimiento SLA',
      value: summary.slaPct !== null ? `${summary.slaPct}%` : 'Sin datos',
      color: '#0d9488'
    }
  ]

  const cardY = doc.y
  const cardWidth = (doc.page.width - 90 - 32) / 5
  cards.forEach((c, idx) => {
    const x = 45 + idx * (cardWidth + 8)
    doc.roundedRect(x, cardY, cardWidth, 52, 6).fillAndStroke('#f8f7fc', '#d9d3e9')
    doc.fillColor(c.color).font('Helvetica-Bold').fontSize(15).text(c.value, x + 6, cardY + 10, {
      width: cardWidth - 12,
      align: 'center'
    })
    doc.fillColor('#4b5563').font('Helvetica').fontSize(7.5).text(c.label, x + 4, cardY + 32, {
      width: cardWidth - 8,
      align: 'center'
    })
  })
  doc.y = cardY + 66

  // 2. Carga por Zona
  doc.fillColor('#1a1040').font('Helvetica-Bold').fontSize(11.5).text('2. Distribución y Carga por Zona', 45, doc.y)
  doc.moveDown(0.35)

  const zHeadY = doc.y
  doc.rect(45, zHeadY, doc.page.width - 90, 18).fill('#ece8f6')
  doc.fillColor('#2d1b69').font('Helvetica-Bold').fontSize(8)
  doc.text('ZONA', 52, zHeadY + 5, { width: 170 })
  doc.text('SLA (h)', 225, zHeadY + 5, { width: 55, align: 'right' })
  doc.text('TOTAL', 290, zHeadY + 5, { width: 65, align: 'right' })
  doc.text('ACTIVOS', 365, zHeadY + 5, { width: 70, align: 'right' })
  doc.text('PROM. HORAS', 445, zHeadY + 5, { width: 95, align: 'right' })
  doc.y = zHeadY + 22

  for (const z of byZone) {
    const ry = doc.y
    doc.fillColor('#111827').font('Helvetica').fontSize(8.5).text(z.zone_name, 52, ry, { width: 170 })
    doc.text(`${z.sla_hours}h`, 225, ry, { width: 55, align: 'right' })
    doc.text(String(z.total_reports), 290, ry, { width: 65, align: 'right' })
    doc.text(String(z.active_reports), 365, ry, { width: 70, align: 'right' })
    doc.text(z.avg_hours !== null ? `${z.avg_hours}h` : '—', 445, ry, { width: 95, align: 'right' })
    doc.moveDown(0.28)
  }

  doc.moveDown(0.6)

  // 3. Cuadrillas Operativas
  if (doc.y > doc.page.height - 200) {
    doc.addPage()
    doc.y = 50
  }
  doc.fillColor('#1a1040').font('Helvetica-Bold').fontSize(11.5).text('3. Desempeño de Cuadrillas', 45, doc.y)
  doc.moveDown(0.35)

  const cHeadY = doc.y
  doc.rect(45, cHeadY, doc.page.width - 90, 18).fill('#ece8f6')
  doc.fillColor('#2d1b69').font('Helvetica-Bold').fontSize(8)
  doc.text('CUADRILLA', 52, cHeadY + 5, { width: 225 })
  doc.text('CARGA ACTUAL', 285, cHeadY + 5, { width: 80, align: 'right' })
  doc.text('RESUELTOS', 375, cHeadY + 5, { width: 75, align: 'right' })
  doc.text('ESTADO', 460, cHeadY + 5, { width: 80, align: 'right' })
  doc.y = cHeadY + 22

  for (const c of crews) {
    if (doc.y > doc.page.height - 75) {
      doc.addPage()
      doc.y = 50
    }
    const ry = doc.y
    doc.fillColor('#111827').font('Helvetica').fontSize(8.3).text(c.crew_name, 52, ry, { width: 225 })
    doc.text(`${c.workload} / 3`, 285, ry, { width: 80, align: 'right' })
    doc.text(String(c.total_resolved || 0), 375, ry, { width: 75, align: 'right' })
    doc.fillColor(c.is_available ? '#059669' : '#dc2626').text(c.is_available ? 'Disponible' : 'Llena', 460, ry, {
      width: 80,
      align: 'right'
    })
    doc.moveDown(0.28)
  }

  // 4. Detalle de Reportes Filtrados (hasta 40 más recientes)
  doc.addPage()
  doc.y = 50
  doc.fillColor('#1a1040').font('Helvetica-Bold').fontSize(11.5).text(
    `4. Detalle de Incidentes Incluidos (${Math.min(reports.length, 40)} de ${reports.length})`,
    45,
    doc.y
  )
  doc.moveDown(0.4)

  const rHeadY = doc.y
  doc.rect(45, rHeadY, doc.page.width - 90, 18).fill('#ece8f6')
  doc.fillColor('#2d1b69').font('Helvetica-Bold').fontSize(7.8)
  doc.text('PQR', 50, rHeadY + 5, { width: 95 })
  doc.text('CATEGORÍA', 148, rHeadY + 5, { width: 92 })
  doc.text('ZONA', 242, rHeadY + 5, { width: 90 })
  doc.text('PRIORIDAD', 335, rHeadY + 5, { width: 60 })
  doc.text('ESTADO', 398, rHeadY + 5, { width: 72 })
  doc.text('FECHA', 472, rHeadY + 5, { width: 75 })
  doc.y = rHeadY + 22

  for (const r of reports.slice(0, 40)) {
    if (doc.y > doc.page.height - 75) {
      doc.addPage()
      doc.y = 50
    }
    const ry = doc.y
    doc.fillColor('#111827').font('Courier').fontSize(7.5).text(r.tracking_code || `#${r.id}`, 50, ry, { width: 95 })
    doc.font('Helvetica').fontSize(7.8).text(CATEGORY_LABELS[r.category] || r.category, 148, ry, { width: 92 })
    doc.text(r.zone_name || '—', 242, ry, { width: 90 })
    doc.text(PRIORITY_LABELS[r.priority] || r.priority, 335, ry, { width: 60 })
    doc.text(r.status, 398, ry, { width: 72 })
    doc.fillColor('#4b5563').text(formatBogotaDate(r.created_at), 472, ry, { width: 75 })
    doc.moveDown(0.35)
    doc.moveTo(45, doc.y).lineTo(doc.page.width - 45, doc.y).strokeColor('#f1f5f9').lineWidth(0.5).stroke()
    doc.moveDown(0.2)
  }

  const range = doc.bufferedPageRange()
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i)
    drawFooter(doc, `Archivo S3: ${s3Key} | Pág. ${i + 1}/${range.count}`)
  }

  return pdfToBuffer(doc)
}
