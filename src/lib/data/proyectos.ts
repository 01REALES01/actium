import type { TypedSupabaseClient, Tables } from "@/types/database.types";

type Client = TypedSupabaseClient;

export type ObservacionConAutor = Tables<"observaciones"> & {
  usuarios: Pick<Tables<"usuarios">, "nombre" | "cargo"> | null;
};

export type FotoConUrl = Tables<"fotos"> & {
  signedUrl: string | null;
};

export async function listProyectos(supabase: Client): Promise<Tables<"proyectos">[]> {
  const { data, error } = await supabase
    .from("proyectos")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

/**
 * Lista los proyectos archivados (deleted_at NO nulo). La política RLS de SELECT
 * oculta los archivados, por lo que el llamador debe pasar un cliente admin
 * (service role). Úsese solo en contextos ya restringidos a super_admin.
 */
export async function listProyectosArchivados(supabase: Client): Promise<Tables<"proyectos">[]> {
  const { data, error } = await supabase
    .from("proyectos")
    .select("*")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

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

export async function getProyectoMetas(
  supabase: Client,
  proyectoId: string,
): Promise<Tables<"proyecto_metas">[]> {
  const { data, error } = await supabase
    .from("proyecto_metas")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("fecha", { ascending: true });

  if (error) {
    console.error("Error getProyectoMetas:", error);
    return [];
  }
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

export async function getObservaciones(
  supabase: Client,
  proyectoId: string,
): Promise<ObservacionConAutor[]> {
  const { data, error } = await supabase
    .from("observaciones")
    .select("*, usuarios:autor_id (nombre, cargo)")
    .eq("proyecto_id", proyectoId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as ObservacionConAutor[];
}

export async function getFotos(
  supabase: Client,
  proyectoId: string,
): Promise<FotoConUrl[]> {
  const { data, error } = await supabase
    .from("fotos")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("uploaded_at", { ascending: false })
    .limit(8);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const fotosConUrl = await Promise.all(
    data.map(async (foto) => {
      try {
        const { data: urlData } = await supabase.storage
          .from("fotos-proyectos")
          .createSignedUrl(foto.storage_path, 3600);
        return { ...foto, signedUrl: urlData?.signedUrl ?? null };
      } catch {
        return { ...foto, signedUrl: null };
      }
    }),
  );

  return fotosConUrl;
}

