import type { TypedSupabaseClient, Tables, AusentismoTipo, IncidenteTipo, IncidenteSeveridad } from "@/types/database.types";
import { rangoDiaLocal } from "@/lib/fecha";

type Client = TypedSupabaseClient;

// ─── Tipos ────────────────────────────────────────────────────────────────────

/** Fila de la cabecera del parte. */
export type ParteDiario = {
  id: string;
  empresa_id: string;
  subempresa_id: string | null;
  proyecto_id: string;
  fecha: string;
  total_programado: number;
  presentes: number;
  observaciones: string | null;
  registrado_por: string | null;
  created_at: string;
  updated_at: string;
};

export type RosterEmpleado = Pick<
  Tables<"empleados">,
  "id" | "nombre" | "cargo" | "arl" | "eps"
>;

export type InasistenciaDia = {
  id: string;
  empleado_id: string;
  tipo: AusentismoTipo;
  razon: string;
  nombre: string | null;
  cargo: string | null;
};

export type EventoDia = {
  id: string;
  empleado_id: string | null;
  tipo: IncidenteTipo;
  severidad: IncidenteSeveridad;
  descripcion: string;
  acciones_tomadas: string | null;
  nombre: string | null;
  cargo: string | null;
};

export type ParteDelDia = {
  proyectoId: string;
  proyectoNombre: string;
  fecha: string;
  parte: ParteDiario | null;
  roster: RosterEmpleado[];
  inasistencias: InasistenciaDia[];
  incidentes: EventoDia[];
  /** presentes derivado (si no hay parte aún, programado − inasistencias del día). */
  presentes: number;
  programado: number;
};

export type ParteResumen = {
  proyecto_id: string;
  proyecto_nombre: string;
  fecha: string;
  total_programado: number;
  presentes: number;
  ausentes: number;
  incidentes: number;
  accidentes: number;
};

export type FotoDia = {
  id: string;
  descripcion: string | null;
  signedUrl: string | null;
  uploaded_at: string;
};

export type ObservacionDia = {
  id: string;
  contenido: string;
  importante: boolean;
  created_at: string;
  autor: string | null;
};

export type AvanceDia = {
  real: number;
  proyectado: number;
  notas: string | null;
} | null;

/** Parte del día + todo el contexto de esa fecha (fotos, observaciones, avance). */
export type ParteCockpit = ParteDelDia & {
  fotos: FotoDia[];
  observaciones: ObservacionDia[];
  avance: AvanceDia;
};

// ─── Roster (personal asignado a la obra) ────────────────────────────────────

export async function getRosterProyecto(
  supabase: Client,
  proyectoId: string,
): Promise<RosterEmpleado[]> {
  const { data: asignaciones, error } = await supabase
    .from("empleado_proyectos")
    .select("empleado_id")
    .eq("proyecto_id", proyectoId)
    .is("retirado_at", null);

  if (error) throw error;
  const ids = (asignaciones ?? []).map((a) => a.empleado_id);
  if (ids.length === 0) return [];

  const { data: empleados, error: errEmp } = await supabase
    .from("empleados")
    .select("id, nombre, cargo, arl, eps")
    .in("id", ids)
    .eq("activo", true)
    .order("nombre", { ascending: true });

  if (errEmp) throw errEmp;
  return (empleados ?? []) as RosterEmpleado[];
}

// ─── Parte de un día concreto (cabecera + detalle cruzado por fecha) ──────────

export async function getParteDelDia(
  supabase: Client,
  proyectoId: string,
  fecha: string, // YYYY-MM-DD
): Promise<ParteDelDia | null> {
  const { data: proyecto, error: errProy } = await supabase
    .from("proyectos")
    .select("nombre")
    .eq("id", proyectoId)
    .maybeSingle();

  if (errProy) throw errProy;
  if (!proyecto) return null;

  const [parteRes, rosterRes, ausRes, incRes] = await Promise.all([
    supabase
      .from("partes_diarios_sst")
      .select("*")
      .eq("proyecto_id", proyectoId)
      .eq("fecha", fecha)
      .maybeSingle(),
    getRosterProyecto(supabase, proyectoId),
    supabase
      .from("ausentismos")
      .select(`id, empleado_id, tipo, razon, empleados:empleado_id ( nombre, cargo )`)
      .eq("proyecto_id", proyectoId)
      .lte("fecha_inicio", fecha)
      .gte("fecha_fin", fecha),
    supabase
      .from("incidentes")
      .select(`id, empleado_id, tipo, severidad, descripcion, acciones_tomadas, empleados:empleado_id ( nombre, cargo )`)
      .eq("proyecto_id", proyectoId)
      .gte("fecha", rangoDiaLocal(fecha).start)
      .lte("fecha", rangoDiaLocal(fecha).end),
  ]);

  const parte = (parteRes.data ?? null) as ParteDiario | null;
  const roster = rosterRes;

  const inasistencias: InasistenciaDia[] = ((ausRes.data ?? []) as any[]).map((a) => ({
    id: a.id,
    empleado_id: a.empleado_id,
    tipo: a.tipo,
    razon: a.razon,
    nombre: a.empleados?.nombre ?? null,
    cargo: a.empleados?.cargo ?? null,
  }));

  const incidentes: EventoDia[] = ((incRes.data ?? []) as any[]).map((i) => ({
    id: i.id,
    empleado_id: i.empleado_id,
    tipo: i.tipo,
    severidad: i.severidad,
    descripcion: i.descripcion,
    acciones_tomadas: i.acciones_tomadas,
    nombre: i.empleados?.nombre ?? null,
    cargo: i.empleados?.cargo ?? null,
  }));

  const programado = parte?.total_programado ?? roster.length;
  const presentes = parte
    ? parte.presentes
    : Math.max(0, roster.length - inasistencias.length);

  return {
    proyectoId,
    proyectoNombre: (proyecto as { nombre: string }).nombre,
    fecha,
    parte,
    roster,
    inasistencias,
    incidentes,
    presentes,
    programado,
  };
}

// ─── Parte del día + contexto completo (cockpit del proyecto) ─────────────────

export async function getParteCockpitDelDia(
  supabase: Client,
  proyectoId: string,
  fecha: string,
): Promise<ParteCockpit | null> {
  const base = await getParteDelDia(supabase, proyectoId, fecha);
  if (!base) return null;

  const { start, end } = rangoDiaLocal(fecha);

  const [fotosRes, obsRes, avanceRes] = await Promise.all([
    supabase
      .from("fotos")
      .select("id, descripcion, storage_path, uploaded_at")
      .eq("proyecto_id", proyectoId)
      .gte("uploaded_at", start)
      .lte("uploaded_at", end)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("observaciones")
      .select("id, contenido, importante, created_at, usuarios:autor_id ( nombre )")
      .eq("proyecto_id", proyectoId)
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false }),
    supabase
      .from("proyecto_avances")
      .select("avance_real, avance_proyectado, notas")
      .eq("proyecto_id", proyectoId)
      .eq("fecha", fecha)
      .maybeSingle(),
  ]);

  const fotos: FotoDia[] = await Promise.all(
    ((fotosRes.data ?? []) as any[]).map(async (f) => {
      let signedUrl: string | null = null;
      try {
        const { data } = await supabase.storage
          .from("fotos-proyectos")
          .createSignedUrl(f.storage_path, 3600);
        signedUrl = data?.signedUrl ?? null;
      } catch {
        signedUrl = null;
      }
      return { id: f.id, descripcion: f.descripcion, signedUrl, uploaded_at: f.uploaded_at };
    }),
  );

  const observaciones: ObservacionDia[] = ((obsRes.data ?? []) as any[]).map((o) => ({
    id: o.id,
    contenido: o.contenido,
    importante: o.importante,
    created_at: o.created_at,
    autor: o.usuarios?.nombre ?? null,
  }));

  const avance: AvanceDia = avanceRes.data
    ? {
        real: Number((avanceRes.data as any).avance_real),
        proyectado: Number((avanceRes.data as any).avance_proyectado),
        notas: (avanceRes.data as any).notas ?? null,
      }
    : null;

  return { ...base, fotos, observaciones, avance };
}

// ─── Historial de partes (bitácora) ──────────────────────────────────────────

export async function listPartes(
  supabase: Client,
  filtros?: { proyectoId?: string; desde?: string; hasta?: string },
): Promise<ParteResumen[]> {
  let query = supabase
    .from("partes_diarios_sst")
    .select(`id, proyecto_id, fecha, total_programado, presentes, proyectos:proyecto_id ( nombre )`)
    .order("fecha", { ascending: false });

  if (filtros?.proyectoId) query = query.eq("proyecto_id", filtros.proyectoId);
  if (filtros?.desde) query = query.gte("fecha", filtros.desde);
  if (filtros?.hasta) query = query.lte("fecha", filtros.hasta);

  const { data: partes, error } = await query;
  if (error) {
    // La tabla aún no existe (migración no aplicada): degradar a vacío en vez
    // de romper la bitácora/el calendario. 42P01 = undefined_table (Postgres),
    // PGRST205 = relación no encontrada en el caché de esquema (PostgREST).
    if (error.code === "42P01" || error.code === "PGRST205") return [];
    throw error;
  }

  const rows = (partes ?? []) as any[];
  if (rows.length === 0) return [];

  // Cruzar conteos de inasistencias e incidentes por (proyecto, fecha).
  const proyectoIds = Array.from(new Set(rows.map((r) => r.proyecto_id)));
  const fechas = rows.map((r) => r.fecha);
  const minFecha = fechas.reduce((a, b) => (a < b ? a : b));
  const maxFecha = fechas.reduce((a, b) => (a > b ? a : b));

  const [ausRes, incRes] = await Promise.all([
    supabase
      .from("ausentismos")
      .select("proyecto_id, fecha_inicio, fecha_fin")
      .in("proyecto_id", proyectoIds)
      .lte("fecha_inicio", maxFecha)
      .gte("fecha_fin", minFecha),
    supabase
      .from("incidentes")
      .select("proyecto_id, tipo, fecha")
      .in("proyecto_id", proyectoIds)
      .gte("fecha", `${minFecha}T00:00:00`)
      .lte("fecha", `${maxFecha}T23:59:59`),
  ]);

  const ausencias = (ausRes.data ?? []) as any[];
  const eventos = (incRes.data ?? []) as any[];

  return rows.map((r) => {
    const ausentes = ausencias.filter(
      (a) => a.proyecto_id === r.proyecto_id && a.fecha_inicio <= r.fecha && a.fecha_fin >= r.fecha,
    ).length;
    const eventosDia = eventos.filter(
      (e) => e.proyecto_id === r.proyecto_id && (e.fecha as string).slice(0, 10) === r.fecha,
    );
    return {
      proyecto_id: r.proyecto_id,
      proyecto_nombre: r.proyectos?.nombre ?? "Proyecto",
      fecha: r.fecha,
      total_programado: r.total_programado,
      presentes: r.presentes,
      ausentes,
      incidentes: eventosDia.filter((e) => e.tipo !== "accidente").length,
      accidentes: eventosDia.filter((e) => e.tipo === "accidente").length,
    };
  });
}
