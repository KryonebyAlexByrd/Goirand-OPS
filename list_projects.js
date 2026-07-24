import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function list() {
  const { data, error } = await supabase.from('proyecto').select('id, numero_proyecto, descripcion, partidas_cotizacion, created_date');
  if (error) console.error(error);
  else {
    console.log("Found", data.length, "projects:");
    data.forEach(p => {
      console.log(`- ID: ${p.id} | Num: ${p.numero_proyecto} | Desc: ${p.descripcion} | Partidas count: ${(p.partidas_cotizacion || []).length}`);
    });
  }
}
list();
