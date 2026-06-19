// Catálogo estandarizado del Permiso de Trabajo en Altura (Resolución 1409 de 2012).
// Fuente única de las opciones del formulario: editar aquí mantiene consistentes
// el formulario y el PDF.

export const RESPUESTA_CHEQUEO = ["si", "no", "na"] as const;
export type RespuestaChequeo = (typeof RESPUESTA_CHEQUEO)[number] | "";

export const RESPUESTA_LABEL: Record<Exclude<RespuestaChequeo, "">, string> = {
  si: "Sí",
  no: "No",
  na: "N/A",
};

// 3. Sistemas de acceso a utilizar (selección múltiple)
export const SISTEMAS_ACCESO = [
  { id: "andamio", label: "Andamio" },
  { id: "escalera", label: "Escalera" },
  { id: "elevador", label: "Elevador de personal o grúa con canasta" },
] as const;

// Otras TAR (Tareas de Alto Riesgo) que se involucran (Sí/No)
export const OTRAS_TAR = [
  { id: "espacio_confinado", label: "Espacio confinado" },
  { id: "trabajo_caliente", label: "Trabajo en caliente" },
  { id: "energias_peligrosas", label: "Energías peligrosas" },
] as const;

// Elementos de protección personal y sistemas de protección contra caídas
export const EPP_ALTURA = [
  { id: "arnes", label: "Arnés de cuerpo entero" },
  { id: "linea_vida_vertical", label: "Línea de vida vertical" },
  { id: "linea_vida_horizontal", label: "Línea de vida horizontal" },
  { id: "eslinga_posicionamiento", label: "Eslinga de posicionamiento" },
  { id: "eslinga", label: "Eslinga" },
  { id: "sistemas_anclaje", label: "Sistemas de anclaje" },
  { id: "casco_barboquejo", label: "Casco con barboquejo" },
  { id: "guantes", label: "Guantes" },
  { id: "gafas", label: "Gafas" },
  { id: "senalizacion_area", label: "Señalización del área" },
] as const;

// 4. Lista de chequeo de verificación — Sí / No / N/A
export const CHEQUEO_ALTURA: { id: string; texto: string }[] = [
  { id: "ast", texto: "Se realizó el análisis de seguridad en el trabajo (AST)." },
  { id: "otros_permisos", texto: "Se han consultado otros permisos y se cumple con los requerimientos de éstos." },
  { id: "aptitud_personal", texto: "El personal cumple con los requisitos de aptitud para realizar la tarea." },
  { id: "sustancias_quimicas", texto: "Si va a utilizar sustancias químicas, cuenta con los controles para su manipulación." },
  { id: "equipo_proteccion", texto: "El personal cuenta con el equipo de protección definido para la tarea." },
  { id: "riesgos_controlados", texto: "Se controlaron los riesgos presentes en el sitio de trabajo." },
  { id: "equipo_acceso", texto: "El personal cuenta con el equipo definido para acceder al sitio." },
  { id: "persona_emergencia", texto: "Está presente una persona para que active el plan de emergencia en caso de ser necesario." },
  { id: "equipos_inspeccionados", texto: "El equipo para acceder al sitio y el de protección personal fueron inspeccionados." },
  { id: "linea_vida_instalada", texto: "El lugar donde realizará la labor tiene instalada la línea de vida o una estructura donde el trabajador pueda asegurarse." },
  { id: "formacion_alturas", texto: "Se verificó que la formación en alturas del personal esté acorde al trabajo a realizar." },
  { id: "procedimiento_rescate", texto: "El personal que va a realizar la labor conoce el procedimiento de emergencia y rescate." },
  { id: "sitio_aislado", texto: "El sitio donde se ejecutará el trabajo está aislado y señalizado completamente." },
  { id: "andamios_completos", texto: "Los andamios se encuentran completos, en sus partes y accesorios." },
  { id: "mamparas", texto: "Se han instalado mamparas o cinta para aislar y señalizar la zona y no permitir el paso de vehículos o personas." },
  { id: "frenos_ruedas", texto: "Están operando los frenos de las ruedas de los andamios." },
  { id: "eslinga_absorbente", texto: "Cuentan con eslinga de seguridad con absorbente de caídas." },
  { id: "canes_plataformas", texto: "Los canes o plataformas están asegurados y sobresalen mínimo 30 cm del andamio." },
  { id: "freno_certificado", texto: "Cuentan con freno de seguridad, certificado y apropiado para el tipo de línea de vida." },
  { id: "izar_herramienta", texto: "Se ha dispuesto de los elementos necesarios para izar y descender la herramienta." },
  { id: "linea_por_operador", texto: "Se cuenta con líneas de vida para cada uno de los operadores." },
  { id: "andamios_asegurados", texto: "Los andamios se encuentran asegurados cada tres cuerpos." },
  { id: "mosquetones_doble", texto: "Los conectores o mosquetones son de doble seguro." },
  { id: "guayas_acero", texto: "Las guayas de acero son del calibre definido para el tipo de andamio colgante, en buen estado y aseguradas correctamente." },
  { id: "cuerdas_sin_nudos", texto: "Las cuerdas se encuentran libres de nudos." },
  { id: "barandas_andamio", texto: "Las barandas del andamio cumplen con las especificaciones técnicas." },
  { id: "medidas_precaucion", texto: "Todos los trabajadores autorizados conocen las medidas de precaución establecidas en la evaluación de riesgos." },
  { id: "escaleras_tecnicas", texto: "Las escaleras cumplen las especificaciones técnicas." },
];

export type SistemaAccesoId = (typeof SISTEMAS_ACCESO)[number]["id"];
export type OtraTarId = (typeof OTRAS_TAR)[number]["id"];
export type EppAlturaId = (typeof EPP_ALTURA)[number]["id"];
