import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno desde .env
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Supabase Client (usando service role para tener acceso total)
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Endpoints
app.post('/api/register', async (req, res) => {
  const { email, password, name, area } = req.body;
  
  try {
    if (!email || !password || !name || !area) {
      throw new Error("Faltan campos requeridos");
    }

    // 1. Crear usuario y auto-confirmarlo usando la API Admin
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, role: req.body.role || 'user' }
    });

    if (authError) throw authError;

    // 2. Crear su perfil de encargado
    const { error: profileError } = await supabase.from('perfil_encargado').insert({
      id: authData.user.id,
      nombre: name,
      area_principal: area
    });

    if (profileError) {
      // Si falla, podríamos eliminar el usuario, pero lo mantenemos simple.
      throw profileError;
    }

    res.json({ success: true, user: authData.user });
  } catch (error) {
    console.error("Error en registro:", error);
    res.status(400).json({ error: error.message });
  }
});

// Configuración de Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail', // Usa Gmail, como en EMAIL_USER
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

async function generarReporteIA(registros, periodo) {
  if (!process.env.VITE_GROQ_API_KEY) return null;
  
  const totalPiezas = registros.reduce((s, r) => s + (r.cantidad || 1), 0);
  const dataPromt = registros.slice(0, 100).map(r => `- ${r.trabajador_nombre} (Área: ${r.area || 'N/A'}) - ${r.tipo_trabajo} (${r.fase || 'N/A'}): ${r.cantidad} piezas (Proyecto: ${r.proyecto_nombre || 'N/A'})`).join('\n');
  
  const prompt = `Actúa como el Gerente de Planta. Escribe un resumen ejecutivo y directo de 2-3 párrafos sobre la producción ${periodo}.
Menciona cuántas piezas se lograron (Total: ${totalPiezas}), qué áreas destacaron y qué proyectos avanzaron más, basándote en esta data:
${dataPromt}

El tono debe ser profesional, claro y motivador. No uses formato markdown agresivo, usa HTML básico (<p>, <b>, <ul>, <li>) porque se enviará por correo.`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VITE_GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    });
    
    if (!res.ok) throw new Error(`Groq API Error: ${res.statusText}`);
    const data = await res.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('[IA] Error generando reporte:', error);
    return null;
  }
}

// Endpoint para generar el reporte on-demand (para WhatsApp UI)
app.post('/api/generate-ai-report', async (req, res) => {
  const { periodo = 'diario' } = req.body;
  try {
    const { data: registros, error: errReg } = await supabase
      .from('registro_trabajo')
      .select('*')
      .order('created_date', { ascending: false })
      .limit(100);
      
    if (errReg) throw errReg;
    
    // Para WhatsApp queremos texto plano (Markdown), no HTML, así que usaremos un prompt sin tags HTML
    const totalPiezas = registros.reduce((s, r) => s + (r.cantidad || 1), 0);
    const dataPromt = registros.slice(0, 100).map(r => `- ${r.trabajador_nombre} - ${r.tipo_trabajo}: ${r.cantidad}pz`).join('\n');
    
    const prompt = `Escribe un reporte de producción de WhatsApp. Sé muy breve, incluye emojis. Total piezas: ${totalPiezas}. Data:\n${dataPromt}`;
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.VITE_GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama3-8b-8192', messages: [{ role: 'user', content: prompt }] })
    });
    const data = await groqRes.json();
    res.json({ report: data.choices[0].message.content });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Función central para generar y enviar el reporte por Email
async function generarYEnviarReportes(periodo) {
  console.log(`[Cron] Iniciando envío de reportes automáticos: ${periodo}`);
  
  try {
    const { data: contactos, error: errContactos } = await supabase
      .from('automatizacionWhatsApp')
      .select('*')
      .eq('activo', true)
      .eq(`recibe_${periodo}`, true)
      .eq('canal', 'email'); // Solo mandamos los de email automáticamente

    if (errContactos) throw errContactos;
    if (!contactos || contactos.length === 0) {
      console.log(`[Cron] No hay contactos activos para el periodo: ${periodo}`);
      return;
    }

    const { data: registros, error: errReg } = await supabase
      .from('registro_trabajo')
      .select('*')
      .order('created_date', { ascending: false })
      .limit(100);
      
    if (errReg) throw errReg;

    const reporteIA = await generarReporteIA(registros, periodo);

    let htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #ea580c; border-bottom: 2px solid #ea580c; padding-bottom: 10px;">Reporte Ejecutivo de Producción (${periodo})</h2>
        <div style="background-color: #fff7ed; padding: 15px; border-radius: 8px; border: 1px solid #ffedd5; margin-bottom: 20px;">
          ${reporteIA || '<p>Resumen IA no disponible. Revisa los registros a continuación.</p>'}
        </div>
        <p style="margin-top:20px; font-size:12px; color:#999; text-align: center;">Generado automáticamente por Goirand OPS Intelligence.</p>
      </div>
    `;

    for (const contacto of contactos) {
      try {
        await transporter.sendMail({
          from: `"Goirand OPS" <${process.env.EMAIL_USER}>`,
          to: contacto.email,
          subject: `Reporte de Producción - Goirand (${periodo})`,
          html: htmlContent,
        });
        console.log(`[Cron] Correo enviado a ${contacto.email}`);
      } catch (e) {
        console.error(`[Cron] Error enviando a ${contacto.email}:`, e);
      }
    }
    
    console.log(`[Cron] Finalizado envío de reportes (${periodo}).`);
  } catch (error) {
    console.error(`[Cron] Error global en proceso de reportes:`, error);
  }
}

// ==========================================
// TAREAS CRON
// ==========================================

// Reporte Diario: Todos los días a las 18:30 hrs
cron.schedule('30 18 * * *', () => {
  generarYEnviarReportes('diario');
});

// Reporte Semanal: Viernes a las 18:30 hrs
cron.schedule('30 18 * * 5', () => {
  generarYEnviarReportes('semanal');
});

// Reporte Mensual: Día 30 de cada mes a las 18:30 hrs
cron.schedule('30 18 30 * *', () => {
  generarYEnviarReportes('mensual');
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[Server] Goirand OPS Mailer Automations corriendo en puerto ${PORT}`);
  console.log(`[Server] Trabajos programados listos para ejecutarse.`);
});
