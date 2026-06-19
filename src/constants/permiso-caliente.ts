// Catálogo estandarizado del Permiso para Trabajos en Caliente.
// Fuente única de las opciones del formulario: editar aquí mantiene consistentes
// el formulario y el PDF.

export const RESPUESTA_CHEQUEO = ["si", "no", "na"] as const;
export type RespuestaChequeo = (typeof RESPUESTA_CHEQUEO)[number] | "";

export const RESPUESTA_LABEL: Record<Exclude<RespuestaChequeo, "">, string> = {
  si: "Sí",
  no: "No",
  na: "N/A",
};

// Respuesta Sí/No para los permisos adicionales requeridos
export const RESPUESTA_SINO = ["si", "no"] as const;
export type RespuestaSiNo = (typeof RESPUESTA_SINO)[number] | "";

// Permisos adicionales para realizar este trabajo
export const PERMISOS_ADICIONALES = [
  { id: "altura", label: "Permiso de trabajo en altura" },
  { id: "espacios_confinados", label: "Permiso de espacios confinados" },
] as const;

// Bloqueo de energías peligrosas (selección múltiple)
export const ENERGIAS_PELIGROSAS = [
  { id: "electrica", label: "Eléctrica" },
  { id: "neumatica", label: "Neumática" },
  { id: "mecanica", label: "Mecánica" },
  { id: "hidraulica", label: "Hidráulica" },
  { id: "termica", label: "Térmica" },
] as const;

// Elementos de protección personal (selección múltiple)
export const EPP_CALIENTE = [
  { id: "casco", label: "Casco" },
  { id: "botas", label: "Botas de seguridad" },
  { id: "gafas", label: "Gafas de seguridad" },
  { id: "careta", label: "Careta" },
  { id: "proteccion_auditiva", label: "Protección auditiva" },
  { id: "guantes_mecanica", label: "Guantes resistencia mecánica" },
  { id: "guantes_calor", label: "Guantes resistencia al calor" },
  { id: "peto_carnaza", label: "Peto o delantal de carnaza" },
  { id: "polainas", label: "Polainas" },
] as const;

// Lista de verificación agrupada por secciones — Sí / No / N/A
export const CHEQUEO_CALIENTE: { id: string; titulo: string; items: { id: string; texto: string }[] }[] = [
  {
    id: "planeacion",
    titulo: "Planeación de la labor",
    items: [
      { id: "procedimiento", texto: "Se cuenta con procedimiento específico y claro para la labor a desarrollar." },
      { id: "reunion_ats", texto: "Se ha hecho una reunión y el ATS con todos los implicados en la tarea." },
      { id: "dispositivos", texto: "Se dispone de los elementos o dispositivos necesarios para trabajar." },
      { id: "personal_calificado", texto: "El personal está calificado para desarrollar el trabajo." },
    ],
  },
  {
    id: "area",
    titulo: "Área de trabajo",
    items: [
      { id: "area_optima", texto: "El área de ejecución de la labor se encuentra limpia, purgada, aislada y es óptima para la ejecución de la tarea." },
      { id: "area_senalizada", texto: "Se señalizó y delimitó el área de trabajo, teniendo en cuenta la zona de influencia de potenciales peligros." },
    ],
  },
  {
    id: "epp_verif",
    titulo: "Elementos de protección personal",
    items: [
      { id: "entrenados_epp", texto: "Están los trabajadores autorizados entrenados en el uso de los EPP." },
      { id: "todos_epp", texto: "Están todos los elementos de protección." },
    ],
  },
  {
    id: "verificacion",
    titulo: "Verificación del trabajo en caliente",
    items: [
      { id: "mamparas", texto: "Se han instalado mamparas y/o se han aislado para proteger a las personas y equipos de áreas vecinas de chispas y/o resplandor." },
      { id: "conexion_tierra", texto: "Se ha hecho la conexión a tierra de los equipos de soldadura u otros requeridos." },
      { id: "extintores", texto: "Se dispone de extintores con capacidad suficiente para uso en caso de incendio." },
      { id: "equipos_cubiertos", texto: "Los equipos y materiales están cubiertos y protegidos correctamente con materiales resistentes al fuego." },
      { id: "sitio_libre", texto: "El sitio donde se ejecutará el trabajo está libre de sustancias químicas y materiales combustibles e inflamables, o están aislados completamente." },
      { id: "cables_buen_estado", texto: "Los equipos a utilizar tienen los cables, conexiones, reguladores, mangueras y sopletes en buenas condiciones." },
      { id: "cilindros_verticales", texto: "Los cilindros de gases industriales están ubicados en posición vertical, con sus soportes y asegurados correctamente." },
      { id: "apagar_fuego", texto: "Los ejecutores conocen el procedimiento de apagar un potencial fuego generado en este trabajo." },
      { id: "tuberias_aisladas", texto: "El equipo y las tuberías están aislados con flanche ciego, drenados y desconectados." },
      { id: "precauciones_vapor", texto: "Fueron tomadas precauciones para la liberación accidental de vapor/gases inflamables en el área." },
      { id: "mediciones_gases", texto: "Fueron realizadas mediciones de gases inflamables/tóxicos en tanques, manholes, líneas, cajas y canaletas." },
      { id: "valvula_cortallamas", texto: "La válvula corta-llamas y la línea de la manguera próximas han sido marcadas en las salidas de los cilindros." },
      { id: "cables_temporales", texto: "Los cables eléctricos temporales están en buen estado, sobre zonas secas, son aéreos en zonas de circulación y están encauchetados." },
    ],
  },
  {
    id: "terminar",
    titulo: "Al terminar la labor",
    items: [
      { id: "orden_aseo", texto: "Se ha dejado el área de trabajo en orden y aseo." },
      { id: "entrega_maquina", texto: "Se ha entregado la máquina/equipo a quien corresponda, verificando las actividades realizadas." },
      { id: "retiro_bloqueos", texto: "Se retiraron todos los bloqueos, etiquetas y tarjetas." },
      { id: "guardas_controles", texto: "Se volvieron a colocar las guardas y todos los controles de seguridad de la máquina, incluyendo señales luminosas, sonoras, avisos y pictogramas." },
    ],
  },
];

export type EnergiaId = (typeof ENERGIAS_PELIGROSAS)[number]["id"];
export type EppCalienteId = (typeof EPP_CALIENTE)[number]["id"];
export type PermisoAdicionalId = (typeof PERMISOS_ADICIONALES)[number]["id"];
