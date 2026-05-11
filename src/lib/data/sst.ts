import type { TypedSupabaseClient, Tables, FormularioTipo, FormularioEstado, AusentismoTipo, DocumentoEmpleadoTipo } from "@/types/database.types";

type Client = TypedSupabaseClient;

// ─── Tipos de retorno ─────────────────────────────────────────────────────────

export type SSTStats = {
  personalAsignado: number;
  enOperacion: number;
  incidentesTotales: number;
  incidentesHoy: number;
  accidentesGraves: number;
  accidentesHoy: number;
  ausentismos: number;
  tasaAusentismo: number;
};

export type EmpleadoDocumento = {
  id: string;
  empleado_id: string;
  tipo: DocumentoEmpleadoTipo;
  nombre: string | null;
  storage_path: string;
  vigencia_desde: string | null;
  vigencia_hasta: string | null;
  uploaded_by: string | null;
  uploaded_at: string;
};

export type EmpleadoConDocumentos = Tables<"empleados"> & {
  documentos: EmpleadoDocumento[];
};

export type AusentismoConEmpleado = {
  id: string;
  empleado_id: string;
  proyecto_id: string;
  tipo: AusentismoTipo;
  fecha_inicio: string;
  fecha_fin: string;
  razon: string;
  soporte_pdf_path: string | null;
  registrado_por: string | null;
  created_at: string;
  empleados: Pick<Tables<"empleados">, "nombre" | "cargo" | "arl" | "eps"> | null;
};

export type IncidenteConEmpleado = Tables<"incidentes"> & {
  empleados: Pick<Tables<"empleados">, "nombre" | "cargo"> | null;
};

// ─── KPIs SST agregados ───────────────────────────────────────────────────────

export async function getSSTStats(
  supabase: Client,
  proyectoId: string,
): Promise<SSTStats> {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  // 1. Personal asignado (asignaciones activas al proyecto)
  const { count: personalAsignado } = await supabase
    .from("empleado_proyectos")
    .select("*", { count: "exact", head: true })
    .eq("proyecto_id", proyectoId)
    .is("retirado_at", null);

  // 2. Ausentismos activos HOY
  const { count: ausentismosHoy } = await supabase
    .from("ausentismos")
    .select("*", { count: "exact", head: true })
    .eq("proyecto_id", proyectoId)
    .lte("fecha_inicio", today)
    .gte("fecha_fin", today);

  // 3. Total incidentes del proyecto
  const { count: incidentesTotales } = await supabase
    .from("incidentes")
    .select("*", { count: "exact", head: true })
    .eq("proyecto_id", proyectoId);

  // 4. Incidentes hoy (cualquier tipo)
  const { count: incidentesHoy } = await supabase
    .from("incidentes")
    .select("*", { count: "exact", head: true })
    .eq("proyecto_id", proyectoId)
    .gte("fecha", `${today}T00:00:00Z`)
    .lte("fecha", `${today}T23:59:59Z`);

  // 5. Accidentes graves (tipo accidente + severidad grave/critico)
  const { count: accidentesGraves } = await supabase
    .from("incidentes")
    .select("*", { count: "exact", head: true })
    .eq("proyecto_id", proyectoId)
    .eq("tipo", "accidente")
    .in("severidad", ["grave", "critico"]);

  // 6. Accidentes graves hoy
  const { count: accidentesHoy } = await supabase
    .from("incidentes")
    .select("*", { count: "exact", head: true })
    .eq("proyecto_id", proyectoId)
    .eq("tipo", "accidente")
    .in("severidad", ["grave", "critico"])
    .gte("fecha", `${today}T00:00:00Z`)
    .lte("fecha", `${today}T23:59:59Z`);

  const asignados = personalAsignado ?? 0;
  const ausentes = ausentismosHoy ?? 0;

  return {
    personalAsignado: asignados,
    enOperacion: Math.max(0, asignados - ausentes),
    incidentesTotales: incidentesTotales ?? 0,
    incidentesHoy: incidentesHoy ?? 0,
    accidentesGraves: accidentesGraves ?? 0,
    accidentesHoy: accidentesHoy ?? 0,
    ausentismos: ausentes,
    tasaAusentismo:
      asignados > 0 ? parseFloat(((ausentes / asignados) * 100).toFixed(1)) : 0,
  };
}

// ─── Empleados asignados al proyecto con documentos ──────────────────────────

export async function getEmpleadosAsignados(
  supabase: Client,
  proyectoId: string,
): Promise<EmpleadoConDocumentos[]> {
  // Paso 1: IDs de empleados activos en el proyecto
  const { data: asignaciones, error: errAsig } = await supabase
    .from("empleado_proyectos")
    .select("empleado_id")
    .eq("proyecto_id", proyectoId)
    .is("retirado_at", null);

  if (errAsig) throw errAsig;
  if (!asignaciones || asignaciones.length === 0) return [];

  const ids = asignaciones.map((a) => a.empleado_id);

  // Paso 2: Perfiles de empleado
  const { data: empleados, error: errEmp } = await supabase
    .from("empleados")
    .select("*")
    .in("id", ids)
    .eq("activo", true);

  if (errEmp) throw errEmp;
  if (!empleados || empleados.length === 0) return [];

  // Paso 3: Documentos de todos esos empleados
  const { data: documentos, error: errDoc } = await supabase
    .from("empleado_documentos")
    .select("*")
    .in("empleado_id", ids);

  if (errDoc) throw errDoc;

  // Combinar: adjuntar documentos a cada empleado
  return empleados.map((emp) => ({
    ...emp,
    documentos: documentos?.filter((d) => d.empleado_id === emp.id) ?? [],
  }));
}

// ─── Ausentismos activos con info del empleado ────────────────────────────────

export async function getAusentismosActivos(
  supabase: Client,
  proyectoId: string,
): Promise<AusentismoConEmpleado[]> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("ausentismos")
    .select(`
      *,
      empleados:empleado_id ( nombre, cargo, arl, eps )
    `)
    .eq("proyecto_id", proyectoId)
    .lte("fecha_inicio", today)
    .gte("fecha_fin", today)
    .order("fecha_inicio", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AusentismoConEmpleado[];
}

// ─── Todos los ausentismos del proyecto (historial) ───────────────────────────

export async function getAusentismosHistorial(
  supabase: Client,
  proyectoId: string,
): Promise<AusentismoConEmpleado[]> {
  const { data, error } = await supabase
    .from("ausentismos")
    .select(`
      *,
      empleados:empleado_id ( nombre, cargo, arl, eps )
    `)
    .eq("proyecto_id", proyectoId)
    .order("fecha_inicio", { ascending: false });

  if (error) throw error;
  return (data ?? []) as AusentismoConEmpleado[];
}

// ─── Incidentes del proyecto con info del empleado ────────────────────────────

export async function getIncidentesPorProyecto(
  supabase: Client,
  proyectoId: string,
  tipo?: "incidente" | "accidente" | "casi_accidente",
): Promise<IncidenteConEmpleado[]> {
  let query = supabase
    .from("incidentes")
    .select(`
      *,
      empleados:empleado_id ( nombre, cargo )
    `)
    .eq("proyecto_id", proyectoId)
    .order("fecha", { ascending: false });

  if (tipo) query = query.eq("tipo", tipo);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as IncidenteConEmpleado[];
}

// ─── Avances de la semana actual para gráfica semanal ─────────────────────────

export type AvanceDiario = {
  dia: string;
  proyectado: number;
  real: number;
};

export async function getAvancesSemanaActual(
  supabase: Client,
  proyectoId: string,
): Promise<AvanceDiario[]> {
  // Calcular lunes de la semana actual
  const hoy = new Date();
  const diaSemana = hoy.getDay(); // 0=Dom, 1=Lun...6=Sab
  const diffAlLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() + diffAlLunes);

  const viernes = new Date(lunes);
  viernes.setDate(lunes.getDate() + 4);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("proyecto_avances")
    .select("fecha, avance_real, avance_proyectado")
    .eq("proyecto_id", proyectoId)
    .gte("fecha", formatDate(lunes))
    .lte("fecha", formatDate(viernes))
    .order("fecha", { ascending: true });

  if (error) throw error;

  // Mapear a formato de gráfica
  const diasNombre = ["LUN", "MAR", "MIE", "JUE", "VIE"];
  return (data ?? []).map((row) => {
    const fecha = new Date(row.fecha + "T12:00:00"); // evitar timezone shift
    const idx = fecha.getDay() - 1; // Lun=0, Mar=1...
    return {
      dia: diasNombre[idx] ?? row.fecha,
      proyectado: Number(row.avance_proyectado),
      real: Number(row.avance_real),
    };
  });
}

// ─── Avance del día actual para la barra diaria ──────────────────────────────

export async function getAvanceHoy(
  supabase: Client,
  proyectoId: string,
): Promise<{ real: number; proyectado: number } | null> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("proyecto_avances")
    .select("avance_real, avance_proyectado")
    .eq("proyecto_id", proyectoId)
    .eq("fecha", today)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    real: Number(data.avance_real),
    proyectado: Number(data.avance_proyectado),
  };
}

// ─── Funciones existentes ─────────────────────────────────────────────────────

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
