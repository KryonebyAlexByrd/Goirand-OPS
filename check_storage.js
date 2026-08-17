import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  const { data, error } = await supabase.storage.listBuckets();
  console.log("Buckets:", data ? data.map(b => b.name) : error);
}
check();
