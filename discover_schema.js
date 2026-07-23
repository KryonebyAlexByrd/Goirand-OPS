import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const tables = [
  'proyecto',
  'registro_trabajo',
  'contratista',
  'cliente',
  'trabajador',
  'perfil_encargado',
  'catalogo_trabajo',
  'area'
];

async function inspect() {
  console.log("=== DB SCHEMA INSPECTION ===");
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`\nTable '${table}': ERROR ->`, error.message);
    } else {
      console.log(`\nTable '${table}': OK (${data.length} sample rows)`);
      if (data.length > 0) {
        console.log("Columns:", Object.keys(data[0]));
      } else {
        console.log("No rows found to determine columns directly via sample, checking insert payload failure...");
      }
    }
  }
}
inspect();
