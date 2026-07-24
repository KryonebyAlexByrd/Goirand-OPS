import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function verify() {
  const { data, error, count } = await supabase.from('registro_trabajo').select('*', { count: 'exact' });
  if (error) console.error(error);
  else console.log("Total registros de trabajo intactos en BD:", data.length);
}
verify();
