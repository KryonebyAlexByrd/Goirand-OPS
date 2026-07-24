import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function clean() {
  console.log("=== INICIANDO LIMPIEZA ===");

  // 1. Borrar proyecto de prueba
  const { error: errDelete } = await supabase
    .from('proyecto')
    .delete()
    .eq('id', 'id_lzf16irpt_mrxutwp0');

  if (errDelete) console.error("Error borrando proyecto de prueba:", errDelete);
  else console.log("✔ Proyecto de prueba (Prueba Proyecto Arreglado) eliminado.");

  // 2. Limpiar partidas_cotizacion de EDITION CDMX
  const { error: errEdition } = await supabase
    .from('proyecto')
    .update({ partidas_cotizacion: [] })
    .eq('id', '6a2c26d9fe2e2288e5aeeab6');

  if (errEdition) console.error("Error limpiando EDITION CDMX:", errEdition);
  else console.log("✔ 'EDITION CDMX' (partidas_cotizacion) vaciado a [].");

  // 3. Limpiar partidas_cotizacion de Ritz-Carlton
  const { error: errRitz } = await supabase
    .from('proyecto')
    .update({ partidas_cotizacion: [] })
    .eq('id', 'id_kos6abex6_mrxv9gbg');

  if (errRitz) console.error("Error limpiando Ritz-Carlton:", errRitz);
  else console.log("✔ 'Ritz-Carlton Reserve Costa Canuva - Branded' (partidas_cotizacion) vaciado a [].");

  console.log("=== LIMPIEZA FINALIZADA EN SUPABASE ===");
}

clean();
