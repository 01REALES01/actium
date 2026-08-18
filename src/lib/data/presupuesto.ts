import type {
  TypedSupabaseClient,
  Tables,
  CategoriaFlujo,
  MovimientoTipo,
} from "@/types/database.types";

type Client = TypedSupabaseClient;

const CATEGORIAS_EGRESO: CategoriaFlujo[] = [
  "costos_operativos",
  "gastos_administrativos",
  "gastos_financieros",
];

export type MovimientoConUsuarios = Tables<"movimientos"> & {
  solicitante: Pick<Tables<"usuarios">, "nombre"> | null;
  aprobador: Pick<Tables<"usuarios">, "nombre"> | null;
};

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

export async function getRubrosPorProyecto(
  supabase: Client,
  proyectoId: string,
): Promise<Tables<"rubros">[]> {
  const { data, error } = await supabase
    .from("rubros")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .eq("activo", true)
    .order("orden", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Movimientos de un proyecto. Sin `opts` devuelve el ledger completo (lo que
 * necesita la pantalla de presupuesto). El flujo de caja acota por estado, tipo
 * y fechas para no serializar al cliente todo el historial cuando solo va a
 * mostrar el detalle de una celda.
 */
export async function listMovimientos(
  supabase: Client,
  proyectoId: string,
  opts: {
    soloEjecutados?: boolean;
    tipos?: MovimientoTipo[];
    desde?: string;
    hasta?: string;
  } = {},
): Promise<MovimientoConUsuarios[]> {
  let query = supabase
    .from("movimientos")
    .select("*, solicitante:solicitado_por (nombre), aprobador:aprobado_por (nombre)")
    .eq("proyecto_id", proyectoId);

  if (opts.soloEjecutados) query = query.eq("estado", "ejecutado");
  if (opts.tipos) query = query.in("tipo", opts.tipos);
  if (opts.desde) query = query.gte("fecha_efectiva", opts.desde);
  if (opts.hasta) query = query.lte("fecha_efectiva", opts.hasta);

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as MovimientoConUsuarios[];
}

/** Un proyecto por fila con su presupuesto agregado. Alimenta /finanzas/presupuesto. */
export async function listProyectosFinanzas(
  supabase: Client,
  opts: { soloInternos?: boolean } = {},
): Promise<Tables<"vw_proyectos_finanzas">[]> {
  let query = supabase.from("vw_proyectos_finanzas").select("*");

  query = opts.soloInternos ? query.eq("es_interno", true) : query.eq("es_interno", false);

  const { data, error } = await query.order("proyecto_nombre", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getProyectoFinanzas(
  supabase: Client,
  proyectoId: string,
): Promise<Tables<"vw_proyectos_finanzas"> | null> {
  const { data, error } = await supabase
    .from("vw_proyectos_finanzas")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data;
}

/**
 * Suma movimientos ejecutados de tipo 'gasto' desde `inicioMesISO`, cuyo rubro
 * destino cae en alguna de `categorias`. Se resuelve en dos queries + join en
 * JS (en vez de un embed `rubros:rubro_destino_id(...)`) porque movimientos
 * tiene dos FKs con el mismo nombre de columna (rubros y vw_rubro_balance),
 * lo que hace que el tipado generado de Supabase infiera el embed como array
 * en vez de objeto — este approach evita esa ambiguedad.
 */
export async function sumarMovimientosPorCategoriaDelMes(
  supabase: Client,
  inicioMesISO: string,
  opts: { categorias: CategoriaFlujo[]; proyectoId?: string },
): Promise<number> {
  let rubrosQuery = supabase.from("rubros").select("id").in("categoria", opts.categorias);
  if (opts.proyectoId) rubrosQuery = rubrosQuery.eq("proyecto_id", opts.proyectoId);
  const { data: rubrosData, error: rubrosError } = await rubrosQuery;
  if (rubrosError) throw rubrosError;

  const idsCategoria = new Set((rubrosData ?? []).map((r) => r.id));
  if (idsCategoria.size === 0) return 0;

  let movQuery = supabase
    .from("movimientos")
    .select("monto, rubro_destino_id")
    .eq("tipo", "gasto")
    .eq("estado", "ejecutado")
    .gte("fecha_efectiva", inicioMesISO);
  if (opts.proyectoId) movQuery = movQuery.eq("proyecto_id", opts.proyectoId);
  const { data: movsData, error: movsError } = await movQuery;
  if (movsError) throw movsError;

  return (movsData ?? [])
    .filter((m) => idsCategoria.has(m.rubro_destino_id))
    .reduce((acc, m) => acc + m.monto, 0);
}

export const CATEGORIAS_INGRESO: CategoriaFlujo[] = ["ingresos"];
export { CATEGORIAS_EGRESO };

