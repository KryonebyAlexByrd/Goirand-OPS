const { createClient } = require('@supabase/supabase-js');

const url = 'https://lhsbdwjvorqjvofzrqfi.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxoc2Jkd2p2b3JxanZvZnpycWZpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MzY5ODE2NywiZXhwIjoyMDk5Mjc0MTY3fQ.K1kCnU2dwp7Ht7yCr2Ybz6hxlyxlxpctz9LH8MERhag';

const supabase = createClient(url, serviceKey);

async function createAdmin() {
  const { data, error } = await supabase.auth.admin.createUser({
    email: 'admin@goirand.com',
    password: 'password123',
    email_confirm: true,
    user_metadata: {
      role: 'admin',
      nombre: 'Administrador'
    }
  });

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Usuario creado exitosamente:', data.user.email);
  }
}

createAdmin();
