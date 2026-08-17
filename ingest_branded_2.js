import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const dir = '/Users/thephoenyx/Downloads/Goirand/O.A.';

function cleanContractorString(str) {
  if (!str || str === 'Sin asignar') return str;
  let cleaned = str.toUpperCase();
  cleaned = cleaned.replace(/TE-/g, 'TECOMATLA / ');
  cleaned = cleaned.replace(/TA-/g, 'TLAHUAC / ');
  let parts = cleaned.split('/').map(s => s.trim()).filter(Boolean);
  parts = parts.map(p => {
    if (p === 'TECOMATLA') return 'Tecomatla';
    if (p === 'TLAHUAC') return 'Tlahuac';
    return p;
  });
  const uniqueParts = [...new Set(parts)];
  return uniqueParts.join(' / ');
}

async function processFile(file) {
  console.log(`Processing ${file}...`);
  const wb = xlsx.readFile(path.join(dir, file));
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(ws, { header: 1 });

  let projectName = file.replace(/\.xlsx$/i, '').trim();
  const match = projectName.match(/orden \d+-\s*\d+\s+(.*)/i);
  if (match) {
    projectName = match[1].trim();
  }

  let headerRow = -1;
  let claveIdx = -1, descIdx = -1, asigIdx = -1, cantTotalIdx = -1;

  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i] || [];
    row.forEach((cell, idx) => {
      if (typeof cell === 'string') {
        const lower = cell.toLowerCase().trim();
        if (lower === 'clave') claveIdx = idx;
        if (lower.includes('descripc')) descIdx = idx;
        if (lower.includes('asiganacion') || lower.includes('asignacion')) asigIdx = idx;
        if (lower === 'pedido' || lower === 'total') cantTotalIdx = idx; 
      }
    });
    if (claveIdx !== -1 && descIdx !== -1) {
      headerRow = i;
      break;
    }
  }

  if (headerRow === -1) {
    console.log(`Could not find headers in ${file}`);
    return;
  }

  if (cantTotalIdx === -1) {
    for (let i = headerRow; i < headerRow + 3; i++) {
      if (data[i]) {
        data[i].forEach((cell, idx) => {
          if (typeof cell === 'string' && cell.toLowerCase().trim() === 'total') cantTotalIdx = idx;
        });
      }
    }
  }

  const partidas = [];
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i] || [];
    const clave = row[claveIdx]?.toString().trim() || "";
    const desc = row[descIdx]?.toString().trim() || "";
    let asig = (asigIdx !== -1 && row[asigIdx]) ? row[asigIdx].toString().replace(/\r\n/g, ' / ').replace(/\n/g, ' / ').trim() : "";
    
    asig = cleanContractorString(asig);

    if (!clave && !desc) continue;

    let cant = 0;
    if (cantTotalIdx !== -1 && row[cantTotalIdx]) {
      cant = parseInt(row[cantTotalIdx].toString().replace(/,/g, ''), 10) || 0;
    }

    if (desc.toLowerCase().includes("total")) continue; 

    partidas.push({
      codigo: clave,
      tipo_trabajo: desc,
      cantidad_total: cant,
      cantidad_realizada: 0,
      contratista: asig || "Sin asignar",
      fecha_estimada: null,
      imagen_url: null,
      areas_completadas: []
    });
  }

  console.log(`Found ${partidas.length} items for ${projectName}`);

  // We should match the exact project name in DB if it already exists. The user says it's for "Ritz Carlton Branded". 
  // Let's query by "BRANDED" or "BRANDED 2"
  const { data: existing } = await supabase.from('proyecto').select('id, descripcion, partidas_cotizacion').ilike('descripcion', '%BRANDED%');

  if (existing && existing.length > 0) {
    const targetProject = existing[0]; // Assume first match is the right one, usually "RITZ BRANDED" or similar
    console.log(`Found existing project: ${targetProject.descripcion}. Updating partidas...`);
    const currentPartidas = Array.isArray(targetProject.partidas_cotizacion) ? targetProject.partidas_cotizacion : [];
    
    const newPartidas = [...currentPartidas];
    partidas.forEach(p => {
      const matchIdx = newPartidas.findIndex(ep => (ep.codigo === p.codigo && p.codigo !== "") || (ep.tipo_trabajo === p.tipo_trabajo));
      if (matchIdx !== -1) {
        newPartidas[matchIdx].contratista = p.contratista;
        if (p.cantidad_total > 0 && newPartidas[matchIdx].cantidad_total !== p.cantidad_total) {
             newPartidas[matchIdx].cantidad_total = p.cantidad_total;
        }
      } else {
        newPartidas.push(p);
      }
    });

    const { error } = await supabase.from('proyecto').update({ partidas_cotizacion: newPartidas }).eq('id', targetProject.id);
    if (error) console.error("Error updating project:", error);
    else console.log(`Project updated successfully!`);
  } else {
    console.log(`Creating new project ${projectName}...`);
    const { error } = await supabase.from('proyecto').insert({
      id: crypto.randomUUID(),
      descripcion: projectName,
      numero_proyecto: `AUTO-${Math.floor(Math.random() * 10000)}`,
      partidas_cotizacion: partidas,
      estado: 'en proceso'
    });
    if (error) console.error("Error creating project:", error);
    else console.log(`New project created successfully!`);
  }
}

async function run() {
  await processFile('orden 094- 161225 BRANDED 2.xlsx');
  console.log("Ingestion complete.");
}

run();
