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
  pdf,
} from "@react-pdf/renderer";

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
  notasCampo?: ParteNotaCampo[];
  fotos?: ParteFoto[];
};

const ORANGE = "#F25C05";
const ESPRESSO = "#592C12";
const GREEN = "#16A34A";
const RED = "#DC2626";
const GRAY = "#6B6B6B";

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

// ─── Estilos PDF ──────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 40, fontSize: 9, color: "#282828", fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: ORANGE, paddingBottom: 10, marginBottom: 16 },
  brand: { fontSize: 20, fontFamily: "Helvetica-Bold", color: ESPRESSO, letterSpacing: 1 },
  brandSub: { fontSize: 7, color: GRAY, letterSpacing: 2, marginTop: 2, textTransform: "uppercase" },
  docTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#282828", textAlign: "right" },
  docMeta: { fontSize: 8, color: GRAY, textAlign: "right", marginTop: 3 },
  sectionTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: ESPRESSO, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, marginTop: 14 },
  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  kpiCard: { flex: 1, borderWidth: 1, borderColor: "#E5E0DA", borderRadius: 6, padding: 8, alignItems: "center" },
  kpiLabel: { fontSize: 6.5, color: GRAY, textTransform: "uppercase", letterSpacing: 1, fontFamily: "Helvetica-Bold" },
  kpiValue: { fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 2 },
  table: { borderWidth: 1, borderColor: "#E5E0DA", borderRadius: 4, overflow: "hidden" },
  trHead: { flexDirection: "row", backgroundColor: ESPRESSO },
  thText: { color: "#FFFFFF", fontSize: 7, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5, paddingVertical: 5, paddingHorizontal: 6 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#F0EBE5" },
  td: { fontSize: 8, paddingVertical: 5, paddingHorizontal: 6, color: "#3A3A3A" },
  empty: { fontSize: 8, color: GRAY, fontStyle: "italic", paddingVertical: 8, paddingHorizontal: 6 },
  obsBox: { borderWidth: 1, borderColor: "#E5E0DA", borderRadius: 6, padding: 10, fontSize: 9, color: "#3A3A3A", lineHeight: 1.4 },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#E5E0DA", paddingTop: 6 },
  footerText: { fontSize: 7, color: GRAY },
  chartLabel: { fontSize: 7, color: GRAY, marginBottom: 3 },
  legendRow: { flexDirection: "row", gap: 14, marginTop: 6 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 7, height: 7, borderRadius: 2 },
  legendText: { fontSize: 7, color: "#3A3A3A" },
  notaItem: { borderWidth: 1, borderColor: "#E5E0DA", borderRadius: 6, padding: 8, marginBottom: 5 },
  notaMeta: { fontSize: 6.5, color: GRAY, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 3 },
  fotoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  fotoCell: { width: 162, borderWidth: 1, borderColor: "#E5E0DA", borderRadius: 6, overflow: "hidden" },
  fotoImg: { width: 162, height: 108, objectFit: "cover" },
  fotoCap: { fontSize: 6.5, color: GRAY, padding: 4 },
});

// ─── Barra de asistencia (SVG nativo) ─────────────────────────────────────────

function BarraAsistencia({ presentes, ausentes }: { presentes: number; ausentes: number }) {
  const total = Math.max(1, presentes + ausentes);
  const width = 460;
  const barH = 26;
  const wPres = (presentes / total) * width;
  const wAus = (ausentes / total) * width;

  return (
    <View>
      <Text style={s.chartLabel}>Distribución de la jornada</Text>
      <Svg width={width} height={barH} viewBox={`0 0 ${width} ${barH}`}>
        <Rect x={0} y={0} width={width} height={barH} rx={4} fill="#F0EBE5" />
        {wPres > 0 && <Rect x={0} y={0} width={wPres} height={barH} rx={4} fill={GREEN} />}
        {wAus > 0 && <Rect x={wPres} y={0} width={wAus} height={barH} rx={4} fill={ORANGE} />}
        <Line x1={0} y1={0} x2={0} y2={0} stroke="#FFFFFF" />
      </Svg>
      <View style={s.legendRow}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: GREEN }]} />
          <Text style={s.legendText}>Presentes: {presentes}</Text>
        </View>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: ORANGE }]} />
          <Text style={s.legendText}>Ausentes: {ausentes}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Documento ────────────────────────────────────────────────────────────────

function ParteDocument({ data }: { data: PartePDFData }) {
  const cumplimiento = data.programado > 0 ? Math.round((data.presentes / data.programado) * 100) : 0;

  return (
    <Document title={`Parte SST ${data.proyectoNombre} ${data.fecha}`}>
      <Page size="A4" style={s.page}>
        {/* Cabecera */}
        <View style={s.header}>
          <View>
            <Text style={s.brand}>ACTIUM</Text>
            <Text style={s.brandSub}>Infraestructura y Activos</Text>
          </View>
          <View>
            <Text style={s.docTitle}>Parte Diario SST</Text>
            <Text style={s.docMeta}>{data.proyectoNombre}</Text>
            <Text style={s.docMeta}>{fechaLarga(data.fecha)}</Text>
          </View>
        </View>

        {/* KPIs */}
        <View style={s.kpiRow}>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Programado</Text>
            <Text style={[s.kpiValue, { color: "#282828" }]}>{data.programado}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Presentes</Text>
            <Text style={[s.kpiValue, { color: GREEN }]}>{data.presentes}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Ausentes</Text>
            <Text style={[s.kpiValue, { color: ORANGE }]}>{data.ausentes}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Incidentes</Text>
            <Text style={[s.kpiValue, { color: "#282828" }]}>{data.incidentes.length}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Accidentes</Text>
            <Text style={[s.kpiValue, { color: RED }]}>{data.accidentes.length}</Text>
          </View>
          <View style={s.kpiCard}>
            <Text style={s.kpiLabel}>Asistencia</Text>
            <Text style={[s.kpiValue, { color: ORANGE }]}>{cumplimiento}%</Text>
          </View>
        </View>

        {/* Gráfica */}
        <Text style={s.sectionTitle}>Asistencia a operación</Text>
        <BarraAsistencia presentes={data.presentes} ausentes={data.ausentes} />

        {/* Avance del día */}
        {data.avance ? (
          <>
            <Text style={s.sectionTitle}>Avance del día</Text>
            <View style={s.kpiRow}>
              <View style={s.kpiCard}>
                <Text style={s.kpiLabel}>Proyectado</Text>
                <Text style={[s.kpiValue, { color: "#282828" }]}>{data.avance.proyectado} MT</Text>
              </View>
              <View style={s.kpiCard}>
                <Text style={s.kpiLabel}>Real</Text>
                <Text style={[s.kpiValue, { color: ORANGE }]}>{data.avance.real} MT</Text>
              </View>
              <View style={s.kpiCard}>
                <Text style={s.kpiLabel}>Cumplimiento</Text>
                <Text style={[s.kpiValue, { color: GREEN }]}>
                  {data.avance.proyectado > 0
                    ? Math.round((data.avance.real / data.avance.proyectado) * 100)
                    : 0}
                  %
                </Text>
              </View>
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
              <View key={i} style={s.tr}>
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
          {[...data.accidentes, ...data.incidentes].length === 0 ? (
            <Text style={s.empty}>Sin incidentes ni accidentes registrados.</Text>
          ) : (
            [...data.accidentes, ...data.incidentes].map((e, i) => (
              <View key={i} style={s.tr}>
                <Text style={[s.td, { width: "16%" }]}>{TIPO_EVENTO_LABEL[e.tipo] ?? e.tipo}</Text>
                <Text style={[s.td, { width: "14%", textTransform: "capitalize" }]}>{e.severidad}</Text>
                <Text style={[s.td, { width: "24%" }]}>{e.involucrado || "—"}</Text>
                <Text style={[s.td, { width: "46%" }]}>{e.descripcion}</Text>
              </View>
            ))
          )}
        </View>

        {/* Observaciones */}
        {data.observaciones ? (
          <>
            <Text style={s.sectionTitle}>Observaciones del parte</Text>
            <View style={s.obsBox}>
              <Text>{data.observaciones}</Text>
            </View>
          </>
        ) : null}

        {/* Notas de campo del día */}
        {data.notasCampo && data.notasCampo.length > 0 ? (
          <>
            <Text style={s.sectionTitle}>Observaciones de campo</Text>
            {data.notasCampo.map((n, i) => (
              <View key={i} style={s.notaItem}>
                <Text>
                  {n.importante ? "[IMPORTANTE] " : ""}
                  {n.contenido}
                </Text>
                {n.autor ? <Text style={s.notaMeta}>— {n.autor}</Text> : null}
              </View>
            ))}
          </>
        ) : null}

        {/* Registro fotográfico del día */}
        {data.fotos && data.fotos.length > 0 ? (
          <>
            <Text style={s.sectionTitle} break={data.fotos.length > 4}>
              Registro fotográfico
            </Text>
            <View style={s.fotoGrid}>
              {data.fotos.map((f, i) => (
                <View key={i} style={s.fotoCell}>
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
          <Text style={s.footerText}>
            Generado por Actium · {new Date().toLocaleString("es-CO")}
          </Text>
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
