// =============================================================================
// Catálogo del formato Registro de Capacitación / Charla de Seguridad.
// =============================================================================
// El formato original registra la charla (tema, capacitador, modalidad,
// duración), hasta 20 asistentes que firman su participación, la verificación
// de comprensión aplicada y el resultado general. A diferencia de Entrega EPP
// —un formulario por trabajador—, aquí es una sola charla con muchos
// asistentes: el formulario y el PDF se construyen a partir de este catálogo.
// =============================================================================

export type OpcionCatalogo = { id: string; label: string };

export const TIPOS_ACTIVIDAD: OpcionCatalogo[] = [
  { id: "capacitacion", label: "Capacitación" },
  { id: "charla", label: "Charla de seguridad" },
  { id: "induccion", label: "Inducción" },
  { id: "reinduccion", label: "Reinducción" },
  { id: "socializacion", label: "Socialización" },
];

export const MODALIDADES: OpcionCatalogo[] = [
  { id: "presencial", label: "Presencial" },
  { id: "virtual", label: "Virtual" },
  { id: "teorico_practica", label: "Teórico-práctica" },
];

export const RESULTADOS_GENERALES: OpcionCatalogo[] = [
  { id: "satisfactorio", label: "Satisfactorio" },
  { id: "requiere_refuerzo", label: "Requiere refuerzo" },
  { id: "reprogramar", label: "Reprogramar" },
];

export const EVALUACIONES_ASISTENTE: OpcionCatalogo[] = [
  { id: "satisfactorio", label: "Satisfactorio" },
  { id: "requiere_refuerzo", label: "Requiere refuerzo" },
  { id: "no_evaluado", label: "No evaluado" },
];

export const METODOS_VERIFICACION: OpcionCatalogo[] = [
  { id: "preguntas_orales", label: "Preguntas orales" },
  { id: "evaluacion_escrita", label: "Evaluación escrita" },
  { id: "demostracion_practica", label: "Demostración práctica" },
  { id: "observacion", label: "Observación" },
];

export const TIPOS_EVIDENCIA: OpcionCatalogo[] = [
  { id: "fotografias", label: "Fotografías" },
  { id: "evaluacion", label: "Evaluación" },
  { id: "material_apoyo", label: "Material de apoyo" },
  { id: "lista_chequeo", label: "Lista de chequeo" },
  { id: "otra", label: "Otra" },
];

/** Base legal que se imprime en el PDF. */
export const NOTA_LEGAL_CHARLA =
  "Este registro evidencia la participación en la actividad indicada. No reemplaza certificados o constancias exigidos por normas especiales cuando sean aplicables. Conservar como registro del SG-SST.";

/** Leyenda de constancia que acompaña la firma de cada asistente. */
export const CONSTANCIA_ASISTENTE_CHARLA =
  "Declaro haber asistido a la actividad relacionada en este registro y haber comprendido el contenido tratado.";

// ─── Contenido / temas tratados ─────────────────────────────────────────────

export type TemaCharla = { id: number; texto: string };

export function temaVacio(id: number): TemaCharla {
  return { id, texto: "" };
}

/** Temas con texto real, en el orden en que se diligenciaron. */
export function temasDiligenciados(temas: TemaCharla[]): string[] {
  return temas.map((t) => t.texto.trim()).filter(Boolean);
}

// ─── Asistentes ──────────────────────────────────────────────────────────────

export type AsistenteCharla = {
  id: number;
  empleadoId: string | null;
  nombre: string;
  identificacion: string;
  cargo: string;
  empresa: string;
  evaluacion: string;
  firma: string;
};

export function asistenteVacio(id: number): AsistenteCharla {
  return {
    id,
    empleadoId: null,
    nombre: "",
    identificacion: "",
    cargo: "",
    empresa: "",
    evaluacion: "",
    firma: "",
  };
}

export function asistenteDesdeEmpleado(
  empleado: { id: string; nombre: string; cedula: string; cargo: string | null },
  id: number,
): AsistenteCharla {
  return {
    id,
    empleadoId: empleado.id,
    nombre: empleado.nombre,
    identificacion: empleado.cedula || "",
    cargo: empleado.cargo || "",
    empresa: "ACTIUM",
    evaluacion: "",
    firma: "",
  };
}

/** Asistentes con nombre diligenciado, en el orden del registro. */
export function asistentesValidos(lista: AsistenteCharla[]): AsistenteCharla[] {
  return lista.filter((a) => a.nombre.trim());
}

/** Rótulos de los asistentes válidos que aún no han firmado. */
export function asistentesSinFirma(lista: AsistenteCharla[]): string[] {
  return asistentesValidos(lista)
    .filter((a) => !a.firma)
    .map((a) => a.nombre.trim());
}

// ─── Duración ────────────────────────────────────────────────────────────────

/** Minutos entre hora de inicio y fin ("HH:mm"), o null si faltan datos o el rango no es válido. */
export function calcularDuracionMinutos(horaInicio: string, horaFin: string): number | null {
  if (!horaInicio || !horaFin) return null;
  const [hi, mi] = horaInicio.split(":").map(Number);
  const [hf, mf] = horaFin.split(":").map(Number);
  if ([hi, mi, hf, mf].some((n) => Number.isNaN(n))) return null;
  const minutos = hf * 60 + mf - (hi * 60 + mi);
  return minutos > 0 ? minutos : null;
}

/** "1 h 30 min" a partir de un total de minutos. */
export function etiquetaDuracion(minutos: number | null): string {
  if (!minutos) return "—";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}
