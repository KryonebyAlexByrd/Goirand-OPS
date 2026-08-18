import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const missing = ['Tecomatla', 'Chava', 'Paco', 'Galicia', 'Compras', 'Tlahuac'];
  const { data: current } = await supabase.from('contratista').select('nombre');
  const currentNames = current.map(c => c.nombre.toLowerCase());
  
  const toInsert = missing
    .filter(m => !currentNames.includes(m.toLowerCase()))
    .map(m => ({ id: crypto.randomUUID(), nombre: m }));
  
  if (toInsert.length > 0) {
    const { error } = await supabase.from('contratista').insert(toInsert);
    if (error) console.error(error);
    else console.log('Successfully inserted:', toInsert.map(i => i.nombre));
  } else {
    console.log('All missing contractors already in DB');
  }
}

run();
