// Catálogo estandarizado del formato ATS (Análisis de Trabajo Seguro).
// Fuente única de las opciones del formulario: editar aquí mantiene consistentes
// el formulario y el PDF.

// Permisos que puede requerir el trabajo (selección múltiple)
export const PERMISOS_REQUERIDOS = [
  { id: "altura", label: "Trabajo en altura" },
  { id: "espacio_confinado", label: "Espacio confinado" },
  { id: "caliente", label: "Trabajo en caliente" },
  { id: "energias_peligrosas", label: "Energías peligrosas" },
] as const;

// Categorías de equipos y herramientas a utilizar
export const CATEGORIAS_HERRAMIENTAS = [
  { id: "manuales", label: "Manuales" },
  { id: "electricas", label: "Eléctricas" },
  { id: "neumaticas", label: "Neumáticas" },
  { id: "hidraulicas", label: "Hidráulicas" },
  { id: "mecanicas", label: "Mecánicas" },
  { id: "otras", label: "Otras" },
] as const;

// Preguntas abiertas del análisis de la tarea
export const PREGUNTAS_ANALISIS = [
  { id: "altura_lugar", texto: "¿Qué tan alto se encuentra el lugar de trabajo?" },
  { id: "sistema_acceso", texto: "¿Cuál es el sistema de acceso al lugar de trabajo?" },
  { id: "puntos_anclaje", texto: "¿Se han establecido los puntos de anclaje?" },
  { id: "calculos_caida", texto: "¿Se han realizado los cálculos de la distancia de caída?" },
  { id: "sistemas_prevencion", texto: "¿Cuáles son los sistemas de prevención y protección requeridos?" },
  { id: "elementos_proteccion", texto: "¿Cuáles son los elementos de protección requeridos?" },
  { id: "num_trabajadores", texto: "¿Cuántos trabajadores se requieren?" },
  { id: "materiales_recursos", texto: "¿Qué materiales y recursos van a utilizarse?" },
  { id: "hoyos_grietas", texto: "¿Existen hoyos o grietas debajo del área de trabajo?" },
  { id: "resbalar_tropezar", texto: "¿Hay peligro de resbalar o tropezar alrededor del área de trabajo?" },
  {
    id: "otros_peligros",
    texto:
      "¿Qué otros peligros hay en el lugar de trabajo? (chispas, electricidad, químicos, superficie resbaladiza, superficies calientes, objetos filosos, cargas pesadas, etc.)",
  },
] as const;

// Evaluación del riesgo — decisiones del Excel
export const PROBABILIDAD_INCIDENTE = ["si", "no"] as const;
export type ProbabilidadIncidente = (typeof PROBABILIDAD_INCIDENTE)[number] | "";

export const EVALUACION_RIESGO = {
  probabilidad: {
    pregunta: "¿Es posible, probable o casi seguro que ocurra un incidente?",
    si: "Sí: deténgase y no proceda con la tarea. Analice con el supervisor encargado el paso a paso, revisen controles y responda la siguiente pregunta.",
    no: "No: continúe con la tarea con precaución, implemente los controles establecidos.",
  },
  seguridad: {
    pregunta: "¿Es seguro proceder ahora en la tarea con los controles adicionales?",
    si: "Sí: proceda con la tarea.",
    no: "No: consulte al supervisor antes de tomar cualquier decisión.",
  },
} as const;

export type PermisoRequeridoId = (typeof PERMISOS_REQUERIDOS)[number]["id"];
export type CategoriaHerramientaId = (typeof CATEGORIAS_HERRAMIENTAS)[number]["id"];
export type PreguntaAnalisisId = (typeof PREGUNTAS_ANALISIS)[number]["id"];
