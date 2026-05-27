import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import nodemailer from "npm:nodemailer@6.9.8";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_PASS = Deno.env.get("GMAIL_PASS");

serve(async (req) => {
  try {
    const payload = await req.json();

    if (payload.type !== "UPDATE") {
      return new Response("Ignorado: No es una actualización", { status: 200 });
    }

    const newRecord = payload.record;
    const oldRecord = payload.old_record;

    if (!newRecord.reporter_email) {
      return new Response("Ignorado: El reporte no tiene email asociado", { status: 200 });
    }

    if (newRecord.status === oldRecord.status) {
      return new Response("Ignorado: El estado no cambió", { status: 200 });
    }

    const statusMap: Record<string, string> = {
      'ASIGNADO': 'Su reporte ha sido asignado a una de nuestras cuadrillas operativas.',
      'EN_PROGRESO': 'Nuestra cuadrilla ya se encuentra trabajando en la zona de su reporte.',
      'RESUELTO': '¡Su problema ha sido marcado como RESUELTO por nuestros operarios!',
      'CERRADO': 'Su caso ha sido auditado y cerrado formalmente.',
      'RECHAZADO': 'Su reporte ha sido descartado o unificado con uno existente tras la evaluación.'
    };

    const statusMessage = statusMap[newRecord.status] || `El estado de su reporte cambió a: ${newRecord.status}`;

    // Html para mostrar la cuadrilla asignada si existe
    const crewHtml = newRecord.work_order ? `
      <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #d1d5db;">
        <p style="font-size: 14px; margin: 0 0 4px 0; color: #6b7280; text-transform: uppercase; font-weight: bold;">👷 Cuadrilla Asignada</p>
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">${newRecord.work_order}</p>
      </div>
    ` : '';

    // Html para mostrar la encuesta SOLO si el reporte está formalmente CERRADO
    const surveyHtml = newRecord.status === 'CERRADO' ? `
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0;">
        <h4 style="color: #166534; margin: 0 0 10px 0; font-size: 16px;">⭐ Evalúa nuestro servicio</h4>
        <p style="color: #15803d; font-size: 14px; margin: 0 0 16px 0;">Tu opinión nos ayuda a mejorar. Por favor califica la atención de la cuadrilla.</p>
        <a href="http://localhost:5173/encuesta/${newRecord.tracking_code}" style="display: inline-block; background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px;">Realizar Encuesta</a>
        <p style="color: #166534; font-size: 12px; margin: 12px 0 0 0; opacity: 0.8;">(Nota: Si la plataforma ya está en línea, cambia "localhost:5173" por tu dominio web real en la función)</p>
      </div>
    ` : '';

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #0d9488; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Actualización de su PQR</h2>
        </div>
        <div style="padding: 24px; color: #374151;">
          <p style="font-size: 16px;">Hola <strong>${newRecord.reporter_name || 'Ciudadano'}</strong>,</p>
          <p style="font-size: 16px;">Le notificamos que ha habido un avance en su reporte asociado a la categoría <strong>${newRecord.category.replace('_', ' ')}</strong>.</p>
          
          <div style="background-color: #f3f4f6; padding: 18px; border-left: 5px solid #0d9488; margin: 24px 0; border-radius: 4px;">
            <p style="font-size: 14px; margin: 0 0 8px 0; color: #6b7280; text-transform: uppercase; font-weight: bold;">Código de Seguimiento (PQR)</p>
            <h3 style="margin: 0 0 16px 0; font-family: monospace; font-size: 22px; color: #111827;">${newRecord.tracking_code}</h3>
            
            <p style="font-size: 14px; margin: 0 0 8px 0; color: #6b7280; text-transform: uppercase; font-weight: bold;">Nuevo Estado</p>
            <h4 style="margin: 0 0 8px 0; font-size: 18px; color: #0d9488;">${newRecord.status}</h4>
            <p style="margin: 0; font-size: 15px;">${statusMessage}</p>
            
            ${crewHtml}
          </div>

          ${surveyHtml}

          <p style="font-size: 15px; color: #4b5563;">Puede descargar su comprobante legal o hacer seguimiento continuo ingresando este código en nuestra plataforma.</p>
          
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 13px; color: #9ca3af; margin: 0;">Atentamente,<br/><strong style="color: #6b7280;">El equipo de Operaciones ESSMAR SIGVI</strong></p>
        </div>
      </div>
    `;

    // Configurar Nodemailer con Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS
      }
    });

    const mailOptions = {
      from: `"Notificaciones ESSMAR SIGVI" <${GMAIL_USER}>`,
      to: newRecord.reporter_email,
      subject: `Actualización PQR: ${newRecord.tracking_code} - ESSMAR`,
      html: emailHtml
    };

    // --- LÓGICA DE TWILIO WHATSAPP ---
    let waPromise = Promise.resolve();
    if (newRecord.reporter_phone) {
      const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
      const TWILIO_AUTH = Deno.env.get("TWILIO_AUTH_TOKEN");
      const TWILIO_FROM = "whatsapp:+14155238886"; // Tu sandbox de Twilio

      if (TWILIO_SID && TWILIO_AUTH) {
        // Formatear el teléfono (Twilio exige prefijo internacional, asumimos +57 Colombia si no lo tiene)
        let phoneStr = newRecord.reporter_phone.trim();
        if (!phoneStr.startsWith('+')) {
          phoneStr = `+57${phoneStr}`;
        }

        const waMessage = `*ESSMAR SIGVI - Actualización PQR* 💧\n\nHola *${newRecord.reporter_name || 'Ciudadano'}*, el reporte *${newRecord.tracking_code}* ha cambiado de estado.\n\n*Estado Actual:* ${newRecord.status}\n_${statusMessage}_\n${newRecord.work_order ? `\n*👷 Cuadrilla en zona:* ${newRecord.work_order}` : ''}\n\nRevisa tu correo electrónico para descargar tu comprobante legal.`;

        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;
        const twilioBody = new URLSearchParams({
          From: TWILIO_FROM,
          To: `whatsapp:${phoneStr}`,
          Body: waMessage
        });

        waPromise = fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': 'Basic ' + btoa(`${TWILIO_SID}:${TWILIO_AUTH}`)
          },
          body: twilioBody.toString()
        }).then(async res => {
          if (!res.ok) console.error('Error Twilio:', await res.text());
        });
      }
    }

    // Ejecutar el envío de Correo y WhatsApp en SEGUNDO PLANO
    const enviosPromise = Promise.all([
      transporter.sendMail(mailOptions).catch(e => console.error("SMTP error:", e)),
      waPromise.catch(e => console.error("WA error:", e))
    ]);

    // @ts-ignore
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(enviosPromise);
    } else {
      // Si no está disponible waitUntil, esperamos normal
      await enviosPromise;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error en la ejecución de la función:", error);
    return new Response("Error Interno del Servidor", { status: 500 });
  }
});
