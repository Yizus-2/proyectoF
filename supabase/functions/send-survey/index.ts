import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  try {
    // Verificar si es un request POST válido
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    // Parsear el payload enviado por el Database Webhook de Supabase
    const payload = await req.json()
    console.log('Webhook payload recibido:', payload)

    const record = payload.record

    // Solo procesar si el estado es CERRADO y existe un correo electrónico
    if (record.status !== 'CERRADO') {
      return new Response(JSON.stringify({ message: "El reporte no está CERRADO." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    }

    if (!record.reporter_email) {
      console.log('Reporte cerrado pero no hay correo asociado:', record.tracking_code)
      return new Response(JSON.stringify({ message: "No email provided, skipping." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      })
    }

    // Asegurarse de tener la API Key de Resend configurada
    if (!RESEND_API_KEY) {
      throw new Error("Missing RESEND_API_KEY secret")
    }

    // URL dinámica (reemplaza con tu dominio en producción)
    // Usamos window.location origin si está disponible o localhost por defecto
    const baseUrl = 'http://localhost:5173' // o 'https://tudominio.com' en prod
    const surveyUrl = `${baseUrl}/encuesta/${record.tracking_code}`

    // Construir la petición a Resend
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        // Cambiar por tu dominio verificado en Resend (por defecto onboarding@resend.dev sirve para probar, pero solo a correos autorizados)
        from: 'ESSMAR <onboarding@resend.dev>',
        to: [record.reporter_email],
        subject: `Tu reporte ${record.tracking_code} ha sido resuelto`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eaeaea; border-radius: 12px; padding: 24px;">
            <h2 style="color: #2563eb; text-align: center;">ESSMAR SIGVI</h2>
            <p>Hola <strong>${record.reporter_name}</strong>,</p>
            <p>Queremos informarte que tu reporte <strong>${record.tracking_code}</strong> ha sido marcado como <strong>CERRADO</strong> por nuestro equipo de operaciones.</p>
            
            <div style="background-color: #f8fafc; padding: 16px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0;">Tu opinión es muy importante para nosotros. Por favor ayúdanos a mejorar evaluando el servicio que recibiste.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${surveyUrl}" style="background-color: #2563eb; color: white; text-decoration: none; padding: 14px 24px; border-radius: 8px; font-weight: bold; display: inline-block;">
                Calificar Servicio Ahora
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 40px;">
              Este es un correo automático, por favor no respondas a esta dirección.
            </p>
          </div>
        `
      })
    })

    if (!resendRes.ok) {
      const errorText = await resendRes.text()
      throw new Error(`Resend error: ${errorText}`)
    }

    const data = await resendRes.json()
    console.log('Correo enviado con éxito:', data)

    return new Response(JSON.stringify({ success: true, message: "Survey email sent!", data }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })
  } catch (error: any) {
    console.error('Error procesando Webhook:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    })
  }
})
