// In-memory test of the project progress logic

let partidas = [
  {
    tipo_trabajo: "Silla de Prueba",
    cantidad_total: 10,
    cantidad_realizada: 0,
    avance_areas: {},
    unidad: "pz",
  }
];

function simulateUpdate(tipo_trabajo, cantidad, area, isFinalizado) {
  let totalPiezas = 0;
  let totalRealizadas = 0;
  const targetClean = tipo_trabajo.trim().toLowerCase();

  partidas = partidas.map(pt => {
    const ptNombre = (pt.tipo_trabajo || "").trim().toLowerCase();
    if (ptNombre === targetClean) {
      const currentDone = parseInt(pt.cantidad_realizada, 10) || 0;
      let newAvanceAreas = { ...(pt.avance_areas || {}) };
      
      // The exact logic from updateProjectProgress.js
      if (area) {
         newAvanceAreas[area] = (newAvanceAreas[area] || 0) + cantidad;
      }
      let newDone = currentDone;
      if (isFinalizado) {
          newDone += cantidad;
      }
      
      return {
        ...pt,
        cantidad_realizada: newDone,
        avance_areas: newAvanceAreas
      };
    }
    return pt;
  });

  partidas.forEach(pt => {
    totalPiezas += (parseInt(pt.cantidad_total, 10) || 0);
    totalRealizadas += (parseInt(pt.cantidad_realizada, 10) || 0);
  });

  const porcentaje_avance = totalPiezas > 0 ? Math.min(100, Math.round((totalRealizadas / totalPiezas) * 100)) : 0;

  return { partidas, porcentaje_avance };
}

console.log("INITIAL STATE:");
console.log(JSON.stringify(partidas[0], null, 2));
console.log("-----------------------------------------");

console.log("SCENARIO 1: Worker registers 3 in Barnizado, does NOT click Finalizado checkbox.");
let res1 = simulateUpdate("Silla de Prueba", 3, "Barnizado", false);
console.log(JSON.stringify(res1.partidas[0], null, 2));
console.log("Global Progress:", res1.porcentaje_avance, "% (Should be 0%)");
console.log("-----------------------------------------");

console.log("SCENARIO 2: Worker registers 3 in Empaque, AND clicks Finalizado checkbox.");
let res2 = simulateUpdate("Silla de Prueba", 3, "Empaque", true);
console.log(JSON.stringify(res2.partidas[0], null, 2));
console.log("Global Progress:", res2.porcentaje_avance, "% (Should be 30%)");
console.log("-----------------------------------------");
