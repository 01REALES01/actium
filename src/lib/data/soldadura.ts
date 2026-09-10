// =============================================================================
// Capa de lectura de Documentos de soldadura (WPS / PQR / WPQ).
// =============================================================================
// Molde: src/lib/data/inventario.ts. El filtrado y el orden se resuelven en la
// query, no en memoria: la sección está pensada para series largas —un taller
// acumula cientos de procedimientos y calificaciones a lo largo de los años— y
// traerlas todas para filtrar en el cliente dejaría de funcionar justo cuando
// el archivo empieza a tener valor.
// =============================================================================

import type { TypedSupabaseClient, Tables } from "@/types/database.types";
import type { DocumentoTipo, DocumentoVariante } from "@/constants/soldadura";

export type DocumentoSoldadura = Tables<"documentos_soldadura">;

export type FiltroSoldadura = {
  tipo?: DocumentoTipo;
  variante?: DocumentoVariante;
  /** Busca en número, título, proceso y referencias cruzadas. */
  q?: string;
  soloBorradores?: boolean;
};

/**
 * Documentos de la empresa, del más reciente al más antiguo. La búsqueda cubre
 * las cinco columnas por las que el taller pregunta en la práctica: "el WPS
 * 014", "los de GTAW", "los que respaldan el PQR 007", "los de Fernández".
 */
export async function listarDocumentosSoldadura(
  supabase: TypedSupabaseClient,
  filtro: FiltroSoldadura = {},
): Promise<DocumentoSoldadura[]> {
  let q = supabase
    .from("documentos_soldadura")
    .select("*")
    .order("created_at", { ascending: false });

  if (filtro.tipo) q = q.eq("tipo", filtro.tipo);
  if (filtro.variante) q = q.eq("variante", filtro.variante);
  if (filtro.soloBorradores) q = q.eq("estado", "borrador");

  const termino = (filtro.q || "").trim();
  if (termino) {
    // `or` con ilike sobre las columnas de búsqueda. Las comas separan
    // condiciones en la sintaxis de PostgREST, así que se eliminan del término.
    const t = termino.replace(/[,()]/g, " ").trim();
    q = q.or(
      [
        `numero.ilike.%${t}%`,
        `titulo.ilike.%${t}%`,
        `proceso.ilike.%${t}%`,
        `wps_ref.ilike.%${t}%`,
        `pqr_ref.ilike.%${t}%`,
        `codigo_consecutivo.ilike.%${t}%`,
      ].join(","),
    );
  }

  const { data, error } = await q;
  if (error) {
    console.error("Error listando documentos de soldadura:", error);
    return [];
  }
  return (data as DocumentoSoldadura[]) ?? [];
}

export async function obtenerDocumentoSoldadura(
  supabase: TypedSupabaseClient,
  id: string,
): Promise<DocumentoSoldadura | null> {
  const { data } = await supabase
    .from("documentos_soldadura")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as DocumentoSoldadura) ?? null;
}

/** Conteo por tipo para las tarjetas de la portada. Solo documentos emitidos. */
export async function contarDocumentosPorTipo(
  supabase: TypedSupabaseClient,
): Promise<Record<DocumentoTipo, number>> {
  const { data } = await supabase
    .from("documentos_soldadura")
    .select("tipo")
    .neq("estado", "borrador");

  const conteo: Record<DocumentoTipo, number> = { wps: 0, pqr: 0, wpq: 0 };
  for (const fila of (data as { tipo: DocumentoTipo }[]) ?? []) {
    conteo[fila.tipo] = (conteo[fila.tipo] ?? 0) + 1;
  }
  return conteo;
}
