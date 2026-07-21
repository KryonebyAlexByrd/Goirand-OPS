import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { generateReportWithFallback } from './utils/ai.js';

export default async function handler(req, res) {
  // Solo permitir GET o POST (Vercel cron usa GET por defecto)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  // Si estamos en Vercel, podemos validar la firma del cron para seguridad
  if (process.env.VERCEL_CRON_URL && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn("Llamada no autorizada al cron");
    // Descomentar para asegurar en producción:
    // return res.status(401).json({ error: 'Unauthorized' });
  }

  const periodo = req.query.periodo || req.body?.periodo || 'diario';
  console.log(`[Cron Serverless] Iniciando envío de reportes: ${periodo}`);

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );

    const { data: contactos, error: errContactos } = await supabase
      .from('automatizacionWhatsApp')
      .select('*')
      .eq('activo', true)
      .eq(`recibe_${periodo}`, true)
      .eq('canal', 'email');

    if (errContactos) throw errContactos;
    
    if (!contactos || contactos.length === 0) {
      console.log(`[Cron] No hay contactos activos para: ${periodo}`);
      return res.status(200).json({ success: true, message: 'No contacts to send to' });
    }

    const { data: registros, error: errReg } = await supabase
      .from('registro_trabajo')
      .select('*')
      .order('created_date', { ascending: false })
      .limit(100);
      
    if (errReg) throw errReg;

    // Generar reporte IA
    let reporteIA = null;
    if (registros.length > 0) {
      const totalPiezas = registros.reduce((s, r) => s + (r.cantidad || 1), 0);
      const dataPromt = registros.slice(0, 100).map(r => `- ${r.trabajador_nombre} (Área: ${r.area || 'N/A'}) - ${r.tipo_trabajo}: ${r.cantidad}pz`).join('\n');
      const prompt = `Actúa como el Gerente de Planta. Escribe un resumen ejecutivo y directo de 2-3 párrafos sobre la producción ${periodo}.
Menciona cuántas piezas se lograron (Total: ${totalPiezas}), qué áreas destacaron y qué proyectos avanzaron más, basándote en esta data:
${dataPromt}

El tono debe ser profesional, claro y motivador. No uses formato markdown agresivo, usa HTML básico (<p>, <b>, <ul>, <li>) porque se enviará por correo.`;

      try {
        reporteIA = await generateReportWithFallback(prompt);
      } catch (e) {
        console.error('Error generando reporte IA:', e);
      }
    }

    let htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 10px;">Reporte Ejecutivo de Producción (${periodo})</h2>
        <div style="background-color: #fff7ed; padding: 15px; border-radius: 8px; border: 1px solid #ffedd5; margin-bottom: 20px;">
          ${reporteIA || '<p>Resumen IA no disponible o no hay registros recientes. Revisa la plataforma.</p>'}
        </div>
        <p style="margin-top:20px; font-size:12px; color:#999; text-align: center;">Generado automáticamente por Goirand OPS Intelligence.</p>
      </div>
    `;

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
      },
    });

    let enviados = 0;
    for (const contacto of contactos) {
      try {
        await transporter.sendMail({
          from: `"Goirand OPS" <${process.env.EMAIL_USER}>`,
          to: contacto.email,
          subject: `Reporte de Producción - Goirand (${periodo})`,
          html: htmlContent,
        });
        enviados++;
      } catch (e) {
        console.error(`Error enviando a ${contacto.email}:`, e);
      }
    }

    res.status(200).json({ success: true, enviados, periodo });
  } catch (error) {
    console.error('Error en cron:', error);
    res.status(500).json({ error: error.message });
  }
}
