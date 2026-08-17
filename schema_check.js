import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function check() {
  const { data: perfiles } = await supabase.from('perfil_encargado').select('*').limit(1);
  console.log("Perfil keys:", perfiles && perfiles.length > 0 ? Object.keys(perfiles[0]) : "none");

  const { data: proyectos } = await supabase.from('proyecto').select('partidas_cotizacion').limit(1);
  if (proyectos && proyectos.length > 0) {
    console.log("Partida keys:", proyectos[0].partidas_cotizacion && proyectos[0].partidas_cotizacion.length > 0 ? Object.keys(proyectos[0].partidas_cotizacion[0]) : "none");
  }
}
check();
