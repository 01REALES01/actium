import type { TypedSupabaseClient, Tables } from "@/types/database.types";

type Client = TypedSupabaseClient;

export async function listProyectos(supabase: Client): Promise<Tables<"proyectos">[]> {
  const { data, error } = await supabase
    .from("proyectos")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getProyecto(
  supabase: Client,
  id: string,
): Promise<Tables<"proyectos"> | null> {
  const { data, error } = await supabase
    .from("proyectos")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function getProyectoAvances(
  supabase: Client,
  proyectoId: string,
): Promise<Tables<"proyecto_avances">[]> {
  const { data, error } = await supabase
    .from("proyecto_avances")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("fecha", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getProyectoResumen(
  supabase: Client,
  proyectoId: string,
): Promise<Tables<"vw_proyecto_resumen"> | null> {
  const { data, error } = await supabase
    .from("vw_proyecto_resumen")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

export async function listProyectosResumen(
  supabase: Client,
): Promise<Tables<"vw_proyecto_resumen">[]> {
  const { data, error } = await supabase
    .from("vw_proyecto_resumen")
    .select("*")
    .order("nombre", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

