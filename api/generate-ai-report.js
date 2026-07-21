import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Configuración de CORS si es necesario (Vercel lo maneja pero está bien asegurar)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );

    const { periodo = 'diario' } = req.body;
    
    const { data: registros, error: errReg } = await supabase
      .from('registro_trabajo')
      .select('*')
      .order('created_date', { ascending: false })
      .limit(100);
      
    if (errReg) throw errReg;
    
    const totalPiezas = registros.reduce((s, r) => s + (r.cantidad || 1), 0);
    const dataPromt = registros.slice(0, 100).map(r => `- ${r.trabajador_nombre} - ${r.tipo_trabajo}: ${r.cantidad}pz`).join('\n');
    
    const prompt = `Escribe un reporte de producción de WhatsApp. Sé muy breve, incluye emojis. Total piezas: ${totalPiezas}. Data:\n${dataPromt}`;
    
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.VITE_GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'llama3-8b-8192', messages: [{ role: 'user', content: prompt }] })
    });
    
    if (!groqRes.ok) throw new Error(`Groq API Error: ${groqRes.statusText}`);
    const data = await groqRes.json();
    
    res.json({ report: data.choices[0].message.content });
  } catch (error) {
    console.error('Error generando reporte:', error);
    res.status(500).json({ error: error.message });
  }
}
