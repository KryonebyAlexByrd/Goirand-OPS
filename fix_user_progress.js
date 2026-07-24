import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function fix() {
  const proyecto_id = 'id_kos6abex6_mrxv9gbg';
  
  const { data: p } = await supabase.from('proyecto').select('partidas_cotizacion').eq('id', proyecto_id).single();
  let partidas = Array.isArray(p?.partidas_cotizacion) ? p.partidas_cotizacion : [];

  let totalPiezas = 0;
  let totalRealizadas = 0;

  // Actualizar la partida "Sofa chaise 190x85x57" o "Sofa chaise 173x105x63" con las 27 piezas registradas
  partidas = partidas.map(pt => {
    if (pt.tipo_trabajo?.toLowerCase().includes('sofa chaise')) {
      return {
        ...pt,
        cantidad_realizada: 27
      };
    }
    return pt;
  });

  partidas.forEach(pt => {
    totalPiezas += (parseInt(pt.cantidad_total, 10) || 0);
    totalRealizadas += (parseInt(pt.cantidad_realizada, 10) || 0);
  });

  const porcentaje_avance = totalPiezas > 0 ? Math.min(100, Math.round((totalRealizadas / totalPiezas) * 100)) : 0;

  const { data: updated, error } = await supabase.from('proyecto').update({
    partidas_cotizacion: partidas,
    porcentaje_avance
  }).eq('id', proyecto_id).select();

  if (error) console.error("Error:", error);
  else {
    console.log("✔ Proyecto Ritz-Carlton actualizado con 27 piezas realizadas en Sofa Chaise.");
    console.log("Nuevo porcentaje avance:", porcentaje_avance, "%");
  }
}
fix();
