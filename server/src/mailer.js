import nodemailer from 'nodemailer'
import { pool } from './db.js'

const SMTP_HOST = process.env.SMTP_HOST || '127.0.0.1'
const SMTP_PORT = Number(process.env.SMTP_PORT || 1025)
const SMTP_SECURE = process.env.SMTP_SECURE === 'true'
const SMTP_USER = process.env.SMTP_USER || ''
const SMTP_PASS = process.env.SMTP_PASS || ''
const SMTP_FROM = process.env.SMTP_FROM || 'ESSMAR SIGVI <notificaciones@essmar.local>'
const PUBLIC_APP_URL = (process.env.PUBLIC_APP_URL || 'http://127.0.0.1:5173').replace(/\/$/, '')

const transportConfig = {
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE
}

if (SMTP_USER && SMTP_PASS) {
  transportConfig.auth = { user: SMTP_USER, pass: SMTP_PASS }
}

const transporter = nodemailer.createTransport(transportConfig)

const CATEGORY_LABELS = {
  fuga_agua: 'Fuga de agua',
  fuga_alcantarillado: 'Alcantarillado',
  tuberia_rota: 'Tubería rota',
  dano_pavimento: 'Daño vial',
  dano_infraestructura: 'Infraestructura',
  otro: 'Otro'
}

const STATUS_MESSAGES = {
  REPORTADO: 'Tu reporte quedó radicado en el sistema.',
  CLASIFICADO: 'Tu reporte fue revisado y clasificado.',
  ASIGNADO: 'Se asignó una cuadrilla para atender el daño.',
  EN_PROGRESO: 'La cuadrilla ya se encuentra trabajando en el sitio.',
  RESUELTO: 'La cuadrilla reportó el trabajo terminado; pasa a verificación.',
  CERRADO: 'El caso fue verificado y cerrado. Adjuntamos tu comprobante PDF.',
  RECHAZADO: 'El caso fue cerrado como duplicado o no procedente tras revisión.'
}

function escapeHtml(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function checkSmtpHealth() {
  await transporter.verify()
  return { host: SMTP_HOST, port: SMTP_PORT }
}

function buildEmailHtml({ report, title, statusLabel, message, notes, sha256, includeSurvey }) {
  const code = escapeHtml(report.tracking_code || `#${report.id}`)
  const name = escapeHtml(report.reporter_name || 'Ciudadano')
  const category = escapeHtml(CATEGORY_LABELS[report.category] || report.category)
  const address = escapeHtml(report.address || '')
  const crew = report.work_order ? escapeHtml(report.work_order) : ''
  const trackUrl = `${PUBLIC_APP_URL}/rastrear`
  const surveyUrl = `${PUBLIC_APP_URL}/encuesta/${encodeURIComponent(report.tracking_code || '')}`

  const crewBlock = crew
    ? `<p style="margin: 8px 0 0; font-size: 14px; color: #374151;"><strong>Cuadrilla:</strong> ${crew}</p>`
    : ''

  const notesBlock = notes
    ? `<p style="margin: 8px 0 0; font-size: 13.5px; color: #4b5563;"><strong>Observación:</strong> ${escapeHtml(notes)}</p>`
    : ''

  const shaBlock = sha256
    ? `<p style="margin: 12px 0 0; font-size: 12px; color: #6b7280; font-family: monospace;">Comprobante PDF adjunto | SHA-256: ${escapeHtml(sha256.slice(0, 16))}…</p>`
    : ''

  const surveyBlock = includeSurvey
    ? `<div style="margin: 22px 0; padding: 16px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; text-align: center;">
         <p style="margin: 0 0 12px; font-size: 14px; color: #065f46; font-weight: 600;">¿Cómo fue la atención recibida?</p>
         <a href="${surveyUrl}" style="display: inline-block; background: #0d9488; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 700; font-size: 14px;">Calificar servicio</a>
       </div>`
    : ''

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; background: #ffffff;">
      <div style="background: #1a1040; padding: 18px 24px; border-bottom: 4px solid #06b6a0;">
        <h2 style="margin: 0; color: #ffffff; font-size: 18px; letter-spacing: 0.02em;">ESSMAR SIGVI</h2>
        <p style="margin: 4px 0 0; color: #99f6e4; font-size: 13px;">${escapeHtml(title)}</p>
      </div>
      <div style="padding: 24px; color: #1f2937;">
        <p style="margin: 0 0 14px; font-size: 15px;">Hola <strong>${name}</strong>,</p>
        <p style="margin: 0 0 18px; font-size: 14.5px; line-height: 1.5;">${escapeHtml(message)}</p>

        <div style="background: #f4f2fb; border-left: 4px solid #2d1b69; padding: 14px 16px; border-radius: 6px; margin-bottom: 18px;">
          <p style="margin: 0; font-size: 12px; text-transform: uppercase; color: #6b7280; font-weight: 700;">Código PQR</p>
          <p style="margin: 2px 0 10px; font-family: monospace; font-size: 20px; font-weight: 800; color: #1a1040;">${code}</p>
          <p style="margin: 0; font-size: 14px; color: #374151;"><strong>Estado:</strong> ${escapeHtml(statusLabel)}</p>
          <p style="margin: 6px 0 0; font-size: 14px; color: #374151;"><strong>Tipo:</strong> ${category}</p>
          <p style="margin: 6px 0 0; font-size: 14px; color: #374151;"><strong>Dirección:</strong> ${address}</p>
          ${crewBlock}
          ${notesBlock}
          ${shaBlock}
        </div>

        ${surveyBlock}

        <p style="margin: 0; font-size: 13.5px; color: #4b5563;">
          Puedes consultar el avance en cualquier momento en <a href="${trackUrl}" style="color: #0d9488; font-weight: 600;">${trackUrl}</a>.
        </p>
      </div>
      <div style="padding: 14px 24px; background: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;">
        Correo automático de ESSMAR SIGVI — Santa Marta.
      </div>
    </div>
  `
}

async function logNotification({ reportId, eventType, recipient, subject, status, providerId = null, errorMessage = null }) {
  try {
    await pool.query(
      `INSERT INTO public.notification_logs (report_id, channel, event_type, recipient, subject, status, provider_id, error_message)
       VALUES ($1, 'EMAIL', $2, $3, $4, $5, $6, $7)`,
      [reportId || null, eventType, recipient, subject, status, providerId, errorMessage]
    )
  } catch (err) {
    console.error('Error guardando notification_logs:', err.message)
  }
}

export async function sendReportNotification({
  report,
  eventType,
  notes = null,
  pdfAttachment = null
}) {
  const recipient = (report?.reporter_email || '').trim()
  if (!recipient) return { skipped: true }

  const isClosed = report.status === 'CERRADO'
  const isCreation = eventType === 'REPORT_CREATED'
  const title = isCreation ? 'Confirmación de radicado PQR' : `Actualización de reporte — ${report.status}`
  const subject = isCreation
    ? `Radicado PQR ${report.tracking_code} — ESSMAR`
    : `PQR ${report.tracking_code}: ${report.status} — ESSMAR`

  const message = isCreation
    ? report.work_order
      ? `Recibimos tu reporte y fue asignado a ${report.work_order}.`
      : STATUS_MESSAGES.REPORTADO
    : STATUS_MESSAGES[report.status] || `El estado de tu reporte cambió a ${report.status}.`

  const html = buildEmailHtml({
    report,
    title,
    statusLabel: report.status,
    message,
    notes,
    sha256: pdfAttachment?.sha256 || null,
    includeSurvey: isClosed
  })

  const mailOptions = {
    from: SMTP_FROM,
    to: recipient,
    subject,
    html
  }

  if (pdfAttachment?.buffer && pdfAttachment?.fileName) {
    mailOptions.attachments = [
      {
        filename: pdfAttachment.fileName,
        content: pdfAttachment.buffer,
        contentType: 'application/pdf'
      }
    ]
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    await logNotification({
      reportId: report.id,
      eventType,
      recipient,
      subject,
      status: 'ENVIADO',
      providerId: info.messageId || null
    })
    return { sent: true, messageId: info.messageId }
  } catch (err) {
    console.error(`Error enviando correo (${eventType}) a ${recipient}:`, err.message)
    await logNotification({
      reportId: report.id,
      eventType,
      recipient,
      subject,
      status: 'ERROR',
      errorMessage: err.message
    })
    return { sent: false, error: err.message }
  }
}
