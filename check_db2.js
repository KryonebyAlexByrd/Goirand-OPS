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

async function check() {
  const res = await fetch(`${url}/rest/v1/proyecto?id=eq.6a2c26d9fe2e2288e5aeeab6`, {
    method: 'PATCH',
    headers: { 
      'apikey': key, 
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ porcentaje_avance: 29 })
  });
  const data = await res.text();
  console.log('Status:', res.status);
  console.log(data);
}
check();
