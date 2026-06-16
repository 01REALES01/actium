import type { TypedSupabaseClient } from "@/types/database.types";
import { listPartes } from "@/lib/data/partes-sst";
import { listProyectos } from "@/lib/data/proyectos";

type Client = TypedSupabaseClient;

/**
 * Evento de calendario serializable (fecha como string ISO YYYY-MM-DD) para
 * poder enviarlo por JSON desde el route handler al widget cliente.
 */
export type CalendarEventDTO = {
  id: string;
  fecha: string; // YYYY-MM-DD (día local del evento)
  tipo: "ats" | "incidente" | "ausentismo" | "parte" | "proyecto" | "vencimiento";
  titulo: string;
  subtitulo?: string;
  estado?: string;
  severidad?: string;
  href?: string;
};

type Rango = { desde: string; hasta: string; verPersonal: boolean };

/** Recorta una fecha-hora o fecha a solo YYYY-MM-DD. */
function soloDia(valor: string): string {
  return valor.slice(0, 10);
}

/**
 * Agrega los eventos de calendario de todas las fuentes, acotados al rango
 * [desde, hasta] (YYYY-MM-DD). Respeta RLS según el cliente recibido; los
 * vencimientos de personal solo se incluyen si `verPersonal` es true.
 */
export async function getCalendarEvents(
  supabase: Client,
  { desde, hasta, verPersonal }: Rango,
): Promise<CalendarEventDTO[]> {
  const [formRes, incRes, ausRes, partes, proyectos, docsRes] = await Promise.all([
    supabase
      .from("formularios")
      .select("id, tipo, estado, fecha_inicio, area, ubicacion")
      .gte("fecha_inicio", desde)
      .lte("fecha_inicio", `${hasta}T23:59:59`),
    supabase
      .from("incidentes")
      .select("id, tipo, severidad, fecha, descripcion, proyecto_id")
      .gte("fecha", `${desde}T00:00:00`)
      .lte("fecha", `${hasta}T23:59:59`),
    supabase
      .from("ausentismos")
      .select(`id, tipo, fecha_inicio, fecha_fin, razon, empleados:empleado_id ( nombre )`)
      .lte("fecha_inicio", hasta)
      .gte("fecha_fin", desde),
    listPartes(supabase, { desde, hasta }),
    listProyectos(supabase),
    verPersonal
      ? supabase
          .from("empleado_documentos")
          .select(`id, tipo, vigencia_hasta, empleados:empleado_id ( nombre )`)
          .not("vigencia_hasta", "is", null)
          .gte("vigencia_hasta", desde)
          .lte("vigencia_hasta", hasta)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const formularios = (formRes.data ?? []) as {
    id: string;
    tipo: string;
    estado: string;
    fecha_inicio: string | null;
    area: string | null;
    ubicacion: string | null;
  }[];
  const incidentes = (incRes.data ?? []) as {
    id: string;
    tipo: string;
    severidad: string;
    fecha: string;
    descripcion: string;
  }[];
  // El join a-uno `empleados` lo infiere Supabase como array; en runtime es un
  // objeto. Se castea vía unknown para conciliar el tipo.
  const ausentismos = (ausRes.data ?? []) as unknown as {
    id: string;
    tipo: string;
    fecha_inicio: string | null;
    razon: string;
    empleados: { nombre: string | null } | null;
  }[];
  const documentos = (docsRes.data ?? []) as unknown as {
    id: string;
    tipo: string;
    vigencia_hasta: string | null;
    empleados: { nombre: string | null } | null;
  }[];

  const eventos: CalendarEventDTO[] = [];

  // Partes diarios (enlazan a su detalle con descarga de PDF)
  partes.forEach((p) => {
    eventos.push({
      id: `parte-${p.proyecto_id}-${p.fecha}`,
      fecha: p.fecha,
      tipo: "parte",
      titulo: p.proyecto_nombre,
      subtitulo: `${p.presentes}/${p.total_programado} presentes · ${p.ausentes} ausentes`,
      href: `/proyectos/${p.proyecto_id}/parte/${p.fecha}`,
    });
  });

  // Formularios SST (ATS / permisos)
  formularios.forEach((f) => {
    if (f.fecha_inicio) {
      eventos.push({
        id: `form-${f.id}`,
        fecha: soloDia(f.fecha_inicio),
        tipo: "ats",
        titulo: `Permiso ${f.tipo.toUpperCase()}`,
        subtitulo: [f.ubicacion, f.area].filter(Boolean).join(" - ") || undefined,
        estado: f.estado,
      });
    }
  });

  // Incidentes / accidentes
  incidentes.forEach((i) => {
    if (i.fecha) {
      eventos.push({
        id: `inc-${i.id}`,
        fecha: soloDia(i.fecha),
        tipo: "incidente",
        titulo: i.tipo.replace("_", " ").toUpperCase(),
        subtitulo: i.descripcion || "Sin detalles",
        severidad: i.severidad,
      });
    }
  });

  // Ausentismos (marca el día de inicio)
  ausentismos.forEach((a) => {
    if (a.fecha_inicio) {
      eventos.push({
        id: `aus-${a.id}`,
        fecha: soloDia(a.fecha_inicio),
        tipo: "ausentismo",
        titulo: `Ausencia: ${a.tipo}`,
        subtitulo: `${a.empleados?.nombre ?? "Empleado"} - ${a.razon}`,
      });
    }
  });

  // Hitos de proyectos (inicio y fin previsto) dentro del rango
  proyectos.forEach((proy) => {
    if (proy.fecha_inicio && proy.fecha_inicio >= desde && proy.fecha_inicio <= hasta) {
      eventos.push({
        id: `proy-ini-${proy.id}`,
        fecha: proy.fecha_inicio,
        tipo: "proyecto",
        titulo: `Inicio · ${proy.nombre}`,
        subtitulo: proy.ubicacion ?? proy.ciudad ?? undefined,
        href: `/proyectos/${proy.id}`,
      });
    }
    if (
      proy.fecha_fin_proyectada &&
      proy.fecha_fin_proyectada >= desde &&
      proy.fecha_fin_proyectada <= hasta
    ) {
      eventos.push({
        id: `proy-fin-${proy.id}`,
        fecha: proy.fecha_fin_proyectada,
        tipo: "proyecto",
        titulo: `Fin previsto · ${proy.nombre}`,
        subtitulo: proy.ubicacion ?? proy.ciudad ?? undefined,
        href: `/proyectos/${proy.id}`,
      });
    }
  });

  // Vencimientos de documentos de personal (solo roles con acceso a Personal)
  documentos.forEach((d) => {
    if (d.vigencia_hasta) {
      eventos.push({
        id: `doc-${d.id}`,
        fecha: soloDia(d.vigencia_hasta),
        tipo: "vencimiento",
        titulo: `Vence ${d.tipo.replace("_", " ")}`,
        subtitulo: d.empleados?.nombre ?? "Empleado",
      });
    }
  });

  return eventos;
}
