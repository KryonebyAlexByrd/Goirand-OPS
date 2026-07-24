import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

// Client using ONLY VITE_SUPABASE_ANON_KEY (like an unauthenticated user on the web)
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  console.log("=== TESTING ANON ACCESS TO PERFIL_ENCARGADO ===");
  const { data, error } = await supabase.from('perfil_encargado').select('*').order('nombre');
  console.log("Anon Error:", error);
  console.log("Anon Data Count:", data ? data.length : 0);
  if (data && data.length > 0) {
    console.log("Sample profile:", data[0]);
  }
}
test();
