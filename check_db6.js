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
  if (line.startsWith('VITE_SUPABASE_SERVICE_ROLE_KEY=')) key = line.split('=')[1].trim();
  if (!key && line.startsWith('VITE_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('registro_trabajo').select('*').order('created_date', { ascending: false }).limit(10);
  console.log("With created_date order:", JSON.stringify(data.map(d => ({ tipo: d.tipo_trabajo, id: d.id, date: d.created_date })), null, 2));

  const { data: d2 } = await supabase.from('registro_trabajo').select('id');
  console.log("Total count:", d2.length);
}
check();
