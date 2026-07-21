import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // Configuración CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { email, password, name, area, role } = req.body;
  
  try {
    if (!email || !password || !name || !area) {
      throw new Error("Faltan campos requeridos");
    }

    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );

    // 1. Crear usuario y auto-confirmarlo usando la API Admin
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name, role: role || 'user' }
    });

    if (authError) throw authError;

    // 2. Crear su perfil de encargado
    const { error: profileError } = await supabase.from('perfil_encargado').insert({
      id: authData.user.id,
      nombre: name,
      area_principal: area
    });

    if (profileError) {
      throw profileError;
    }

    res.status(200).json({ success: true, user: authData.user });
  } catch (error) {
    console.error("Error en registro:", error);
    res.status(400).json({ error: error.message });
  }
}
