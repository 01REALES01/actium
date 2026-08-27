// Capa de lectura del módulo Inventario (Herramientas y EPP). Funciones puras
// que reciben el cliente Supabase ya autenticado, molde src/lib/data/cxc.ts.
// Filtrado y ordenamiento se resuelven en la query, no en memoria.

import type { TypedSupabaseClient, Tables } from "@/types/database.types";
import {
  type EstadoHerramientaFiltro,
} from "@/constants/inventario";

type Client = TypedSupabaseClient;

export type CatalogoConDisponibilidad = Tables<"vw_herramientas_disponibilidad">;

export type UnidadConMovimientoAbierto = Tables<"herramienta_unidades"> & {
  proyectos: Pick<Tables<"proyectos">, "nombre" | "empresa_id"> | null;
};

export type MovimientoConRelaciones = Tables<"herramienta_movimientos"> & {
  proyectos: Pick<Tables<"proyectos">, "nombre"> | null;
  responsable: Pick<Tables<"usuarios">, "nombre"> | null;
};

export type ProyectoConEmpresa = Pick<Tables<"proyectos">, "id" | "nombre" | "empresa_id"> & {
  empresas: Pick<Tables<"empresas">, "nombre"> | null;
};

export type EppSaldoRow = Tables<"vw_epp_saldos">;

// ─── Herramientas ──────────────────────────────────────────────────────────

export async function listCatalogoHerramientas(
  supabase: Client,
  opts: { estado?: EstadoHerramientaFiltro; busqueda?: string } = {},
): Promise<CatalogoConDisponibilidad[]> {
  let query = supabase.from("vw_herramientas_disponibilidad").select("*");

  if (opts.busqueda) query = query.ilike("nombre", `%${opts.busqueda}%`);

  const { data, error } = await query.order("nombre", { ascending: true });
  if (error) throw error;

  const rows = data ?? [];
  if (!opts.estado || opts.estado === "todas") return rows;

  return rows.filter((r) => {
    if (opts.estado === "disponibles") return (r.disponibles ?? 0) > 0;
    if (opts.estado === "asignadas") return (r.asignadas ?? 0) > 0;
    if (opts.estado === "mantenimiento") return (r.en_mantenimiento ?? 0) > 0;
    if (opts.estado === "fuera_de_servicio") return (r.fuera_de_servicio ?? 0) > 0;
    return true;
  });
}

export async function getHerramientasResumen(
  supabase: Client,
): Promise<{ tipos: number; unidadesTotal: number; disponibles: number; asignadas: number; enMantenimiento: number }> {
  const { data, error } = await supabase.from("vw_herramientas_disponibilidad").select("*");
  if (error) throw error;

  const rows = data ?? [];
  return {
    tipos: rows.length,
    unidadesTotal: rows.reduce((acc, r) => acc + (r.total ?? 0), 0),
    disponibles: rows.reduce((acc, r) => acc + (r.disponibles ?? 0), 0),
    asignadas: rows.reduce((acc, r) => acc + (r.asignadas ?? 0), 0),
    enMantenimiento: rows.reduce((acc, r) => acc + (r.en_mantenimiento ?? 0), 0),
  };
}

export async function getCatalogo(
  supabase: Client,
  catalogoId: string,
): Promise<Tables<"herramientas_catalogo"> | null> {
  const { data, error } = await supabase
    .from("herramientas_catalogo")
    .select("*")
    .eq("id", catalogoId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listUnidadesCatalogo(
  supabase: Client,
  catalogoId: string,
): Promise<UnidadConMovimientoAbierto[]> {
  const { data, error } = await supabase
    .from("herramienta_unidades")
    .select("*, proyectos:proyecto_id (nombre, empresa_id)")
    .eq("catalogo_id", catalogoId)
    .is("deleted_at", null)
    .order("codigo", { ascending: true });

  if (error) throw error;
  return (data ?? []) as UnidadConMovimientoAbierto[];
}

export async function getUnidad(
  supabase: Client,
  unidadId: string,
): Promise<UnidadConMovimientoAbierto | null> {
  const { data, error } = await supabase
    .from("herramienta_unidades")
    .select("*, proyectos:proyecto_id (nombre, empresa_id)")
    .eq("id", unidadId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw error;
  return data as UnidadConMovimientoAbierto | null;
}

export async function listMovimientosUnidad(
  supabase: Client,
  unidadId: string,
): Promise<MovimientoConRelaciones[]> {
  const { data, error } = await supabase
    .from("herramienta_movimientos")
    .select("*, proyectos:proyecto_id (nombre), responsable:responsable_id (nombre)")
    .eq("unidad_id", unidadId)
    .order("fecha_salida", { ascending: false });

  if (error) throw error;
  return (data ?? []) as MovimientoConRelaciones[];
}

/** Proyectos activos de todas las empresas, para el selector de asignación. */
export async function listProyectosAsignables(supabase: Client): Promise<ProyectoConEmpresa[]> {
  const { data, error } = await supabase
    .from("proyectos")
    .select("id, nombre, empresa_id, empresas:empresa_id (nombre)")
    .is("deleted_at", null)
    .order("nombre", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as ProyectoConEmpresa[];
}

// ─── EPP ───────────────────────────────────────────────────────────────────

/** Proyectos que ya tienen al menos un ítem de inventario de EPP, con su saldo agregado. */
export async function listProyectosConEpp(
  supabase: Client,
): Promise<{ proyecto: ProyectoConEmpresa; itemsBajoMinimo: number; totalItems: number }[]> {
  const [{ data: proyectos, error: errProyectos }, { data: saldos, error: errSaldos }] = await Promise.all([
    supabase
      .from("proyectos")
      .select("id, nombre, empresa_id, empresas:empresa_id (nombre)")
      .is("deleted_at", null)
      .order("nombre", { ascending: true }),
    supabase.from("vw_epp_saldos").select("proyecto_id, bajo_minimo"),
  ]);

  if (errProyectos) throw errProyectos;
  if (errSaldos) throw errSaldos;

  const porProyecto = new Map<string, { total: number; bajoMinimo: number }>();
  for (const s of saldos ?? []) {
    if (!s.proyecto_id) continue;
    const actual = porProyecto.get(s.proyecto_id) ?? { total: 0, bajoMinimo: 0 };
    actual.total += 1;
    if (s.bajo_minimo) actual.bajoMinimo += 1;
    porProyecto.set(s.proyecto_id, actual);
  }

  // Se listan TODOS los proyectos activos, no solo los que ya tienen ítems: el
  // cliente debe poder entrar a cualquier proyecto y empezar a alimentar su
  // inventario de EPP desde cero.
  return (proyectos ?? []).map((p) => {
    const agregado = porProyecto.get(p.id) ?? { total: 0, bajoMinimo: 0 };
    return {
      proyecto: p as unknown as ProyectoConEmpresa,
      totalItems: agregado.total,
      itemsBajoMinimo: agregado.bajoMinimo,
    };
  });
}

export async function listEppProyecto(supabase: Client, proyectoId: string): Promise<EppSaldoRow[]> {
  const { data, error } = await supabase
    .from("vw_epp_saldos")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("nombre", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getEppResumen(
  supabase: Client,
  proyectoId: string,
): Promise<{ totalItems: number; bajoMinimo: number; saldoTotal: number }> {
  const rows = await listEppProyecto(supabase, proyectoId);
  return {
    totalItems: rows.length,
    bajoMinimo: rows.filter((r) => r.bajo_minimo).length,
    saldoTotal: rows.reduce((acc, r) => acc + (r.saldo ?? 0), 0),
  };
}

export async function listMovimientosEpp(
  supabase: Client,
  inventarioId: string,
): Promise<Tables<"epp_movimientos">[]> {
  const { data, error } = await supabase
    .from("epp_movimientos")
    .select("*")
    .eq("inventario_id", inventarioId)
    .order("fecha", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getProyectoNombre(
  supabase: Client,
  proyectoId: string,
): Promise<ProyectoConEmpresa | null> {
  const { data, error } = await supabase
    .from("proyectos")
    .select("id, nombre, empresa_id, empresas:empresa_id (nombre)")
    .eq("id", proyectoId)
    .maybeSingle();

  if (error) throw error;
  return data as unknown as ProyectoConEmpresa | null;
}
