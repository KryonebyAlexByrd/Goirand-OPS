import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const partidasOfficial = [
  { codigo: "HAB-200", tipo_trabajo: "SILLA BEATRIZ", descripcion: "SILLA BEATRIZ", cantidad_total: 90, cantidad_realizada: 0, unidad: "pz", precio_unitario: 10150, precio_total: 913500 },
  { codigo: "HAB-200.1", tipo_trabajo: "POLTRONA BEATRIZ", descripcion: "POLTRONA BEATRIZ", cantidad_total: 60, cantidad_realizada: 0, unidad: "pz", precio_unitario: 10150, precio_total: 609000 },
  { codigo: "HAB-201", tipo_trabajo: "SOFA 185", descripcion: "SOFA 185", cantidad_total: 60, cantidad_realizada: 0, unidad: "pz", precio_unitario: 26600, precio_total: 1596000 },
  { codigo: "HAB-201.1", tipo_trabajo: "SOFA 220", descripcion: "SOFA 220", cantidad_total: 20, cantidad_realizada: 0, unidad: "pz", precio_unitario: 30800, precio_total: 616000 },
  { codigo: "HAB-300", tipo_trabajo: "ESPEJO", descripcion: "ESPEJO", cantidad_total: 120, cantidad_realizada: 0, unidad: "pz", precio_unitario: 8500, precio_total: 1020000 },
  { codigo: "HAB-301", tipo_trabajo: "BASE CAMA KS", descripcion: "BASE CAMA KS", cantidad_total: 100, cantidad_realizada: 0, unidad: "pz", precio_unitario: 16800, precio_total: 1680000 },
  { codigo: "HAB-301.1", tipo_trabajo: "BASE CAMA QS", descripcion: "BASE CAMA QS", cantidad_total: 40, cantidad_realizada: 0, unidad: "pz", precio_unitario: 16800, precio_total: 672000 },
  { codigo: "HAB-400", tipo_trabajo: "CONSOLA 200X40X68", descripcion: "CONSOLA 200X40X68", cantidad_total: 70, cantidad_realizada: 0, unidad: "pz", precio_unitario: 12200, precio_total: 854000 },
  { codigo: "HAB-403", tipo_trabajo: "CONSOLA 200X50X68", descripcion: "CONSOLA 200X50X68", cantidad_total: 10, cantidad_realizada: 0, unidad: "pz", precio_unitario: 12200, precio_total: 122000 },
  { codigo: "HAB-404", tipo_trabajo: "CONSOLA 255X40X68", descripcion: "CONSOLA 255X40X68", cantidad_total: 20, cantidad_realizada: 0, unidad: "pz", precio_unitario: 14600, precio_total: 292000 },
  { codigo: "HAB-401", tipo_trabajo: "MESA 80Ø", descripcion: "MESA 80Ø", cantidad_total: 80, cantidad_realizada: 0, unidad: "pz", precio_unitario: 11600, precio_total: 928000 },
  { codigo: "HAB-401-CUB", tipo_trabajo: "MESA-CUBIERTA 80Ø", descripcion: "MESA-CUBIERTA 80Ø", cantidad_total: 80, cantidad_realizada: 0, unidad: "pz", precio_unitario: 8200, precio_total: 656000 },
  { codigo: "HAB-401.1", tipo_trabajo: "MESA 90Ø", descripcion: "MESA 90Ø", cantidad_total: 30, cantidad_realizada: 0, unidad: "pz", precio_unitario: 11986.67, precio_total: 359600 },
  { codigo: "HAB-401.1-CUB", tipo_trabajo: "MESA-CUBIERTA 90Ø", descripcion: "MESA-CUBIERTA 90Ø", cantidad_total: 30, cantidad_realizada: 0, unidad: "pz", precio_unitario: 9900, precio_total: 297000 },
  { codigo: "HAB-800", tipo_trabajo: "TOALLERO", descripcion: "TOALLERO", cantidad_total: 120, cantidad_realizada: 0, unidad: "pz", precio_unitario: 6500, precio_total: 780000 }
];

async function run() {
  const montoTotal = partidasOfficial.reduce((s, p) => s + p.precio_total, 0);

  const { data, error } = await supabase
    .from('proyecto')
    .update({
      partidas_cotizacion: partidasOfficial,
      monto_total: montoTotal,
      porcentaje_avance: 0
    })
    .eq('id', '6a2c26d9fe2e2288e5aeeab6')
    .select();

  if (error) {
    console.error("Error restaurando EDITION CDMX:", error);
  } else {
    console.log("✔ ¡OFICIAL! 15 partidas cargadas a EDITION CDMX. Monto total:", montoTotal);
  }
}

run();
