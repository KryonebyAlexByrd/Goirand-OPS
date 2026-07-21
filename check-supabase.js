const url = 'https://lhsbdwjvorqjvofzrqfi.supabase.co/rest/v1/';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxoc2Jkd2p2b3JxanZvZnpycWZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY5ODE2NywiZXhwIjoyMDk5Mjc0MTY3fQ.K1kCnU2dwp7Ht7yCr2Ybz6hxlyxlxpctz9LH8MERhag';

async function listTables() {
  try {
    // We can list tables by querying the OpenAPI spec or pg_meta if accessible
    // A simple way to get tables via REST is querying the openapi.json
    const res = await fetch(url + '?apikey=' + key);
    const json = await res.json();
    console.log("Tables available:");
    console.log(Object.keys(json.definitions || {}).join(", "));
  } catch (err) {
    console.error(err);
  }
}

listTables();
