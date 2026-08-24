// =============================================================================
// Catálogo del formato Instrucciones Preoperacionales.
// =============================================================================
// Un solo permiso reúne la inspección preoperacional de varias herramientas.
// Cada herramienta conserva la escala de su formato original —el taladro y las
// extensiones califican Bueno/Malo, la pulidora responde Sí/No y la máquina de
// soldar distingue buen estado, estado aceptable y mal estado—, porque así es
// como el personal ya las diligencia en papel.
//
// De cada herramienta pueden inspeccionarse VARIOS equipos en el mismo permiso
// (dos botiquines, tres taladros); cada equipo lleva su propia identificación,
// sus respuestas y su observación. Una herramienta sin equipos registrados, o
// marcada como no aplica, sale así en el PDF. La excepción es una herramienta
// `unico` —los elementos de protección personal—: no se identifica ni se
// repite, es un solo bloque por permiso.
//
// Agregar una nueva herramienta es agregar una entrada a HERRAMIENTAS_PREOP:
// el formulario y el PDF se construyen a partir de este catálogo.
// =============================================================================

// ─── Escalas de calificación ────────────────────────────────────────────────

export type EscalaId = "bueno_malo" | "si_no" | "estado_tres";

export type OpcionEscala = {
  id: string;
  label: string; // Texto completo, para el formulario
  corto: string; // Abreviatura del formato original, para el PDF
};

export type Escala = {
  opciones: OpcionEscala[];
  /** Valor que deja el equipo fuera de servicio y obliga a observación. */
  critico: string;
  /** Leyenda de la escala, tal como aparece en el formato original. */
  leyenda?: string;
};

export const ESCALAS: Record<EscalaId, Escala> = {
  bueno_malo: {
    opciones: [
      { id: "b", label: "Bueno", corto: "B" },
      { id: "m", label: "Malo", corto: "M" },
      { id: "na", label: "No aplica", corto: "N.A." },
    ],
    critico: "m",
    leyenda: "B: bueno · M: malo · N.A.: no aplica",
  },
  si_no: {
    opciones: [
      { id: "si", label: "Sí", corto: "Sí" },
      { id: "no", label: "No", corto: "No" },
      { id: "na", label: "No aplica", corto: "N.A." },
    ],
    critico: "no",
    leyenda: "Sí: cumple · No: no cumple · N.A.: no incluye ese elemento",
  },
  estado_tres: {
    opciones: [
      { id: "be", label: "Buen estado", corto: "B.E." },
      { id: "ea", label: "Estado aceptable", corto: "E.A." },
      { id: "me", label: "Mal estado", corto: "M.E." },
      { id: "na", label: "No aplica", corto: "N.A." },
    ],
    critico: "me",
    leyenda:
      "B.E.: nuevo o con poco uso · E.A.: con tiempo de servicio, cumple lo mínimo para seguir usándose · M.E.: debe retirarse de forma inmediata del área de trabajo",
  },
};

// ─── Definición de una herramienta ──────────────────────────────────────────

export type CampoIdentificacion = {
  id: string;
  label: string;
  /** Ancho completo en la grilla del formulario. */
  full?: boolean;
};

export type ItemChequeo = {
  id: string;
  texto: string;
  /**
   * Encabezado de sección del formato original. Los ítems consecutivos que
   * comparten grupo se presentan bajo un mismo título, numerados por posición.
   * Sin grupo, la herramienta se diligencia como una lista plana.
   */
  grupo?: string;
  /**
   * Opción que constituye hallazgo cuando el ítem está redactado como defecto
   * —"montura partida o vencida"—, donde responder que sí es la mala noticia.
   * Sin declarar, el hallazgo es el valor crítico de la escala.
   */
  criticoCuando?: string;
};

export type ElementoInventario = {
  id: string;
  nombre: string;
  presentacion: string;
  /** Cantidad exigida por el formato. */
  requerida: number;
};

export type HerramientaPreop = {
  id: string;
  nombre: string;
  /** Cómo se nombra un equipo suelto: "Agregar taladro". */
  singular: string;
  subtitulo: string;
  /** Nombre del icono lucide, resuelto en el cliente. */
  icono: string;
  escala: EscalaId;
  /** "chequeo": lista de ítems calificados. "inventario": conteo de elementos. */
  modo: "chequeo" | "inventario";
  identificacion: CampoIdentificacion[];
  items: ItemChequeo[];
  /** Un solo bloque por permiso, sin identificación: no se agregan ni eliminan equipos. */
  unico?: boolean;
  inventario?: ElementoInventario[];
  /** Bloque de EPP a marcar, propio del formato de la máquina de soldar. */
  epp?: { id: string; label: string }[];
  /** Rótulo que se estampa cuando algún ítem queda en estado crítico. */
  etiquetaCritica: string;
  /** Notas del formato original que deben viajar al PDF. */
  notas?: string[];
  /** Tabla de referencia del formato original (pulidora: disco y revoluciones). */
  referencia?: { titulo: string; columnas: string[]; filas: string[][] };
};

// ─── Elementos de protección personal ───────────────────────────────────────

const EPP: HerramientaPreop = {
  id: "epp",
  nombre: "Elementos de protección personal",
  singular: "dotación de EPP",
  subtitulo: "Inspección de la dotación antes de iniciar la labor",
  icono: "HardHat",
  escala: "si_no",
  modo: "chequeo",
  unico: true,
  etiquetaCritica: "REQUIERE REPOSICIÓN",
  identificacion: [],
  items: [
    // 1. Casco de seguridad
    { id: "casco_casquete", texto: "Está en buen estado el casquete", grupo: "Casco de seguridad" },
    { id: "casco_tafilete", texto: "Está en buen estado el tafilete o araña", grupo: "Casco de seguridad" },
    { id: "casco_barbuquejo", texto: "Está en buen estado el barbuquejo", grupo: "Casco de seguridad" },

    // 2. Botas de seguridad
    { id: "botas_cubierta", texto: "Está en buen estado la cubierta", grupo: "Botas de seguridad" },
    { id: "botas_suela", texto: "Está en buen estado la suela", grupo: "Botas de seguridad" },
    { id: "botas_riesgo", texto: "Son adecuadas para el riesgo", grupo: "Botas de seguridad" },

    // 3. Guantes y/o kit guantes de seguridad
    { id: "guantes_material", texto: "Buen estado de material", grupo: "Guantes y/o kit guantes de seguridad" },
    { id: "guantes_riesgo", texto: "Son adecuados para el riesgo", grupo: "Guantes y/o kit guantes de seguridad" },
    { id: "guantes_prueba_aire", texto: "A algunas partes se les han realizado pruebas de aire", grupo: "Guantes y/o kit guantes de seguridad" },
    { id: "guantes_piezas", texto: "Cuenta con el número de piezas", grupo: "Guantes y/o kit guantes de seguridad" },
    { id: "guantes_sin_danos", texto: "Sin cortes, grietas, desgarros, abrasiones, contaminación u otros", grupo: "Guantes y/o kit guantes de seguridad" },

    // 4. Careta dieléctrica
    { id: "careta_estado", texto: "El estado general es bueno", grupo: "Careta dieléctrica" },
    { id: "careta_rayaduras", texto: "Se encuentra sin rayaduras, desgaste y/o deformaciones", grupo: "Careta dieléctrica" },
    { id: "careta_barbuquejo", texto: "Cuenta con barbuquejo", grupo: "Careta dieléctrica" },
    { id: "careta_ajuste", texto: "Se ajusta adecuadamente", grupo: "Careta dieléctrica" },

    // 5. Gafas de seguridad
    { id: "gafas_cortes", texto: "Sin cortes o rotura", grupo: "Gafas de seguridad" },
    { id: "gafas_desgaste", texto: "Se encuentra sin desgaste, deformación o rayadura de lentes", grupo: "Gafas de seguridad" },
    { id: "gafas_ajuste", texto: "Se ajusta adecuadamente", grupo: "Gafas de seguridad" },
    { id: "gafas_montura", texto: "Montura partida o vencida", grupo: "Gafas de seguridad", criticoCuando: "si" },

    // 6. Protectores auditivos
    { id: "auditivos_desgaste", texto: "Se encuentra sin desgaste o deformaciones", grupo: "Protectores auditivos" },
    { id: "auditivos_ajuste", texto: "Se ajusta adecuadamente", grupo: "Protectores auditivos" },
    { id: "auditivos_riesgo", texto: "Adecuado para el riesgo", grupo: "Protectores auditivos" },

    // 7. Ropa de trabajo
    { id: "ropa_riesgo", texto: "Adecuada para el riesgo", grupo: "Ropa de trabajo" },
    { id: "ropa_estado", texto: "Estado general", grupo: "Ropa de trabajo" },
    { id: "ropa_fibras", texto: "Fibras cortadas o desgastadas", grupo: "Ropa de trabajo", criticoCuando: "si" },
    { id: "ropa_aseo", texto: "Aseo e higiene", grupo: "Ropa de trabajo" },

    // 8. Protección respiratoria
    { id: "respiratoria_desgaste", texto: "Se encuentra sin desgaste o deformaciones", grupo: "Protección respiratoria" },
    { id: "respiratoria_ajuste", texto: "Se ajusta adecuadamente", grupo: "Protección respiratoria" },
    { id: "respiratoria_riesgo", texto: "Adecuado para el riesgo", grupo: "Protección respiratoria" },
    { id: "respiratoria_partes", texto: "Sus partes se encuentran en buen estado", grupo: "Protección respiratoria" },
  ],
  notas: [
    "Esta lista se deberá diligenciar diariamente en el sitio de trabajo, antes de iniciar la labor.",
    "Todo elemento marcado como hallazgo debe retirarse de uso y reponerse antes de iniciar la labor.",
  ],
};

// ─── Taladro percutor ───────────────────────────────────────────────────────

const TALADRO: HerramientaPreop = {
  id: "taladro",
  nombre: "Taladro percutor",
  singular: "taladro",
  subtitulo: "Verificación previa al uso de taladros percutores",
  icono: "Drill",
  escala: "bueno_malo",
  modo: "chequeo",
  etiquetaCritica: "FUERA DE SERVICIO",
  identificacion: [
    { id: "numero", label: "Taladro percutor N°" },
    { id: "marca", label: "Marca" },
  ],
  items: [
    { id: "conexiones", texto: "Se verificó el estado de conexiones eléctricas (extensiones, cables, toma)" },
    { id: "broca_instalacion", texto: "Estado de instalación de la broca (insertación)" },
    { id: "acoples", texto: "Cuenta con acoples adecuados para los accesorios" },
    { id: "mango", texto: "Estado e instalación del mango" },
    { id: "interruptor", texto: "Estado del interruptor de encendido y su seguro" },
    { id: "cable", texto: "Estado del cable de alimentación" },
    { id: "rpm", texto: "Se utilizan accesorios apropiados para las RPM (8.500 - 15.000)" },
    { id: "accesorios_tarea", texto: "Se utilizan accesorios apropiados para la tarea" },
    { id: "estado_general", texto: "Estado general del taladro (fisuras, roturas, aseo, etc.)" },
    { id: "epp", texto: "Se utilizan adecuadamente los EPP para la labor" },
    { id: "barreras", texto: "Se han instalado barreras y/o aislamientos apropiados" },
    { id: "brocas", texto: "Estado de las brocas" },
  ],
  notas: [
    "Esta lista se deberá diligenciar diariamente en el sitio de trabajo, antes de iniciar la labor.",
  ],
};

// ─── Pulidora ───────────────────────────────────────────────────────────────

const PULIDORA: HerramientaPreop = {
  id: "pulidora",
  nombre: "Pulidora",
  singular: "pulidora",
  subtitulo: "Inspección preoperacional de pulidora",
  icono: "Disc3",
  escala: "si_no",
  modo: "chequeo",
  etiquetaCritica: "FUERA DE SERVICIO",
  identificacion: [
    { id: "modelo", label: "Modelo" },
    { id: "serial", label: "Serial" },
  ],
  items: [
    { id: "interruptor", texto: "Interruptor o gatillo" },
    { id: "cable", texto: "Cable de alimentación" },
    { id: "mango", texto: "Mango de agarre" },
    { id: "carcasa", texto: "Carcasa" },
    { id: "mango_auxiliar", texto: "Mango auxiliar (soporte)" },
    { id: "tapa_carbones", texto: "Tapa de inspección de carbones" },
    { id: "bloqueo_husillo", texto: "Botón de bloqueo o freno de husillo" },
    { id: "guarda", texto: "Guarda de seguridad del disco" },
    { id: "brida", texto: "Brida plana de bloqueo para el disco" },
  ],
  notas: [
    "Verificar el estado adecuado del disco, observando que no presente fisuras.",
    "Utilice de manera adecuada los EPP: gafas UV, careta de esmeril, visera de celulosa, protección auditiva, protección respiratoria, delantal de carnaza, guantes de carnaza, camisa manga larga y botas de seguridad.",
  ],
  referencia: {
    titulo: "Revoluciones máximas según el disco de corte y desbaste",
    columnas: ["Disco", "Revoluciones", "Disco", "Revoluciones"],
    filas: [
      ["3", "20.000 RPM", "10", "6.015 RPM"],
      ["4 1/2", "13.370 RPM", "12", "5.013 RPM"],
      ["7", "8.593 RPM", "14", "4.297 RPM"],
      ["9", "6.684 RPM", "", ""],
    ],
  },
};

// ─── Extensiones eléctricas ─────────────────────────────────────────────────

const EXTENSIONES: HerramientaPreop = {
  id: "extensiones",
  nombre: "Extensiones eléctricas",
  singular: "extensión",
  subtitulo: "Inspección preoperacional de extensiones",
  icono: "Cable",
  escala: "bueno_malo",
  modo: "chequeo",
  etiquetaCritica: "FUERA DE SERVICIO",
  identificacion: [
    { id: "longitud", label: "Longitud de la extensión" },
    { id: "identificador", label: "Identificación o número" },
  ],
  items: [
    { id: "conectores", texto: "Estado de los conectores (macho y hembra)" },
    { id: "tierra", texto: "Conexión a tierra" },
    { id: "forros", texto: "Los forros aislantes están en buenas condiciones" },
    { id: "tendido", texto: "Su tendido está protegido del tránsito de vehículos y/o maquinaria" },
    { id: "cableado", texto: "Estado del cableado en buenas condiciones" },
    { id: "humedad", texto: "No está en contacto con derrame de líquidos o superficies húmedas" },
    { id: "conectores_acordes", texto: "Sus conectores son acordes con el cableado" },
  ],
  notas: [
    "La inspección preoperacional debe realizarla únicamente el operador del equipo. En caso de necesitar ayuda adicional debe informarle a su supervisor.",
  ],
};

// ─── Máquina de soldar ──────────────────────────────────────────────────────

const MAQUINA_SOLDAR: HerramientaPreop = {
  id: "maquina_soldar",
  nombre: "Máquina de soldar",
  singular: "máquina de soldar",
  subtitulo: "Inspección de máquina de soldar portátil",
  icono: "Zap",
  escala: "estado_tres",
  modo: "chequeo",
  etiquetaCritica: "FUERA DE SERVICIO",
  identificacion: [
    { id: "numero", label: "Número" },
    { id: "ubicacion", label: "Ubicación" },
    { id: "capacidad", label: "Capacidad" },
    { id: "modelo", label: "Modelo" },
    { id: "marca", label: "Marca" },
    { id: "serie", label: "N° de serie" },
  ],
  items: [
    { id: "clavija", texto: "Clavija de alimentación" },
    { id: "cable_alimentacion", texto: "Cable de alimentación" },
    { id: "interruptor", texto: "Interruptor principal" },
    { id: "regulador", texto: "Maneral del regulador de amperaje" },
    { id: "cable_tierra", texto: "Cable para tierra" },
    { id: "bornes", texto: "Bornes de salida" },
    { id: "cable_portaelectrodo", texto: "Cable para portaelectrodo" },
    { id: "zapata_portaelectrodo", texto: "Zapata del cable portaelectrodo" },
    { id: "zapata_tierra", texto: "Zapata del cable de tierra" },
    { id: "pinza_portaelectrodo", texto: "Pinza portaelectrodo (maneral)" },
    { id: "pinza_tierra", texto: "Pinza para tierra física (maneral)" },
    { id: "roscado_zapatas", texto: "Elemento roscado para ajuste de zapatas" },
    { id: "armazon", texto: "Armazón / estructura general" },
    { id: "manometro", texto: "Manómetro / flujómetro" },
    { id: "antorcha", texto: "Antorcha para argón" },
    { id: "careta", texto: "Careta para soldar" },
    { id: "zona_seca", texto: "Ubicación en zona seca" },
    { id: "acceso", texto: "Fácil acceso al equipo" },
    { id: "extintor", texto: "Extintor" },
    { id: "ventilador", texto: "Ventilador" },
  ],
  epp: [
    { id: "uniforme", label: "Uniforme" },
    { id: "casco", label: "Casco con barbiquejo" },
    { id: "lentes", label: "Lentes / goggles" },
    { id: "careta_facial", label: "Careta facial" },
    { id: "guantes_piel", label: "Guantes de piel / carnaza" },
    { id: "guantes_hule", label: "Guantes de hule / neopreno" },
    { id: "guantes_tela", label: "Guantes de tela con neopreno (genérico)" },
    { id: "guantes_anticorte", label: "Guantes anticorte" },
    { id: "mangas_kevlar", label: "Mangas de kevlar" },
    { id: "mandil", label: "Mandil de plástico" },
    { id: "traje_tyvek", label: "Traje Tyvek" },
    { id: "chaleco", label: "Chaleco de alta visibilidad clase II" },
    { id: "zapato", label: "Zapato de seguridad" },
    { id: "auditiva", label: "Protección auditiva (tapones)" },
    { id: "mascara", label: "Máscara con filtro / desechables" },
    { id: "equipo_dielectrico", label: "Equipo dieléctrico" },
    { id: "arnes", label: "Arnés de cuerpo completo" },
  ],
  notas: [
    "Cuando un elemento se encuentra en buen estado es porque es nuevo o presenta poco tiempo de uso y ha sido cuidado con amplitud.",
    "Al encontrar un elemento en estado aceptable se concluye que es un elemento con algún tiempo de servicio que aún cumple con las cualidades mínimas para seguir usándose. Un elemento en mal estado ya no reúne estas características, por lo que debe ser retirado de forma inmediata del área de trabajo para impedir que se continúe usando.",
  ],
};

// ─── Botiquín ───────────────────────────────────────────────────────────────

const BOTIQUIN: HerramientaPreop = {
  id: "botiquin",
  nombre: "Botiquín",
  singular: "botiquín",
  subtitulo: "Verificación de dotación y vencimientos",
  icono: "BriefcaseMedical",
  escala: "si_no",
  modo: "inventario",
  etiquetaCritica: "REQUIERE REPOSICIÓN",
  identificacion: [
    { id: "ubicacion", label: "Ubicación del botiquín", full: true },
    { id: "responsable", label: "Responsable" },
  ],
  items: [],
  inventario: [
    { id: "yodopovidona", nombre: "Yodopovidona 120 ml solución antiséptico", presentacion: "Frasco", requerida: 1 },
    { id: "agua_oxigenada", nombre: "Agua oxigenada mediano 120 ml", presentacion: "Frasco", requerida: 1 },
    { id: "alcohol", nombre: "Alcohol mediano 250 ml", presentacion: "Frasco", requerida: 1 },
    { id: "gasas", nombre: "Gasas esterilizadas de 10 cm x 10 cm", presentacion: "Paquete", requerida: 5 },
    { id: "apositos", nombre: "Apósitos", presentacion: "Paquete", requerida: 8 },
    { id: "esparadrapo", nombre: "Esparadrapo 5 cm x 4,5 m", presentacion: "Rollo", requerida: 1 },
    { id: "venda_3", nombre: "Venda elástica de 3 pulgadas x 5 yardas", presentacion: "Rollo", requerida: 2 },
    { id: "venda_4", nombre: "Venda elástica de 4 pulgadas x 5 yardas", presentacion: "Rollo", requerida: 2 },
    { id: "algodon", nombre: "Algodón x 100 g", presentacion: "Paquete", requerida: 1 },
    { id: "venda_triangular", nombre: "Venda triangular", presentacion: "Und", requerida: 1 },
    { id: "venditas", nombre: "Venditas autoadhesivas", presentacion: "Und", requerida: 20 },
    { id: "paletas", nombre: "Paletas baja lengua (para entablillado de dedos)", presentacion: "Und", requerida: 10 },
    { id: "cloruro_sodio", nombre: "Solución de cloruro de sodio al 9/1000 x 1 litro (para lavado de heridas)", presentacion: "Frasco", requerida: 1 },
    { id: "jelonet", nombre: "Gasa tipo jelonet (para quemaduras)", presentacion: "Paquete", requerida: 2 },
    { id: "colirio", nombre: "Colirio de 10 ml", presentacion: "Frasco", requerida: 2 },
    { id: "tijera", nombre: "Tijera punta roma", presentacion: "Und", requerida: 1 },
    { id: "pinza", nombre: "Pinza", presentacion: "Und", requerida: 1 },
    { id: "camilla", nombre: "Camilla rígida", presentacion: "Und", requerida: 1 },
    { id: "frazada", nombre: "Frazada", presentacion: "Und", requerida: 1 },
  ],
  notas: [
    "Registre la cantidad encontrada de cada elemento y la fecha de vencimiento más próxima. Los faltantes y los elementos vencidos se resaltan en el permiso.",
  ],
};

// ─── Catálogo ───────────────────────────────────────────────────────────────

export const HERRAMIENTAS_PREOP: HerramientaPreop[] = [
  EPP,
  TALADRO,
  PULIDORA,
  EXTENSIONES,
  MAQUINA_SOLDAR,
  BOTIQUIN,
];

export function getHerramientaPreop(id: string): HerramientaPreop | undefined {
  return HERRAMIENTAS_PREOP.find((h) => h.id === id);
}

/** Etiqueta corta de una respuesta, para el PDF. */
export function etiquetaCorta(escala: EscalaId, valor: string): string {
  return ESCALAS[escala].opciones.find((o) => o.id === valor)?.corto ?? "—";
}

/**
 * Opción que constituye hallazgo para este ítem: la que el propio ítem declara
 * al estar redactado como defecto, o si no la crítica de la escala.
 */
export function valorCritico(escala: EscalaId, item: ItemChequeo): string {
  return item.criticoCuando ?? ESCALAS[escala].critico;
}

export type GrupoItems = { grupo: string | null; items: { item: ItemChequeo; codigo: string }[] };

/**
 * Agrupa los ítems de una herramienta por `grupo`, numerando por posición
 * (1.1, 1.2, 2.1…). Sin grupos declarados, devuelve un solo grupo sin título.
 */
export function itemsPorGrupo(herramienta: HerramientaPreop): GrupoItems[] {
  const grupos: GrupoItems[] = [];
  let numGrupo = 0;
  let ultimoGrupo: string | null | undefined;

  herramienta.items.forEach((item) => {
    const grupo = item.grupo ?? null;
    if (grupo !== ultimoGrupo) {
      numGrupo += 1;
      grupos.push({ grupo, items: [] });
      ultimoGrupo = grupo;
    }
    const actual = grupos[grupos.length - 1];
    const codigo = grupo ? `${numGrupo}.${actual.items.length + 1}` : "";
    actual.items.push({ item, codigo });
  });

  return grupos;
}

/** Certificación que firma quien realiza la inspección. */
export const CERTIFICACION_OPERADOR =
  "Como operador he verificado la totalidad de la lista y certifico que las condiciones aquí registradas corresponden al estado real de los equipos al inicio de la labor. Me comprometo a no utilizar ningún equipo marcado fuera de servicio y a reportarlo de inmediato a mi supervisor.";

// ─── Estado de un equipo inspeccionado ──────────────────────────────────────
// Estas formas viven en el catálogo —y no junto al PDF— para que el formulario
// pueda evaluarlas sin arrastrar @react-pdf/renderer al bundle principal.

export type EquipoPreop = {
  /** Campos de `identificacion` de la herramienta: id del campo → valor. */
  identificacion: Record<string, string>;
  /** Id del ítem → id de la opción de la escala. */
  respuestas: Record<string, string>;
  /** Solo máquina de soldar: EPP marcados. */
  epp: string[];
  /** Solo botiquín: id del elemento → cantidad encontrada y vencimiento (YYYY-MM). */
  inventario: Record<string, { cantidad: string; vence: string }>;
  observaciones: string;
};

export type EstadoHerramientaPreop = {
  noAplica: boolean;
  equipos: EquipoPreop[];
};

export function equipoVacio(): EquipoPreop {
  return { identificacion: {}, respuestas: {}, epp: [], inventario: {}, observaciones: "" };
}

/** Ítems calificados con el valor crítico de la escala (malo / no / mal estado). */
export function itemsCriticos(herramienta: HerramientaPreop, equipo: EquipoPreop): ItemChequeo[] {
  return herramienta.items.filter(
    (item) => equipo.respuestas[item.id] === valorCritico(herramienta.escala, item),
  );
}

/** Elementos del botiquín con menos unidades de las exigidas. */
export function elementosFaltantes(
  herramienta: HerramientaPreop,
  equipo: EquipoPreop,
): ElementoInventario[] {
  return (herramienta.inventario ?? []).filter((el) => {
    const registro = equipo.inventario[el.id];
    if (!registro || registro.cantidad === "") return false;
    return Number(registro.cantidad) < el.requerida;
  });
}

/** Elementos del botiquín vencidos o que vencen dentro del mes en curso. */
export function elementosVencidos(
  herramienta: HerramientaPreop,
  equipo: EquipoPreop,
  hoy: string,
): ElementoInventario[] {
  const mesActual = hoy.slice(0, 7); // YYYY-MM
  return (herramienta.inventario ?? []).filter((el) => {
    const vence = equipo.inventario[el.id]?.vence;
    return Boolean(vence) && vence <= mesActual;
  });
}

/**
 * Un equipo queda fuera de servicio si algún ítem está en el valor crítico de
 * su escala; un botiquín, si le faltan elementos o tiene vencidos.
 */
export function esEquipoCritico(
  herramienta: HerramientaPreop,
  equipo: EquipoPreop,
  hoy: string,
): boolean {
  if (herramienta.modo === "inventario") {
    return (
      elementosFaltantes(herramienta, equipo).length > 0 ||
      elementosVencidos(herramienta, equipo, hoy).length > 0
    );
  }
  return itemsCriticos(herramienta, equipo).length > 0;
}

/** Ítems del equipo aún sin calificar. */
export function itemsSinResponder(
  herramienta: HerramientaPreop,
  equipo: EquipoPreop,
): ItemChequeo[] {
  return herramienta.items.filter((item) => !equipo.respuestas[item.id]);
}

/** Elementos del botiquín sin cantidad registrada. */
export function elementosSinContar(
  herramienta: HerramientaPreop,
  equipo: EquipoPreop,
): ElementoInventario[] {
  return (herramienta.inventario ?? []).filter(
    (el) => (equipo.inventario[el.id]?.cantidad ?? "") === "",
  );
}

/** Rótulo del equipo dentro de la herramienta: "Taladro 2 · N° 1184". */
export function nombreEquipo(
  herramienta: HerramientaPreop,
  equipo: EquipoPreop,
  indice: number,
): string {
  if (herramienta.unico) return herramienta.nombre;
  const identificadores = herramienta.identificacion
    .map((campo) => equipo.identificacion[campo.id]?.trim())
    .filter(Boolean);
  const base = `${herramienta.nombre} ${indice + 1}`;
  return identificadores.length > 0 ? `${base} · ${identificadores.join(" · ")}` : base;
}
