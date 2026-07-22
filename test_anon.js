import fs from 'fs';
const envPath = '/Users/thephoenyx/Documents/antigravity/agitated-volta/Goirand OPS/.env.local';
let env = '';
try { env = fs.readFileSync(envPath, 'utf8'); } catch(e) {}
if (!env) {
  try { env = fs.readFileSync('/Users/thephoenyx/Documents/antigravity/agitated-volta/Goirand OPS/.env', 'utf8'); } catch(e) {}
}

let url = '';
let key = '';
env.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, key);

async function testUpdate() {
  const proyecto_id = '6a2c26d9fe2e2288e5aeeab6'; // EDITION CDMX
  
  const { data, error } = await supabase.from('proyecto').update({
    porcentaje_avance: 35
  }).eq('id', proyecto_id).select();

  console.log("Anon Update Error:", error);
  console.log("Anon Update Data:", data);
}
testUpdate();
