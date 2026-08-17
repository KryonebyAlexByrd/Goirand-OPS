import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function rename() {
  console.log("=== RENOMBRANDO CONTRATISTA DE MANUEL SÁNCHEZ A ALAM ===");

  const { data: updated, error } = await supabase
    .from('contratista')
    .update({ nombre: 'Alam' })
    .ilike('nombre', '%Manuel Sánchez%')
    .select();

  if (error) {
    console.error("Error renombrando contratista:", error);
  } else {
    console.log("✔ Contratista renombrado exitosamente a Alam:", updated);
  }

  // Verificar la lista actualizada
  const { data: list } = await supabase.from('contratista').select('id, nombre, categoria').order('nombre');
  console.log("\n=== LISTA ACTUALIZADA DE CONTRATISTAS ===");
  console.table(list);
}

rename();
