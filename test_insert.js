import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const finalForm = {
    descripcion: "TEST EXCEL", numero_proyecto: "123",
    cliente_nombre: "TEST", cliente_telefono: "", cliente_email: "",
    monto_total: 100, monto_pagado: 0, forma_pago: "", estado: "Activo",
    partidas_cotizacion: [],
    notas_internas: "",
    fabricas_asignadas: [],
  };
  const { data, error } = await supabase.from('proyecto').insert(finalForm).select();
  console.log("Error:", error);
  console.log("Data:", data);
}
test();
