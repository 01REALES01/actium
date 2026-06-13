import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";

/**
 * Cliente con la llave `service_role`. SALTA RLS por completo.
 *
 * Reglas de uso:
 * - SOLO en Server Actions / route handlers, nunca en componentes cliente.
 * - Nunca exponer la llave con prefijo NEXT_PUBLIC_.
 * - Toda acción que lo use debe verificar permisos (super_admin) ANTES de llamarlo.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no está configurada. Añádela a .env.local.",
    );
  }

  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
