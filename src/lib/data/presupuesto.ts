import type { TypedSupabaseClient, Tables } from "@/types/database.types";

type Client = TypedSupabaseClient;

export async function getRubrosBalance(
  supabase: Client,
  proyectoId: string,
): Promise<Tables<"vw_rubro_balance">[]> {
  const { data, error } = await supabase
    .from("vw_rubro_balance")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("nombre", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listMovimientos(
  supabase: Client,
  proyectoId: string,
): Promise<Tables<"movimientos">[]> {
  const { data, error } = await supabase
    .from("movimientos")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

