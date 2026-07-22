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

async function testUpdate() {
  const proyecto_id = '6a2c26d9fe2e2288e5aeeab6';
  const tipo_trabajo = 'ESPEJO';
  const cantidadNum = 5;
  const es_finalizado = true;

  const { data: p, error } = await supabase.from('proyecto').select('partidas_cotizacion').eq('id', proyecto_id).single();

  let partidas = Array.isArray(p.partidas_cotizacion) ? p.partidas_cotizacion : [];
  
  let exists = false;
  let totalPiezas = 0;
  let totalRealizadas = 0;

  partidas = partidas.map(pt => {
    const ptNombre = (pt.tipo_trabajo || "").trim().toLowerCase();
    const targetNombre = tipo_trabajo.trim().toLowerCase();
    
    if (ptNombre === targetNombre) {
      exists = true;
      if (es_finalizado) {
        return {
          ...pt,
          cantidad_realizada: (parseInt(pt.cantidad_realizada, 10) || 0) + cantidadNum
        };
      }
    }
    return pt;
  });

  if (!exists) {
    partidas.push({
      tipo_trabajo: tipo_trabajo.trim(),
      cantidad_total: cantidadNum,
      cantidad_realizada: es_finalizado ? cantidadNum : 0
    });
  }

  const updatedPartida = partidas.find(pt => pt.tipo_trabajo === 'ESPEJO');
  console.log("ESPEJO AFTER MAP:", updatedPartida);

}
testUpdate();
