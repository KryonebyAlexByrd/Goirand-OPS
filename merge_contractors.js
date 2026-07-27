import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

async function merge() {
  console.log("=== UNIFICANDO CONTRATISTAS Y ELIMINANDO DUPLICADOS EN SUPABASE ===");

  // 1. Reasignar cualquier registro de trabajo de 'Eric' a 'Erik'
  const oldEricId = '6a0b2f3fadbdcb57f359cb14';
  const targetErikId = '6a0b2f3fadbdcb57f359cb15';

  const { data: updatedLogs, error: errLogs } = await supabase
    .from('registro_trabajo')
    .update({ contratista_id: targetErikId })
    .eq('contratista_id', oldEricId)
    .select();

  if (errLogs) console.error("Error reasignando registros de Eric:", errLogs);
  else console.log(`✔ Reasignados ${updatedLogs ? updatedLogs.length : 0} registros de trabajo a 'Erik'.`);

  // 2. Eliminar el duplicado 'Eric'
  const { error: errDel } = await supabase
    .from('contratista')
    .delete()
    .eq('id', oldEricId);

  if (errDel) console.error("Error eliminando Eric:", errDel);
  else console.log("✔ Registro duplicado 'Eric' eliminado de la tabla contratista.");

  // 3. Obtener lista limpia final
  const { data: finalContratistas } = await supabase
    .from('contratista')
    .select('id, nombre, categoria, telefono, email')
    .order('nombre', { ascending: true });

  console.log("\n=== LISTA FINAL OFICIAL DE CONTRATISTAS EN SUPABASE ===");
  console.table(finalContratistas);
}

merge();
