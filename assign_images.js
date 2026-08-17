import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const sourceDir = "/Users/thephoenyx/Downloads/Goirand/Goirand AI (Base 44)/project images/Branded";
const targetDir = path.join(process.cwd(), "public/images/branded");

async function assignImages() {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 1. Get images sorted by creation time
  const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
  const fileStats = files.map(f => {
    const fullPath = path.join(sourceDir, f);
    return { name: f, path: fullPath, time: fs.statSync(fullPath).birthtimeMs || fs.statSync(fullPath).mtimeMs };
  });
  
  fileStats.sort((a, b) => a.time - b.time); // oldest first (top to bottom)

  console.log(`Found ${fileStats.length} images.`);

  // 2. Fetch project
  const { data, error } = await supabase
    .from('proyecto')
    .select('id, partidas_cotizacion')
    .ilike('descripcion', '%branded%')
    .limit(1);

  if (error || !data.length) {
    console.error("Error fetching project");
    return;
  }

  const p = data[0];
  let partidas = p.partidas_cotizacion || [];
  
  let imgIndex = 0;
  let currentImgUrl = null;

  // 3. Assign images
  partidas = partidas.map((pt) => {
    if (!pt.codigo.includes('-SUB')) {
      // Main item gets the next image
      if (imgIndex < fileStats.length) {
        const file = fileStats[imgIndex];
        const newName = `img_${String(imgIndex + 1).padStart(2, '0')}.png`;
        const newPath = path.join(targetDir, newName);
        fs.copyFileSync(file.path, newPath);
        currentImgUrl = `/images/branded/${newName}`;
        imgIndex++;
      }
    }
    // SUB items get the same image as the previous Main item
    return {
      ...pt,
      imagen_url: currentImgUrl
    };
  });

  // 4. Update Supabase
  await supabase.from('proyecto').update({ partidas_cotizacion: partidas }).eq('id', p.id);
  
  console.log(`Successfully assigned ${imgIndex} images to ${partidas.length} total items.`);
}

assignImages();
