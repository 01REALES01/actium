// =============================================================================
// ACTIUM | Bootstrap del primer super admin (one-off)
// =============================================================================
// Crea un unico usuario super_admin real en un proyecto Supabase VIRGEN.
// El trigger `handle_new_user` (migracion 20260509000008) crea automaticamente
// la fila en public.usuarios leyendo el user_metadata enviado aqui.
//
// Uso (PowerShell), con las variables del proyecto de PRODUCCION cargadas:
//
//   $env:NEXT_PUBLIC_SUPABASE_URL   = "https://<ref>.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY  = "<service_role_key>"
//   $env:SUPERADMIN_EMAIL           = "admin@tudominio.com"
//   $env:SUPERADMIN_PASSWORD        = "<password_fuerte>"
//   $env:SUPERADMIN_NOMBRE          = "Nombre Apellido"   # opcional
//   node scripts/create-superadmin.mjs
//
// Tambien lee un .env.local / .env.production.local si existe (via --env-file
// de Node >= 20). Ejecutar UNA sola vez.
// =============================================================================

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SUPERADMIN_EMAIL;
const password = process.env.SUPERADMIN_PASSWORD;
const nombre = process.env.SUPERADMIN_NOMBRE || "Super Admin";

function fail(msg) {
  console.error(`\n[error] ${msg}\n`);
  process.exit(1);
}

if (!url) fail("Falta NEXT_PUBLIC_SUPABASE_URL.");
if (!serviceKey) fail("Falta SUPABASE_SERVICE_ROLE_KEY (llave service_role del proyecto prod).");
if (!email) fail("Falta SUPERADMIN_EMAIL.");
if (!password) fail("Falta SUPERADMIN_PASSWORD.");
if (password.length < 8) fail("SUPERADMIN_PASSWORD debe tener al menos 8 caracteres.");

// Salvaguarda: confirmar a que proyecto se apunta antes de escribir.
const ref = (() => {
  try {
    return new URL(url).hostname.split(".")[0];
  } catch {
    return "(desconocido)";
  }
})();

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log(`\nProyecto destino: ${ref}  (${url})`);
console.log(`Creando super_admin: ${email} ("${nombre}")...\n`);

const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  // empresa_id se omite a proposito: super_admin es global (empresa_id = NULL).
  user_metadata: { rol: "super_admin", nombre },
});

if (error) {
  if (/already.*registered|already been registered|duplicate/i.test(error.message)) {
    fail(`Ya existe un usuario con el email ${email}. El bootstrap es de un solo uso.`);
  }
  fail(`No fue posible crear el usuario: ${error.message}`);
}

const userId = data.user?.id;
console.log(`[ok] Usuario auth creado: ${userId}`);

// Verificar que el trigger creo el perfil con rol super_admin.
const { data: perfil, error: perfilError } = await admin
  .from("usuarios")
  .select("id, email, rol, empresa_id, subempresa_id, activo")
  .eq("id", userId)
  .single();

if (perfilError) {
  fail(
    `El usuario auth se creo pero no se pudo verificar public.usuarios: ${perfilError.message}. ` +
      "Revisa que las migraciones (trigger handle_new_user) esten aplicadas.",
  );
}

if (perfil.rol !== "super_admin") {
  fail(`El perfil se creo con rol "${perfil.rol}" en lugar de "super_admin". Revisa el trigger.`);
}

console.log("[ok] Perfil en public.usuarios:");
console.log(perfil);
console.log("\nSuper admin listo. Inicia sesion en la app con ese email y password.\n");
