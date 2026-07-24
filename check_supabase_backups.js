import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log("=== CHECKING AUDIT / SYSTEM TABLES ===");
  // List all tables in public schema via rpc or query if possible
  const { data: tables, error: errTables } = await supabase.rpc('get_tables');
  if (errTables) {
    console.log("RPC get_tables failed:", errTables.message);
  } else {
    console.log("Tables:", tables);
  }

  // Check if there is any history table like audit_log, audit, history, project_history
  const possibleAuditTables = ['audit_log', 'audit', 'history', 'logs', 'proyecto_history', 'schema_migrations'];
  for (const t of possibleAuditTables) {
    const { data, error } = await supabase.from(t).select('*').limit(5);
    if (!error) {
      console.log(`FOUND AUDIT TABLE '${t}':`, data);
    }
  }
}

check();
