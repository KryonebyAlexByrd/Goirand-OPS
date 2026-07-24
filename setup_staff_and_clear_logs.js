import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

const staffList = [
  // Tableros
  { nombre: "Fernando", area: "Tableros", email: "fernando@goirand.local" },
  { nombre: "Víctor (Tableros)", area: "Tableros", email: "victor.tableros@goirand.local" },
  
  // Armado
  { nombre: "Abraham", area: "Armado", email: "abraham@goirand.local" },
  { nombre: "Luis", area: "Armado", email: "luis@goirand.local" },
  
  // Pulido
  { nombre: "Jennifer", area: "Pulido", email: "jennifer@goirand.local" },
  { nombre: "Mónica", area: "Pulido", email: "monica@goirand.local" },
  
  // Barniz
  { nombre: "Matilde", area: "Barniz", email: "matilde@goirand.local" },
  { nombre: "Alejandra", area: "Barniz", email: "alejandra@goirand.local" },
  { nombre: "Eduardo", area: "Barniz", email: "eduardo@goirand.local" },
  
  // Herraje
  { nombre: "Carlos", area: "Herraje", email: "carlos@goirand.local" },
  { nombre: "Edgar", area: "Herraje", email: "edgar@goirand.local" },
  
  // Empaque
  { nombre: "Víctor (Empaque)", area: "Empaque", email: "victor.empaque@goirand.local" },
  { nombre: "Josmar", area: "Empaque", email: "josmar@goirand.local" }
];

async function run() {
  console.log("=== 1. VACIANO REGISTROS DE TRABAJO ===");
  // Eliminar todos los registros de la tabla registro_trabajo usando neq id '0' o delete sin filtro si RLS está deshabilitado
  const { error: errDelLogs } = await supabase.from('registro_trabajo').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (errDelLogs) console.error("Error vaciando registro_trabajo:", errDelLogs);
  else console.log("✔ Todos los registros de trabajo han sido eliminados.");

  console.log("\n=== 2. CREANDO / ACTUALIZANDO ENCARGADOS Y CUENTAS ===");
  
  for (const s of staffList) {
    try {
      // 1. Crear usuario Auth
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: s.email,
        password: "GoirandPass2026!",
        email_confirm: true,
        user_metadata: { full_name: s.nombre, role: 'user' }
      });

      let userId;
      if (authErr) {
        if (authErr.message.includes("already been registered")) {
          // Si ya existe, buscar su ID
          const { data: users } = await supabase.auth.admin.listUsers();
          const found = users.users.find(u => u.email === s.email);
          userId = found?.id;
          console.log(`- Usuario ${s.nombre} (${s.email}) ya existía. ID: ${userId}`);
        } else {
          console.error(`- Error creando Auth para ${s.nombre}:`, authErr.message);
          continue;
        }
      } else {
        userId = authData.user.id;
        console.log(`+ Creado usuario Auth para ${s.nombre} (${s.email})`);
      }

      if (userId) {
        // 2. Crear/Upsert en perfil_encargado
        const { error: profileErr } = await supabase.from('perfil_encargado').upsert({
          id: userId,
          nombre: s.nombre,
          area_principal: s.area
        });
        if (profileErr) console.error(`  Error perfil_encargado para ${s.nombre}:`, profileErr.message);
        else console.log(`  ✔ Perfil de Encargado configurado (${s.area})`);

        // 3. Crear/Upsert en trabajador
        const { error: trabErr } = await supabase.from('trabajador').upsert({
          id: 'id_trb_' + userId.substr(0, 15),
          nombre: s.nombre,
          area: s.area,
          user_email: s.email,
          puesto: `Encargado de ${s.area}`,
          fabrica: "Tecomatla",
          activo: true
        });
        if (trabErr) console.error(`  Error trabajador para ${s.nombre}:`, trabErr.message);
        else console.log(`  ✔ Registro de Trabajador configurado (${s.area})`);
      }
    } catch (e) {
      console.error(`Error procesando ${s.nombre}:`, e);
    }
  }

  console.log("\n=== PROCESO FINALIZADO EXITOSAMENTE ===");
}

run();
