import type { TypedSupabaseClient, Tables } from "@/types/database.types";

type Client = TypedSupabaseClient;

export type EmpresaResumen = Tables<"empresas"> & {
  proyectos: { count: number }[];
  usuarios: { count: number }[];
};

export async function listEmpresas(supabase: Client): Promise<Tables<"empresas">[]> {
  const { data, error } = await supabase
    .from("empresas")
    .select("*")
    .is("deleted_at", null)
    .order("nombre", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listSubempresas(
  supabase: Client,
  empresaId?: string,
): Promise<Tables<"subempresas">[]> {
  let query = supabase
    .from("subempresas")
    .select("*")
    .is("deleted_at", null)
    .order("nombre", { ascending: true });

  if (empresaId) query = query.eq("empresa_id", empresaId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export type SubempresaConEmpresa = Tables<"subempresas"> & {
  empresas: Pick<Tables<"empresas">, "nombre"> | null;
};

export async function listSubempresasConEmpresa(
  supabase: Client,
): Promise<SubempresaConEmpresa[]> {
  const { data, error } = await supabase
    .from("subempresas")
    .select("*, empresas:empresa_id (nombre)")
    .is("deleted_at", null)
    .order("nombre", { ascending: true });

  if (error) throw error;
  return (data ?? []) as SubempresaConEmpresa[];
}

export async function getEmpresa(
  supabase: Client,
  id: string,
): Promise<Tables<"empresas"> | null> {
  const { data, error } = await supabase
    .from("empresas")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

// ─── Usuarios (gestión admin) ────────────────────────────────────────────────

export type UsuarioConEmpresa = Tables<"usuarios"> & {
  empresas: Pick<Tables<"empresas">, "nombre"> | null;
  subempresas: Pick<Tables<"subempresas">, "nombre"> | null;
};

export async function listUsuarios(supabase: Client): Promise<UsuarioConEmpresa[]> {
  const { data, error } = await supabase
    .from("usuarios")
    .select("*, empresas:empresa_id (nombre), subempresas:subempresa_id (nombre)")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as UsuarioConEmpresa[];
}

// ─── Conteos globales para el overview de admin ──────────────────────────────

export type AdminStats = {
  totalEmpresas: number;
  totalUsuarios: number;
  usuariosActivos: number;
  proyectosEnCurso: number;
};

export async function getAdminStats(supabase: Client): Promise<AdminStats> {
  const [empresas, usuarios, usuariosActivos, proyectosEnCurso] = await Promise.all([
    supabase.from("empresas").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("usuarios").select("*", { count: "exact", head: true }),
    supabase.from("usuarios").select("*", { count: "exact", head: true }).eq("activo", true),
    supabase
      .from("proyectos")
      .select("*", { count: "exact", head: true })
      .eq("estado", "en_curso")
      .is("deleted_at", null),
  ]);

  return {
    totalEmpresas: empresas.count ?? 0,
    totalUsuarios: usuarios.count ?? 0,
    usuariosActivos: usuariosActivos.count ?? 0,
    proyectosEnCurso: proyectosEnCurso.count ?? 0,
  };
}
