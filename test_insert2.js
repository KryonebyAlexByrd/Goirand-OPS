import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

function generateSafeId() {
  return 'id_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const form = {
    id: generateSafeId(),
    numero_proyecto: `PRY-${Math.floor(100000 + Math.random() * 900000)}`,
    descripcion: "Prueba Proyecto Arreglado",
    cliente_nombre: "Cliente Test",
    cliente_id: null,
    estado: "Activo",
    prioridad: "Media",
    fecha_inicio: new Date().toISOString().split("T")[0],
    fecha_entrega_estimada: null,
    monto_total: 100,
    monto_incluye_iva: true,
    fabricas_asignadas: [],
    fase_actual: "1. Recepción de Proyecto",
    porcentaje_avance: 0,
    contratistas_asignados: [],
    pagos_programados: [],
    fases_completadas: [],
    partidas_cotizacion: [],
    notas_internas: "",
  };

  const { data, error } = await supabase.from('proyecto').insert(form).select();
  console.log("Error:", error);
  console.log("Data:", data);
}
test();
