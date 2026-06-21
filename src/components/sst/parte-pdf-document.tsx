"use client";

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Svg,
  Rect,
  Line,
  Polyline,
  Circle,
  pdf,
} from "@react-pdf/renderer";
import { getLogoSrc } from "@/lib/pdf-logo";
import { ACTIUM_PDF, registerActiumFonts } from "@/lib/pdf-fonts";

registerActiumFonts();

// ─── Tipos de datos del parte (serializables) ────────────────────────────────

export type ParteInasistencia = {
  nombre: string;
  cargo: string;
  tipo: string;
  razon: string;
};

export type ParteEvento = {
  tipo: string;
  severidad: string;
  descripcion: string;
  involucrado: string;
};

export type ParteNotaCampo = {
  contenido: string;
  autor: string | null;
  importante: boolean;
};

export type ParteFoto = {
  url: string;
  descripcion: string | null;
};

export type ParteSeriePunto = { etiqueta: string; real: number; proyectado: number };

export type PartePDFData = {
  proyectoNombre: string;
  fecha: string;
  programado: number;
  presentes: number;
  ausentes: number;
  inasistencias: ParteInasistencia[];
  incidentes: ParteEvento[];
  accidentes: ParteEvento[];
  observaciones: string | null;
  avance?: { real: number; proyectado: number } | null;
  avanceSemana?: ParteSeriePunto[];
  avanceProyecto?: ParteSeriePunto[];
  notasCampo?: ParteNotaCampo[];
  fotos?: ParteFoto[];
};

// ─── Paleta sobria: café + beige de base, naranja como único acento, ──────────
// rojo reservado para estados críticos (accidentes).
const INK = ACTIUM_PDF.graphite; // texto principal
const COFFEE = ACTIUM_PDF.espresso; // títulos, headers de tabla
const COFFEE_2 = ACTIUM_PDF.saddle; // labels, acentos secundarios
const BEIGE = ACTIUM_PDF.seashell; // fondos suaves
const BEIGE_ROW = ACTIUM_PDF.beigeRow; // filas alternas
const BORDER = ACTIUM_PDF.beigeBorder; // bordes cálidos
const ACCENT = ACTIUM_PDF.orange; // único acento (dato real / asistencia)
const MUTED = ACTIUM_PDF.gray; // texto secundario, serie proyectada
const TRACK = "#E7D9C6"; // pista beige de barras / serie proyectada
const CRITICAL = ACTIUM_PDF.red; // solo accidentes

const TIPO_AUSENCIA_LABEL: Record<string, string> = {
  medico: "Médica",
  incapacidad: "Incapacidad",
  personal: "Personal",
  vacaciones: "Vacaciones",
  otro: "Otra",
};

const TIPO_EVENTO_LABEL: Record<string, string> = {
  incidente: "Incidente",
  accidente: "Accidente",
  casi_accidente: "Casi accidente",
};

function fechaLarga(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function pct(parte: number, total: number): number {
  return total > 0 ? Math.round((parte / total) * 100) : 0;
}

// Ancho útil de la página A4 (595pt − 2·40 de margen).
const CONTENT_W = 515;

// ─── Estilos PDF ──────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: { paddingTop: 34, paddingBottom: 46, paddingHorizontal: 40, fontSize: 9, color: INK, fontFamily: "Manrope" },

  // Cabecera
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: COFFEE, paddingBottom: 10, marginBottom: 4 },
  brandLogo: { width: 116, height: 31, objectFit: "contain" },
  brandSub: { fontSize: 6.5, color: MUTED, letterSpacing: 2, marginTop: 3, textTransform: "uppercase" },
  docTitle: { fontSize: 13, fontFamily: "Manrope", fontWeight: 700, color: COFFEE, textAlign: "right" },
  docMeta: { fontSize: 8, color: MUTED, textAlign: "right", marginTop: 2 },

  // Secciones
  sectionTitle: { fontSize: 8.5, fontFamily: "Manrope", fontWeight: 700, color: COFFEE, textTransform: "uppercase", letterSpacing: 1, marginBottom: 7, marginTop: 16 },
  sectionRule: { borderBottomWidth: 0.5, borderBottomColor: BORDER, marginTop: 3, marginBottom: 7 },

  // KPIs
  kpiRow: { flexDirection: "row", gap: 6 },
  kpiCard: { flex: 1, borderWidth: 0.5, borderColor: BORDER, backgroundColor: BEIGE, borderRadius: 5, paddingVertical: 8, paddingHorizontal: 6, alignItems: "center" },
  kpiLabel: { fontSize: 6, color: COFFEE_2, textTransform: "uppercase", letterSpacing: 0.8, fontFamily: "Manrope", fontWeight: 700, marginBottom: 3 },
  kpiValue: { fontSize: 17, fontFamily: "Manrope", fontWeight: 700, color: INK },
  kpiUnit: { fontSize: 7, color: MUTED },

  // Gráficas
  chartCard: { borderWidth: 0.5, borderColor: BORDER, borderRadius: 6, padding: 10 },
  chartHint: { fontSize: 6.5, color: MUTED, marginBottom: 6 },
  axisRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  axisLabel: { fontSize: 6, color: MUTED, fontFamily: "Manrope", fontWeight: 700 },
  legendRow: { flexDirection: "row", gap: 16, marginTop: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontSize: 7.5, color: INK },
  legendStrong: { fontSize: 7.5, color: INK, fontFamily: "Manrope", fontWeight: 700 },

  // Tablas
  table: { borderWidth: 0.5, borderColor: BORDER, borderRadius: 5, overflow: "hidden" },
  trHead: { flexDirection: "row", backgroundColor: COFFEE },
  thText: { color: "#FFFFFF", fontSize: 6.5, fontFamily: "Manrope", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, paddingVertical: 5, paddingHorizontal: 6 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: BORDER },
  trAlt: { backgroundColor: BEIGE_ROW },
  td: { fontSize: 8, paddingVertical: 4.5, paddingHorizontal: 6, color: "#3A3A3A" },
  empty: { fontSize: 8, color: MUTED, fontStyle: "italic", paddingVertical: 9, paddingHorizontal: 6 },

  // Texto / notas
  obsBox: { borderWidth: 0.5, borderColor: BORDER, backgroundColor: BEIGE, borderRadius: 6, padding: 10, fontSize: 9, color: "#3A3A3A", lineHeight: 1.4 },
  notaItem: { borderWidth: 0.5, borderColor: BORDER, borderRadius: 5, padding: 8, marginBottom: 5 },
  notaImportante: { borderLeftWidth: 2, borderLeftColor: ACCENT },
  notaTag: { fontSize: 6, color: ACCENT, fontFamily: "Manrope", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  notaMeta: { fontSize: 6.5, color: MUTED, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 3 },

  // Fotos
  fotoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  fotoCell: { width: 162, borderWidth: 0.5, borderColor: BORDER, borderRadius: 5, overflow: "hidden" },
  fotoImg: { width: 162, height: 108, objectFit: "cover" },
  fotoCap: { fontSize: 6.5, color: MUTED, padding: 4 },

  // Pie
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: BORDER, paddingTop: 6 },
  footerText: { fontSize: 7, color: MUTED },
});

// ─── Gráficas nativas (SVG de react-pdf) ──────────────────────────────────────

/** Barra horizontal de progreso: relleno de acento sobre pista beige. */
function BarraProgreso({ porcentaje, height = 20 }: { porcentaje: number; height?: number }) {
  const w = Math.max(0, Math.min(1, porcentaje / 100)) * CONTENT_W;
  return (
    <Svg width={CONTENT_W} height={height}>
      <Rect x={0} y={0} width={CONTENT_W} height={height} rx={4} fill={TRACK} />
      {w > 0 && <Rect x={0} y={0} width={w} height={height} rx={4} fill={ACCENT} />}
    </Svg>
  );
}

/** Barra apilada de dos segmentos (p. ej. incidentes vs accidentes). */
function BarraApilada({
  segmentos,
  height = 18,
}: {
  segmentos: { valor: number; color: string }[];
  height?: number;
}) {
  const total = Math.max(1, segmentos.reduce((acc, x) => acc + x.valor, 0));
  let x = 0;
  return (
    <Svg width={CONTENT_W} height={height}>
      <Rect x={0} y={0} width={CONTENT_W} height={height} rx={4} fill={TRACK} />
      {segmentos.map((seg, i) => {
        const w = (seg.valor / total) * CONTENT_W;
        const rect = w > 0 ? <Rect key={i} x={x} y={0} width={w} height={height} fill={seg.color} /> : null;
        x += w;
        return rect;
      })}
    </Svg>
  );
}

/** Gráfica de líneas: serie real (acento) vs proyectada (punteada, gris). */
function GraficaLineas({
  puntos,
  height = 120,
  mostrarPuntos = true,
}: {
  puntos: ParteSeriePunto[];
  height?: number;
  mostrarPuntos?: boolean;
}) {
  const n = puntos.length;
  const maxVal = Math.max(1, ...puntos.map((p) => Math.max(p.real, p.proyectado)));
  const padTop = 8;
  const plotH = height - padTop;
  const xAt = (i: number) => (n <= 1 ? CONTENT_W / 2 : (i / (n - 1)) * CONTENT_W);
  const yAt = (v: number) => padTop + (plotH - (v / maxVal) * plotH);

  const ptsReal = puntos.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.real).toFixed(1)}`).join(" ");
  const ptsProy = puntos.map((p, i) => `${xAt(i).toFixed(1)},${yAt(p.proyectado).toFixed(1)}`).join(" ");

  return (
    <Svg width={CONTENT_W} height={height}>
      {/* Líneas de referencia */}
      <Line x1={0} y1={padTop} x2={CONTENT_W} y2={padTop} stroke={BORDER} strokeWidth={0.5} strokeDasharray="2 3" />
      <Line x1={0} y1={padTop + plotH / 2} x2={CONTENT_W} y2={padTop + plotH / 2} stroke={BORDER} strokeWidth={0.5} strokeDasharray="2 3" />
      <Line x1={0} y1={height} x2={CONTENT_W} y2={height} stroke={BORDER} strokeWidth={1} />
      {/* Serie proyectada */}
      <Polyline points={ptsProy} fill="none" stroke={MUTED} strokeWidth={1} strokeDasharray="3 2" />
      {/* Serie real */}
      <Polyline points={ptsReal} fill="none" stroke={ACCENT} strokeWidth={1.5} />
      {mostrarPuntos &&
        puntos.map((p, i) => <Circle key={i} cx={xAt(i)} cy={yAt(p.real)} r={2} fill={ACCENT} />)}
    </Svg>
  );
}

function LeyendaRealProyectado() {
  return (
    <View style={s.legendRow}>
      <View style={s.legendItem}>
        <View style={[s.legendDot, { backgroundColor: ACCENT }]} />
        <Text style={s.legendText}>Real</Text>
      </View>
      <View style={s.legendItem}>
        <View style={[s.legendDot, { backgroundColor: MUTED }]} />
        <Text style={s.legendText}>Proyectado</Text>
      </View>
    </View>
  );
}

// ─── Documento ────────────────────────────────────────────────────────────────

function ParteDocument({ data }: { data: PartePDFData }) {
  const asistencia = pct(data.presentes, data.programado);
  const eventos = [...data.accidentes, ...data.incidentes];
  const semana = data.avanceSemana ?? [];
  const proyecto = data.avanceProyecto ?? [];

  return (
    <Document title={`Parte SST ${data.proyectoNombre} ${data.fecha}`}>
      <Page size="A4" style={s.page}>
        {/* Cabecera */}
        <View style={s.header} fixed>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={getLogoSrc()} style={s.brandLogo} />
            <Text style={s.brandSub}>Infraestructura y Activos</Text>
          </View>
          <View>
            <Text style={s.docTitle}>Parte Diario SST</Text>
            <Text style={s.docMeta}>{data.proyectoNombre}</Text>
            <Text style={[s.docMeta, { textTransform: "capitalize" }]}>{fechaLarga(data.fecha)}</Text>
          </View>
        </View>

        {/* Resumen del día */}
        <Text style={s.sectionTitle}>Resumen del día</Text>
        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Programado</Text>
            <Text style={s.kpiValue}>{data.programado}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Presentes</Text>
            <Text style={s.kpiValue}>{data.presentes}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Ausentes</Text>
            <Text style={s.kpiValue}>{data.ausentes}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Incidentes</Text>
            <Text style={s.kpiValue}>{data.incidentes.length}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Accidentes</Text>
            <Text style={[s.kpiValue, data.accidentes.length > 0 ? { color: CRITICAL } : {}]}>
              {data.accidentes.length}
            </Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Asistencia</Text>
            <Text style={[s.kpiValue, { color: ACCENT }]}>{asistencia}%</Text>
          </View>
        </View>

        {/* Asistencia a operación */}
        <Text style={s.sectionTitle}>Asistencia a operación</Text>
        <View style={s.chartCard}>
          <Text style={s.chartHint}>Cumplimiento de asistencia frente al personal programado</Text>
          <BarraProgreso porcentaje={asistencia} />
          <View style={s.legendRow}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: ACCENT }]} />
              <Text style={s.legendText}>
                Presentes <Text style={s.legendStrong}>{data.presentes}</Text>
              </Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: TRACK }]} />
              <Text style={s.legendText}>
                Ausentes <Text style={s.legendStrong}>{data.ausentes}</Text>
              </Text>
            </View>
            <View style={s.legendItem}>
              <Text style={s.legendText}>
                Asistencia <Text style={[s.legendStrong, { color: ACCENT }]}>{asistencia}%</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Eventos del día */}
        <Text style={s.sectionTitle}>Eventos del día</Text>
        <View style={s.chartCard}>
          {eventos.length === 0 ? (
            <Text style={s.empty}>Sin incidentes ni accidentes registrados este día.</Text>
          ) : (
            <>
              <BarraApilada
                segmentos={[
                  { valor: data.incidentes.length, color: COFFEE_2 },
                  { valor: data.accidentes.length, color: CRITICAL },
                ]}
              />
              <View style={s.legendRow}>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: COFFEE_2 }]} />
                  <Text style={s.legendText}>
                    Incidentes <Text style={s.legendStrong}>{data.incidentes.length}</Text>
                  </Text>
                </View>
                <View style={s.legendItem}>
                  <View style={[s.legendDot, { backgroundColor: CRITICAL }]} />
                  <Text style={s.legendText}>
                    Accidentes <Text style={[s.legendStrong, { color: CRITICAL }]}>{data.accidentes.length}</Text>
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Avance del día */}
        {data.avance ? (
          <>
            <Text style={s.sectionTitle}>Avance del día</Text>
            <View style={s.chartCard}>
              <View style={[s.kpiRow, { marginBottom: 8 }]}>
                <View style={s.kpiCard}>
                  <Text style={s.kpiLabel}>Proyectado</Text>
                  <Text style={s.kpiValue}>
                    {data.avance.proyectado} <Text style={s.kpiUnit}>MT</Text>
                  </Text>
                </View>
                <View style={s.kpiCard}>
                  <Text style={s.kpiLabel}>Real</Text>
                  <Text style={[s.kpiValue, { color: ACCENT }]}>
                    {data.avance.real} <Text style={s.kpiUnit}>MT</Text>
                  </Text>
                </View>
                <View style={s.kpiCard}>
                  <Text style={s.kpiLabel}>Cumplimiento</Text>
                  <Text style={s.kpiValue}>{pct(data.avance.real, data.avance.proyectado)}%</Text>
                </View>
              </View>
              <BarraProgreso porcentaje={pct(data.avance.real, data.avance.proyectado)} />
            </View>
          </>
        ) : null}

        {/* Desempeño semanal */}
        {semana.length > 0 ? (
          <>
            <Text style={s.sectionTitle}>Desempeño semanal (MT)</Text>
            <View style={s.chartCard} wrap={false}>
              <Text style={s.chartHint}>Avance real frente a lo proyectado en la semana</Text>
              <GraficaLineas puntos={semana} />
              <View style={s.axisRow}>
                {semana.map((p, i) => (
                  <Text key={i} style={s.axisLabel}>
                    {p.etiqueta}
                  </Text>
                ))}
              </View>
              <LeyendaRealProyectado />
            </View>
          </>
        ) : null}

        {/* Avance acumulado del proyecto */}
        {proyecto.length > 0 ? (
          <>
            <Text style={s.sectionTitle}>Avance acumulado del proyecto (MT)</Text>
            <View style={s.chartCard} wrap={false}>
              <Text style={s.chartHint}>Histórico de avance real frente a lo proyectado</Text>
              <GraficaLineas puntos={proyecto} mostrarPuntos={proyecto.length <= 16} />
              <View style={s.axisRow}>
                <Text style={s.axisLabel}>{proyecto[0]?.etiqueta}</Text>
                <Text style={s.axisLabel}>{proyecto.length} registros</Text>
                <Text style={s.axisLabel}>{proyecto[proyecto.length - 1]?.etiqueta}</Text>
              </View>
              <LeyendaRealProyectado />
            </View>
          </>
        ) : null}

        {/* Inasistencias */}
        <Text style={s.sectionTitle}>Inasistencias del día</Text>
        <View style={s.table}>
          <View style={s.trHead}>
            <Text style={[s.thText, { width: "30%" }]}>Trabajador</Text>
            <Text style={[s.thText, { width: "22%" }]}>Cargo</Text>
            <Text style={[s.thText, { width: "16%" }]}>Tipo</Text>
            <Text style={[s.thText, { width: "32%" }]}>Razón</Text>
          </View>
          {data.inasistencias.length === 0 ? (
            <Text style={s.empty}>Sin inasistencias registradas.</Text>
          ) : (
            data.inasistencias.map((a, i) => (
              <View key={i} style={[s.tr, i % 2 === 1 ? s.trAlt : {}]}>
                <Text style={[s.td, { width: "30%" }]}>{a.nombre}</Text>
                <Text style={[s.td, { width: "22%" }]}>{a.cargo || "—"}</Text>
                <Text style={[s.td, { width: "16%" }]}>{TIPO_AUSENCIA_LABEL[a.tipo] ?? a.tipo}</Text>
                <Text style={[s.td, { width: "32%" }]}>{a.razon}</Text>
              </View>
            ))
          )}
        </View>

        {/* Incidentes y accidentes */}
        <Text style={s.sectionTitle}>Incidentes y accidentes</Text>
        <View style={s.table}>
          <View style={s.trHead}>
            <Text style={[s.thText, { width: "16%" }]}>Tipo</Text>
            <Text style={[s.thText, { width: "14%" }]}>Severidad</Text>
            <Text style={[s.thText, { width: "24%" }]}>Involucrado</Text>
            <Text style={[s.thText, { width: "46%" }]}>Descripción</Text>
          </View>
          {eventos.length === 0 ? (
            <Text style={s.empty}>Sin incidentes ni accidentes registrados.</Text>
          ) : (
            eventos.map((e, i) => (
              <View key={i} style={[s.tr, i % 2 === 1 ? s.trAlt : {}]}>
                <Text style={[s.td, { width: "16%" }, e.tipo === "accidente" ? { color: CRITICAL, fontFamily: "Manrope", fontWeight: 700 } : {}]}>
                  {TIPO_EVENTO_LABEL[e.tipo] ?? e.tipo}
                </Text>
                <Text style={[s.td, { width: "14%", textTransform: "capitalize" }]}>{e.severidad}</Text>
                <Text style={[s.td, { width: "24%" }]}>{e.involucrado || "—"}</Text>
                <Text style={[s.td, { width: "46%" }]}>{e.descripcion}</Text>
              </View>
            ))
          )}
        </View>

        {/* Observaciones del parte */}
        {data.observaciones ? (
          <>
            <Text style={s.sectionTitle}>Observaciones del parte</Text>
            <View style={s.obsBox}>
              <Text>{data.observaciones}</Text>
            </View>
          </>
        ) : null}

        {/* Observaciones de campo */}
        {data.notasCampo && data.notasCampo.length > 0 ? (
          <>
            <Text style={s.sectionTitle}>Observaciones de campo</Text>
            {data.notasCampo.map((n, i) => (
              <View key={i} style={[s.notaItem, n.importante ? s.notaImportante : {}]} wrap={false}>
                {n.importante ? <Text style={s.notaTag}>Importante</Text> : null}
                <Text>{n.contenido}</Text>
                {n.autor ? <Text style={s.notaMeta}>— {n.autor}</Text> : null}
              </View>
            ))}
          </>
        ) : null}

        {/* Registro fotográfico */}
        {data.fotos && data.fotos.length > 0 ? (
          <>
            <Text style={s.sectionTitle} break={data.fotos.length > 4}>
              Registro fotográfico
            </Text>
            <View style={s.fotoGrid}>
              {data.fotos.map((f, i) => (
                <View key={i} style={s.fotoCell} wrap={false}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  <Image src={f.url} style={s.fotoImg} />
                  {f.descripcion ? <Text style={s.fotoCap}>{f.descripcion}</Text> : null}
                </View>
              ))}
            </View>
          </>
        ) : null}

        {/* Pie */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generado por Actium · {new Date().toLocaleString("es-CO")}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// ─── Generación del blob (consumida vía import dinámico) ──────────────────────

export async function buildPartePDFBlob(data: PartePDFData): Promise<Blob> {
  return pdf(<ParteDocument data={data} />).toBlob();
}
