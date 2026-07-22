import { supabase } from "@/api/supabaseClient";

export async function updateProjectProgress(proyecto_id, tipo_trabajo, cantidad, es_finalizado) {
  if (!proyecto_id || !tipo_trabajo) return;

  const cantidadNum = parseInt(cantidad, 10) || 0;

  try {
    // 1. Obtener proyecto actual
    const { data: p, error } = await supabase
      .from('proyecto')
      .select('partidas_cotizacion')
      .eq('id', proyecto_id)
      .single();

    if (error || !p) return;

    let partidas = Array.isArray(p.partidas_cotizacion) ? p.partidas_cotizacion : [];
    
    let exists = false;
    let totalPiezas = 0;
    let totalRealizadas = 0;

    // 2. Modificar la partida correspondiente
    partidas = partidas.map(pt => {
      // Normalizamos strings por si hay diferencias de mayúsculas/minúsculas o espacios
      const ptNombre = (pt.tipo_trabajo || "").trim().toLowerCase();
      const targetNombre = tipo_trabajo.trim().toLowerCase();
      
      if (ptNombre === targetNombre) {
        exists = true;
        if (es_finalizado) {
          return {
            ...pt,
            cantidad_realizada: (parseInt(pt.cantidad_realizada, 10) || 0) + cantidadNum
          };
        }
      }
      return pt;
    });

    // 3. Si no existía la partida, la agregamos al proyecto
    if (!exists) {
      partidas.push({
        tipo_trabajo: tipo_trabajo.trim(),
        cantidad_total: cantidadNum, // Asumimos que si no existía, esta es la cantidad total inicial
        cantidad_realizada: es_finalizado ? cantidadNum : 0
      });
    }

    // Si la partida ya existía y NO es_finalizado, no hubo cambios reales a las cantidades.
    // Pero si no existía, acabamos de agregarla, así que sí hay cambios.
    // De cualquier forma, procedemos a guardar.

    // 4. Recalcular avance
    partidas.forEach(pt => {
      totalPiezas += (parseInt(pt.cantidad_total, 10) || 0);
      totalRealizadas += (parseInt(pt.cantidad_realizada, 10) || 0);
    });

    const porcentaje_avance = totalPiezas > 0 
      ? Math.min(100, Math.round((totalRealizadas / totalPiezas) * 100)) 
      : 0;

    // 5. Guardar en base de datos
    const { error: updateError } = await supabase.from('proyecto').update({
      partidas_cotizacion: partidas,
      porcentaje_avance
    }).eq('id', proyecto_id);

    if (updateError) {
      console.error("Supabase update error:", updateError);
      throw updateError;
    }

  } catch (err) {
    console.error("Error updating project progress:", err);
    throw err;
  }
}
