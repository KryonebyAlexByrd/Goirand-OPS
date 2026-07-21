const { createClient } = require('@supabase/supabase-js');

const url = 'https://lhsbdwjvorqjvofzrqfi.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxoc2Jkd2p2b3JxanZvZnpycWZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY5ODE2NywiZXhwIjoyMDk5Mjc0MTY3fQ.K1kCnU2dwp7Ht7yCr2Ybz6hxlyxlxpctz9LH8MERhag';

const supabase = createClient(url, serviceKey);

async function listTables() {
  const { data, error } = await supabase.rpc('get_tables');
  if (error) {
    // Si no hay RPC, probemos hacer fetch directo a postgrest info (openapi)
    const res = await fetch(`${url}/rest/v1/?apikey=${serviceKey}`);
    const json = await res.json();
    console.log("Tables available in PostgREST:", Object.keys(json.definitions));
  } else {
    console.log(data);
  }
}

listTables();
