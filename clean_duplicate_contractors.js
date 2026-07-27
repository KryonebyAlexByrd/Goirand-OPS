import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function cleanDuplicates() {
  console.log("=== INSPECCIONANDO CONTRATISTAS EN SUPABASE ===");
  const { data: contratistas, error } = await supabase
    .from('contratista')
    .select('*')
    .order('created_date', { ascending: true });

  if (error) {
    console.error("Error obteniendo contratistas:", error);
    return;
  }

  console.log(`Total contratistas encontrados: ${contratistas.length}`);

  const seen = new Map();
  const duplicateIds = [];

  for (const c of contratistas) {
    const normName = (c.nombre || "").trim().toLowerCase();
    if (!normName) continue;

    if (seen.has(normName)) {
      console.log(`❌ Duplicado detectado: "${c.nombre}" (ID: ${c.id}) - duplicado de ID: ${seen.get(normName).id}`);
      duplicateIds.push(c.id);
    } else {
      seen.set(normName, c);
    }
  }

  console.log(`\nTotal duplicados a eliminar: ${duplicateIds.length}`);

  if (duplicateIds.length > 0) {
    for (const id of duplicateIds) {
      const { error: delErr } = await supabase.from('contratista').delete().eq('id', id);
      if (delErr) {
        console.error(`Error eliminando contratista ID ${id}:`, delErr.message);
      } else {
        console.log(`✔ Contratista duplicado eliminado ID: ${id}`);
      }
    }
  } else {
    console.log("No se encontraron duplicados.");
  }

  // Verificación final
  const { data: finalData } = await supabase.from('contratista').select('id, nombre, categoria').order('nombre');
  console.log("\n=== LISTA FINAL DE CONTRATISTAS LIMPÍOS ===");
  console.table(finalData);
}

cleanDuplicates();
