import type { TypedSupabaseClient, Tables, FormularioTipo, FormularioEstado } from "@/types/database.types";

type Client = TypedSupabaseClient;

export async function listIncidentes(
  supabase: Client,
  proyectoId: string,
): Promise<Tables<"incidentes">[]> {
  const { data, error } = await supabase
    .from("incidentes")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("fecha", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getEmpleadosPorSubempresa(
  supabase: Client,
  subempresaId: string,
): Promise<Tables<"empleados">[]> {
  const { data, error } = await supabase
    .from("empleados")
    .select("*")
    .eq("subempresa_id", subempresaId)
    .is("deleted_at", null)
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listFormularios(
  supabase: Client,
  filtros?: { proyecto_id?: string; tipo?: FormularioTipo; estado?: FormularioEstado },
): Promise<Tables<"formularios">[]> {
  let query = supabase
    .from("formularios")
    .select("*")
    .order("created_at", { ascending: false });

  if (filtros?.proyecto_id) query = query.eq("proyecto_id", filtros.proyecto_id);
  if (filtros?.tipo) query = query.eq("tipo", filtros.tipo);
  if (filtros?.estado) query = query.eq("estado", filtros.estado);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
