import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

function excelDateToJSDate(serial) {
  if (!serial || isNaN(serial)) return null;
  const utc_days  = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;                                        
  const date_info = new Date(utc_value * 1000);
  return date_info.toISOString().split('T')[0];
}

function cleanContractorString(str) {
  if (!str) return "Sin asignar";
  let cleaned = str.toUpperCase().trim();
  if (cleaned.includes('JOSE BRIONES')) cleaned = cleaned.replace(/JOSE BRIONES/g, 'BRIONES');
  if (cleaned.includes('ALAM')) cleaned = cleaned.replace(/ALAM/g, 'ALAM');
  
  let parts = cleaned.split('/').map(s => s.trim()).filter(Boolean);
  parts = parts.map(pt => {
    let lower = pt.toLowerCase();
    if (lower === 'ramon') lower = 'ramón';
    if (lower === 'farias') lower = 'farías';
    if (lower === 'solidas') lower = 'superficies sólidas';
    return pt.charAt(0).toUpperCase() + pt.slice(1).toLowerCase();
  });
  
  const uniqueParts = [...new Set(parts)];
  return uniqueParts.join(' / ');
}

function addContractor(existing, newContractorRaw) {
  if (!newContractorRaw) return existing;
  const newContractor = cleanContractorString(newContractorRaw);
  if (newContractor === "Sin asignar") return existing;
  if (!existing || existing === "Sin asignar") return newContractor;
  
  const existingParts = existing.split(' / ').map(s => s.trim().toLowerCase());
  const newParts = newContractor.split(' / ').map(s => s.trim());
  
  let resultParts = existing.split(' / ').map(s => s.trim());
  newParts.forEach(np => {
    if (!existingParts.includes(np.toLowerCase())) {
      resultParts.push(np);
    }
  });
  return resultParts.join(' / ');
}

async function run() {
  const file = '/Users/thephoenyx/Downloads/Goirand/PROGRAMA CONTRATISTAS.xlsx';
  console.log(`Processing ${file}...`);
  const wb = xlsx.readFile(file);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(ws, { header: 1 });
  
  // Columns:
  // 0: Proyecto 
  // 1: Contratista
  // 2: Descripción 
  // 3: Clave 
  // 4: Cantidad 
  // 5: Fecha entrega
  // 6: Cantidad entregada 
  // 7: Faltantes

  const projectsMap = {}; // { 'projectName': [ { item }, ... ] }
  
  for (let i = 2; i < data.length; i++) {
    const row = data[i] || [];
    let projectName = row[0] ? row[0].toString().trim() : "";
    if (!projectName) continue;
    
    if (projectName.toLowerCase().includes('branded')) {
      continue; // Skip branded as requested
    }
    
    const rawContratista = row[1] ? row[1].toString().trim() : "";
    const desc = row[2] ? row[2].toString().trim() : "";
    const clave = row[3] ? row[3].toString().trim() : "";
    const cant = parseInt(row[4], 10) || 0;
    const dateSerial = parseInt(row[5], 10) || null;
    const dateStr = excelDateToJSDate(dateSerial);
    const cantEntregada = parseInt(row[6], 10) || 0;
    
    if (!desc && !clave) continue;
    
    if (!projectsMap[projectName]) {
      projectsMap[projectName] = [];
    }
    
    projectsMap[projectName].push({
      codigo: clave,
      tipo_trabajo: desc,
      cantidad_total: cant,
      cantidad_realizada: cantEntregada,
      contratista: rawContratista,
      fecha_estimada: dateStr
    });
  }
  
  console.log(`Parsed ${Object.keys(projectsMap).length} projects from Excel (excluding Branded).`);
  
  const { data: dbProjects } = await supabase.from('proyecto').select('id, descripcion, partidas_cotizacion');
  
  for (const pName of Object.keys(projectsMap)) {
    const excelItems = projectsMap[pName];
    
    // Find project in DB (case-insensitive include)
    let existingProj = dbProjects.find(p => p.descripcion.toLowerCase().includes(pName.toLowerCase()) || pName.toLowerCase().includes(p.descripcion.toLowerCase()));
    
    if (existingProj) {
      console.log(`Updating existing project: ${existingProj.descripcion} (Matched: ${pName})`);
      let currentPartidas = Array.isArray(existingProj.partidas_cotizacion) ? existingProj.partidas_cotizacion : [];
      let changed = false;
      
      excelItems.forEach(eItem => {
        const matchIdx = currentPartidas.findIndex(ep => 
          (ep.codigo && eItem.codigo && ep.codigo.toLowerCase() === eItem.codigo.toLowerCase()) || 
          (ep.tipo_trabajo && eItem.tipo_trabajo && ep.tipo_trabajo.toLowerCase() === eItem.tipo_trabajo.toLowerCase())
        );
        
        if (matchIdx !== -1) {
          // Update existing
          const ep = currentPartidas[matchIdx];
          const newContractorStr = addContractor(ep.contratista, eItem.contratista);
          if (ep.contratista !== newContractorStr) {
            ep.contratista = newContractorStr;
            changed = true;
          }
          if (eItem.fecha_estimada && ep.fecha_estimada !== eItem.fecha_estimada) {
            ep.fecha_estimada = eItem.fecha_estimada;
            changed = true;
          }
          if (eItem.cantidad_total > 0 && ep.cantidad_total !== eItem.cantidad_total) {
            ep.cantidad_total = eItem.cantidad_total;
            changed = true;
          }
          if (eItem.cantidad_realizada > (ep.cantidad_realizada || 0)) {
            ep.cantidad_realizada = eItem.cantidad_realizada;
            changed = true;
          }
        } else {
          // Insert new
          currentPartidas.push({
            codigo: eItem.codigo,
            tipo_trabajo: eItem.tipo_trabajo,
            cantidad_total: eItem.cantidad_total,
            cantidad_realizada: eItem.cantidad_realizada,
            contratista: cleanContractorString(eItem.contratista),
            fecha_estimada: eItem.fecha_estimada,
            imagen_url: null,
            areas_completadas: []
          });
          changed = true;
        }
      });
      
      if (changed) {
        await supabase.from('proyecto').update({ partidas_cotizacion: currentPartidas }).eq('id', existingProj.id);
      }
    } else {
      console.log(`Creating new project: ${pName}`);
      const newPartidas = excelItems.map(eItem => ({
        codigo: eItem.codigo,
        tipo_trabajo: eItem.tipo_trabajo,
        cantidad_total: eItem.cantidad_total,
        cantidad_realizada: eItem.cantidad_realizada,
        contratista: cleanContractorString(eItem.contratista),
        fecha_estimada: eItem.fecha_estimada,
        imagen_url: null,
        areas_completadas: []
      }));
      
      const { error } = await supabase.from('proyecto').insert({
        id: crypto.randomUUID(),
        descripcion: pName,
        numero_proyecto: `AUTO-${Math.floor(Math.random() * 10000)}`,
        partidas_cotizacion: newPartidas,
        estado: 'en proceso'
      });
      if (error) console.error("Error creating project:", error);
    }
  }
  
  console.log("Sync complete!");
}

run();
