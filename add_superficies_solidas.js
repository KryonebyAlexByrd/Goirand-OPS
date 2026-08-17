import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

function generateSafeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function addContractor() {
  console.log("=== AGREGANDO CONTRATISTA 'Superficies sólidas' (Herrero) ===");

  const payload = {
    id: generateSafeId(),
    nombre: 'Superficies sólidas',
    categoria: 'Herrero',
    disponible: true,
    created_date: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('contratista')
    .insert(payload)
    .select();

  if (error) {
    console.error("Error agregando contratista:", error);
  } else {
    console.log("✔ Contratista agregado exitosamente:", data[0]);
  }

  // Lista final
  const { data: list } = await supabase.from('contratista').select('id, nombre, categoria').order('nombre');
  console.log("\n=== LISTA ACTUALIZADA DE 15 CONTRATISTAS EN SUPABASE ===");
  console.table(list);
}

addContractor();
