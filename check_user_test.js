import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  console.log("=== REVISANDO REGISTROS RECIENTES ===");
  const { data: logs, error: errLogs } = await supabase.from('registro_trabajo').select('*').order('created_date', { ascending: false });
  console.log("Registros en registro_trabajo:", logs ? logs.length : 0);
  if (logs && logs.length > 0) {
    console.log("Últimos registros:", logs);
  }

  console.log("\n=== REVISANDO PROYECTO RITZ-CARLTON ===");
  const { data: proys } = await supabase.from('proyecto').select('id, descripcion, porcentaje_avance, partidas_cotizacion').ilike('descripcion', '%Ritz-Carlton%');
  if (proys && proys.length > 0) {
    const p = proys[0];
    console.log("Avance actual:", p.porcentaje_avance, "%");
    const itemSofa = (p.partidas_cotizacion || []).find(pt => pt.tipo_trabajo?.toLowerCase().includes('sofa chaise'));
    console.log("Partida Sofa Chaise en BD:", itemSofa);
  }
}
check();
