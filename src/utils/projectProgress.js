import { supabase } from "@/api/supabaseClient";

export async function updateProjectProgress(proyecto_id, tipo_trabajo, cantidad, es_finalizado) {
  if (!proyecto_id || !tipo_trabajo) return;

  const cantidadNum = parseInt(cantidad, 10) || 0;
  if (cantidadNum <= 0) return;

  try {
    // 1. Obtener proyecto actual
    const { data: p, error } = await supabase
      .from('proyecto')
      .select('partidas_cotizacion')
      .eq('id', proyecto_id)
      .single();

    if (error || !p) {
      console.error("Error fetching project for progress update:", error);
      return;
    }

    let partidas = Array.isArray(p.partidas_cotizacion) ? p.partidas_cotizacion : [];
    
    let exists = false;
    let totalPiezas = 0;
    let totalRealizadas = 0;

    const targetClean = tipo_trabajo.trim().toLowerCase();

    // 2. Modificar la partida correspondiente
    partidas = partidas.map(pt => {
      const ptNombre = (pt.tipo_trabajo || "").trim().toLowerCase();
      const ptCodigo = (pt.codigo || "").trim().toLowerCase();
      
      const isMatch = (ptNombre === targetClean) || 
                      (ptCodigo === targetClean) || 
                      (targetClean.length > 5 && ptNombre.includes(targetClean)) ||
                      (ptNombre.length > 5 && targetClean.includes(ptNombre));

      if (isMatch) {
        exists = true;
        const currentDone = parseInt(pt.cantidad_realizada, 10) || 0;
        return {
          ...pt,
          cantidad_realizada: currentDone + cantidadNum
        };
      }
      return pt;
    });

    // 3. Si no existía la partida, la agregamos al proyecto
    if (!exists) {
      partidas.push({
        tipo_trabajo: tipo_trabajo.trim(),
        cantidad_total: cantidadNum,
        cantidad_realizada: cantidadNum,
        unidad: "pz",
        precio_unitario: 0,
        precio_total: 0
      });
    }

    // 4. Recalcular avance global
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
    }

  } catch (err) {
    console.error("Error updating project progress:", err);
  }
}
