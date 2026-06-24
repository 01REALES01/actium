import { createClient } from "@/lib/supabase/server";
import {
  getPerfilActual,
  esSuperAdmin,
  puedeCrearFormularioSST,
  type PerfilUsuario,
} from "@/lib/auth/roles";
import type { TypedSupabaseClient } from "@/types/database.types";

/**
 * Guardas de escritura para Server Actions.
 *
 * Por pedido del cliente, solo `super_admin` puede ingresar información. Varias
 * acciones escriben con `createAdminClient()` (service-role), que BYPASSA la RLS,
 * por lo que esta verificación en servidor es el único candado de esos caminos.
 * Se complementa con la RLS/RPC para los caminos que sí usan el JWT del usuario.
 *
 * Devuelven el cliente con el JWT del usuario y su perfil ya resuelto, para que
 * la acción reutilice ambos sin volver a consultarlos.
 */

export type GuardResult = { supabase: TypedSupabaseClient; perfil: PerfilUsuario };

async function resolverPerfil(): Promise<GuardResult> {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!perfil) {
    throw new Error("No autenticado.");
  }
  return { supabase, perfil };
}

/** Exige `super_admin`. Úsese al inicio de toda acción de escritura. */
export async function assertSuperAdmin(): Promise<GuardResult> {
  const result = await resolverPerfil();
  if (!esSuperAdmin(result.perfil.rol)) {
    throw new Error("No tiene permisos para esta acción.");
  }
  return result;
}

/**
 * Exige permiso para diligenciar permisos SST (ATS, altura, caliente).
 * Única excepción al bloqueo super_admin: el rol `sst` también puede.
 * El alcance por empresa/proyecto del rol `sst` lo garantiza la RLS.
 */
export async function assertPuedeCrearFormularioSST(): Promise<GuardResult> {
  const result = await resolverPerfil();
  if (!puedeCrearFormularioSST(result.perfil.rol)) {
    throw new Error("No tiene permisos para diligenciar permisos SST.");
  }
  return result;
}
