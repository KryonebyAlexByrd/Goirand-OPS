import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function list() {
  console.log("=== PERFIL ENCARGADO ===");
  const { data: enc, error: errEnc } = await supabase.from('perfil_encargado').select('*');
  if (errEnc) console.error(errEnc);
  else console.log(enc);

  console.log("\n=== TRABAJADOR ===");
  const { data: trab, error: errTrab } = await supabase.from('trabajador').select('*');
  if (errTrab) console.error(errTrab);
  else console.log(trab);
}
list();
