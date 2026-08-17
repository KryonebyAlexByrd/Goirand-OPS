import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkBranded() {
  const { data, error } = await supabase
    .from('proyecto')
    .select('id, descripcion, numero_proyecto, partidas_cotizacion')
    .ilike('descripcion', '%branded%')
    .limit(1);

  if (error) {
    console.error("Error:", error);
    return;
  }
  
  if (data.length === 0) {
    console.log("No project found with 'branded' in description.");
    return;
  }

  const p = data[0];
  console.log(`Found project: ${p.descripcion} (ID: ${p.id})`);
  
  const partidas = p.partidas_cotizacion || [];
  console.log(`Number of partidas: ${partidas.length}`);
  console.log("First partida:", partidas[0]?.codigo, partidas[0]?.tipo_trabajo);
  console.log("Last partida:", partidas[partidas.length - 1]?.codigo, partidas[partidas.length - 1]?.tipo_trabajo);
}

checkBranded();
