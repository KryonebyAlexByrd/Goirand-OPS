import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const partidasEdition = [
  { codigo: "ED-01", tipo_trabajo: "SOFA 185", descripcion: "Sofá modular 185cm tapizado", cantidad_total: 60, cantidad_realizada: 0, unidad: "pz", precio_unitario: 25000, precio_total: 1500000 },
  { codigo: "ED-02", tipo_trabajo: "BASE CAMA KS", descripcion: "Base para cama King Size en madera", cantidad_total: 30, cantidad_realizada: 0, unidad: "pz", precio_unitario: 18000, precio_total: 540000 },
  { codigo: "ED-03", tipo_trabajo: "Silla Beatriz", descripcion: "Silla de comedor tapizada", cantidad_total: 80, cantidad_realizada: 0, unidad: "pz", precio_unitario: 6500, precio_total: 520000 },
  { codigo: "ED-04", tipo_trabajo: "Poltrona", descripcion: "Sillón ocasional poltrona", cantidad_total: 25, cantidad_realizada: 0, unidad: "pz", precio_unitario: 14000, precio_total: 350000 },
  { codigo: "ED-05", tipo_trabajo: "Consola", descripcion: "Mueble consola de entrada con cubierta", cantidad_total: 15, cantidad_realizada: 0, unidad: "pz", precio_unitario: 16000, precio_total: 240000 },
  { codigo: "ED-06", tipo_trabajo: "Espejo", descripcion: "Espejo con marco decorativo", cantidad_total: 40, cantidad_realizada: 0, unidad: "pz", precio_unitario: 8500, precio_total: 340000 },
  { codigo: "ED-07", tipo_trabajo: "Toallado", descripcion: "Mueble toallero de baño", cantidad_total: 50, cantidad_realizada: 0, unidad: "pz", precio_unitario: 9000, precio_total: 450000 },
  { codigo: "ED-08", tipo_trabajo: "Mesa", descripcion: "Mesa auxiliar de centro", cantidad_total: 35, cantidad_realizada: 0, unidad: "pz", precio_unitario: 12000, precio_total: 420000 }
];

async function restore() {
  // 1. Restaurar partidas de EDITION CDMX con 0 realizadas y avance 0
  const { error: err1 } = await supabase
    .from('proyecto')
    .update({ 
      partidas_cotizacion: partidasEdition,
      porcentaje_avance: 0
    })
    .eq('id', '6a2c26d9fe2e2288e5aeeab6');

  if (err1) console.error("Error restaurando EDITION CDMX:", err1);
  else console.log("✔ 'EDITION CDMX' partidas restauradas con 0 piezas realizadas.");

  // 2. Asegurar que Ritz-Carlton tenga todas sus 46 partidas pero con cantidad_realizada: 0 y avance 0
  const { data: ritzData } = await supabase
    .from('proyecto')
    .select('partidas_cotizacion')
    .eq('id', 'id_kos6abex6_mrxv9gbg')
    .single();

  if (ritzData?.partidas_cotizacion?.length > 0) {
    const partidasReset = ritzData.partidas_cotizacion.map(p => ({
      ...p,
      cantidad_realizada: 0
    }));
    await supabase.from('proyecto').update({
      partidas_cotizacion: partidasReset,
      porcentaje_avance: 0
    }).eq('id', 'id_kos6abex6_mrxv9gbg');
    console.log("✔ 'Ritz-Carlton Branded' piezas realizadas reseteadas a 0 (avance 0%).");
  }
}

restore();
