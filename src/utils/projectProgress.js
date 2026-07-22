import { supabase } from "@/api/supabaseClient";

export async function updateProjectProgress(proyecto_id, tipo_trabajo, cantidad, es_finalizado) {
  if (!proyecto_id || !tipo_trabajo || !es_finalizado) return;

  try {
    // 1. Obtener proyecto actual
    const { data: p, error } = await supabase
      .from('proyecto')
      .select('partidas_cotizacion')
      .eq('id', proyecto_id)
      .single();

    if (error || !p) return;

    let partidas = Array.isArray(p.partidas_cotizacion) ? p.partidas_cotizacion : [];
    
    let updated = false;
    let totalPiezas = 0;
    let totalRealizadas = 0;

    // 2. Modificar la partida correspondiente
    partidas = partidas.map(pt => {
      if (pt.tipo_trabajo === tipo_trabajo) {
        updated = true;
        return {
          ...pt,
          cantidad_realizada: (pt.cantidad_realizada || 0) + cantidad
        };
      }
      return pt;
    });

    // 3. Si no existía la partida, la agregamos? El usuario dijo "se agrega eso a ese nuevo proyecto"
    if (!updated) {
      partidas.push({
        tipo_trabajo,
        cantidad_total: cantidad,
        cantidad_realizada: cantidad
      });
    }

    // 4. Recalcular avance
    partidas.forEach(pt => {
      totalPiezas += (pt.cantidad_total || 0);
      totalRealizadas += (pt.cantidad_realizada || 0);
    });

    const porcentaje_avance = totalPiezas > 0 
      ? Math.min(100, Math.round((totalRealizadas / totalPiezas) * 100)) 
      : 0;

    // 5. Guardar en base de datos
    await supabase.from('proyecto').update({
      partidas_cotizacion: partidas,
      porcentaje_avance
    }).eq('id', proyecto_id);

  } catch (err) {
    console.error("Error updating project progress:", err);
  }
}
