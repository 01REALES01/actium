import type { TypedSupabaseClient, Tables } from "@/types/database.types";

type Client = TypedSupabaseClient;

export type Proveedor = Pick<Tables<"proveedores">, "id" | "nombre" | "nit">;

export async function listProveedores(supabase: Client): Promise<Proveedor[]> {
  const { data, error } = await supabase
    .from("proveedores")
    .select("id, nombre, nit")
    .is("deleted_at", null)
    .order("nombre");

  if (error) throw error;
  return data ?? [];
}
