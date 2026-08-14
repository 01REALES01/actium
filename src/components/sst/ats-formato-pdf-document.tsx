"use client";

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import {
  PERMISOS_REQUERIDOS,
  CATEGORIAS_HERRAMIENTAS,
  PREGUNTAS_ANALISIS,
  EVALUACION_RIESGO,
  type ProbabilidadIncidente,
} from "@/constants/ats-formato";
import { getLogoSrc } from "@/lib/pdf-logo";
import { ACTIUM_PDF, registerActiumFonts } from "@/lib/pdf-fonts";

registerActiumFonts();

// ─── Tipo de datos del ATS (serializable) ────────────────────────────────────

export type EjecutorAts = {
  cedula: string;
  nombre: string;
  firma?: string;
  firmaCierre?: string;
};

export type PasoAts = {
  paso: string;
  peligros: string;
  consecuencias: string;
  controles: string;
};

export type AtsFormatoPDFData = {
  empresa: string;
  ciudad: string;
  areaProceso: string;
  ubicacion: string;
  lugarTrabajo: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  descripcionTarea: string;
  permisos: string[];
  permisoOtroCual: string;
  herramientas: Record<string, string>;
  analisis: Record<string, string>;
  pasos: PasoAts[];
  probabilidadIncidente: ProbabilidadIncidente;
  seguroProceder: ProbabilidadIncidente;
  ejecutores: EjecutorAts[];
  emisorNombre: string;
  emisorCedula: string;
  firmaDataUrl: string;
  emisorFirmaCierre?: string;
};

const ORANGE = ACTIUM_PDF.orange;
const ESPRESSO = ACTIUM_PDF.espresso;
const SADDLE = ACTIUM_PDF.saddle;
const SEASHELL = ACTIUM_PDF.seashell;
const BEIGE_BORDER = ACTIUM_PDF.beigeBorder;
const GRAY = ACTIUM_PDF.gray;

// Hoja de estilos compartida con permiso-altura / permiso-caliente:
// mismo encabezado, secciones, grilla, chips, tablas y pie de página.
const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 40, fontSize: 9, color: "#282828", fontFamily: "Manrope" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: ESPRESSO, paddingBottom: 10, marginBottom: 14 },
  brandLogo: { width: 118, height: 32, objectFit: "contain" },
  docTitle: { fontSize: 11, fontFamily: "Manrope", fontWeight: 700, color: "#282828", textAlign: "right" },
  docMeta: { fontSize: 8, color: GRAY, textAlign: "right", marginTop: 3 },
  sectionTitle: { fontSize: 9, fontFamily: "Manrope", fontWeight: 700, color: ESPRESSO, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, marginTop: 14 },
  // datos en grilla 2 columnas
  grid: { flexDirection: "row", flexWrap: "wrap" },
  field: { width: "50%", marginBottom: 6, paddingRight: 8 },
  fieldFull: { width: "100%", marginBottom: 6 },
  fieldLabel: { fontSize: 6.5, color: SADDLE, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "Manrope", fontWeight: 700, marginBottom: 2 },
  fieldValue: { fontSize: 9, color: "#282828" },
  // chips
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 4 },
  chip: { borderWidth: 1, borderColor: BEIGE_BORDER, borderRadius: 4, paddingVertical: 3, paddingHorizontal: 6, fontSize: 7.5, color: "#3A3A3A" },
  chipOn: { borderColor: ORANGE, backgroundColor: "#FDEDE4", color: ESPRESSO },
  obsBox: { borderWidth: 1, borderColor: BEIGE_BORDER, backgroundColor: SEASHELL, borderRadius: 6, padding: 8, fontSize: 9, color: "#3A3A3A", lineHeight: 1.4, marginBottom: 4 },
  // tablas
  table: { borderWidth: 1, borderColor: BEIGE_BORDER, borderRadius: 4, overflow: "hidden", marginBottom: 4 },
  trHead: { flexDirection: "row", backgroundColor: ESPRESSO },
  thText: { color: "#FFFFFF", fontSize: 7, fontFamily: "Manrope", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, paddingVertical: 5, paddingHorizontal: 5 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BEIGE_BORDER },
  td: { fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 5, color: "#3A3A3A" },
  resp: { fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 5, textAlign: "center", fontFamily: "Manrope", fontWeight: 700 },
  empty: { fontSize: 8, color: GRAY, fontStyle: "italic", paddingVertical: 8, paddingHorizontal: 6 },
  // evaluación de riesgo
  evalGuide: { fontSize: 7.5, color: "#3A3A3A", lineHeight: 1.35, marginTop: 2, marginBottom: 6 },
  // firma
  firmaBox: { marginTop: 14, flexDirection: "row", justifyContent: "space-between" },
  firmaCol: { width: "48%" },
  firmaSlot: { height: 70, justifyContent: "flex-end", alignItems: "center" },
  firmaImg: { width: 150, height: 64, objectFit: "contain" },
  disclaimer: { fontSize: 6.5, color: GRAY, fontStyle: "italic", marginTop: 8, lineHeight: 1.3 },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#E5E0DA", paddingTop: 6 },
  footerText: { fontSize: 7, color: GRAY },
  // signatures table (Apertura / Cierre)
  legalText: { fontSize: 7.5, color: "#3A3A3A", fontStyle: "italic", lineHeight: 1.4, marginBottom: 10, textAlign: "justify" },
  sigTable: { borderWidth: 1, borderColor: BEIGE_BORDER, borderRadius: 4, overflow: "hidden", marginBottom: 10 },
  sigThText: { color: ESPRESSO, fontSize: 7, fontFamily: "Manrope", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, paddingVertical: 5, textAlign: "center" },
  sigTr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BEIGE_BORDER, minHeight: 40 },
  sigTdName: { fontSize: 7.5, padding: 5, color: "#3A3A3A", justifyContent: "center" },
  sigTdSign: { padding: 2, justifyContent: "flex-end", alignItems: "center" },
  sigImg: { width: 80, height: 35, objectFit: "contain" },
});

function Campo({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <View style={full ? s.fieldFull : s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue}>{value || "—"}</Text>
    </View>
  );
}

function EvalRiesgo({
  pregunta,
  respuesta,
  textoSi,
  textoNo,
}: {
  pregunta: string;
  respuesta: ProbabilidadIncidente;
  textoSi: string;
  textoNo: string;
}) {
  const guia = respuesta === "si" ? textoSi : respuesta === "no" ? textoNo : "";
  return (
    <View wrap={false} style={{ marginBottom: 8 }}>
      <Text style={[s.fieldValue, { fontFamily: "Manrope", fontWeight: 700, marginBottom: 4 }]}>{pregunta}</Text>
      <View style={s.chipsRow}>
        <Text style={[s.chip, respuesta === "si" ? s.chipOn : {}]}>{respuesta === "si" ? "[x] " : "[ ] "}Sí</Text>
        <Text style={[s.chip, respuesta === "no" ? s.chipOn : {}]}>{respuesta === "no" ? "[x] " : "[ ] "}No</Text>
      </View>
      {guia ? <Text style={s.evalGuide}>{guia}</Text> : null}
    </View>
  );
}

function AtsFormatoDocument({ data }: { data: AtsFormatoPDFData }) {
  return (
    <Document title={`ATS ${data.empresa} ${data.fecha}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={getLogoSrc()} style={s.brandLogo} />
          </View>
          <View>
            <Text style={s.docTitle}>Análisis de Trabajo Seguro (ATS)</Text>
            <Text style={s.docMeta}>{data.empresa || "—"}</Text>
            <Text style={s.docMeta}>{data.fecha || "—"}</Text>
          </View>
        </View>

        {/* 1. Datos básicos */}
        <Text style={s.sectionTitle}>1. Datos del trabajo</Text>
        <View style={s.grid}>
          <Campo label="Empresa" value={data.empresa} />
          <Campo label="Ciudad" value={data.ciudad} />
          <Campo label="Área / Proceso" value={data.areaProceso} />
          <Campo label="Ubicación donde se realiza el trabajo" value={data.ubicacion} />
          <Campo label="Lugar de trabajo" value={data.lugarTrabajo} />
          <Campo label="Fecha de realización" value={data.fecha} />
          <Campo label="Hora de inicio" value={data.horaInicio} />
          <Campo label="Hora de finalización" value={data.horaFin} />
          <Campo label="Descripción de la tarea a realizar" value={data.descripcionTarea} full />
        </View>

        {/* 2. Permisos requeridos */}
        <Text style={s.sectionTitle}>2. Permisos requeridos</Text>
        <View style={s.chipsRow}>
          {PERMISOS_REQUERIDOS.map((p) => {
            const on = data.permisos.includes(p.id);
            return (
              <Text key={p.id} style={[s.chip, on ? s.chipOn : {}]}>
                {on ? "[x] " : "[ ] "}{p.label}
              </Text>
            );
          })}
        </View>
        {data.permisoOtroCual ? <Text style={s.obsBox}>Otro permiso (¿cuál?): {data.permisoOtroCual}</Text> : null}

        {/* 3. Equipos y herramientas */}
        <Text style={s.sectionTitle}>3. Equipos y herramientas a utilizar</Text>
        <View style={s.table}>
          <View style={s.trHead}>
            <Text style={[s.thText, { width: "28%" }]}>Categoría</Text>
            <Text style={[s.thText, { width: "72%" }]}>Detalle</Text>
          </View>
          {CATEGORIAS_HERRAMIENTAS.map((c) => {
            const detalle = data.herramientas[c.id];
            return (
              <View key={c.id} style={s.tr} wrap={false}>
                <Text style={[s.td, { width: "28%", fontFamily: "Manrope", fontWeight: 700, color: detalle ? ESPRESSO : GRAY }]}>{c.label}</Text>
                <Text style={[s.td, { width: "72%" }]}>{detalle || "—"}</Text>
              </View>
            );
          })}
        </View>

        {/* Personal ejecutor */}
        <Text style={s.sectionTitle}>Personal ejecutor</Text>
        <View style={s.table}>
          <View style={s.trHead}>
            <Text style={[s.thText, { width: "30%" }]}>Cédula</Text>
            <Text style={[s.thText, { width: "70%" }]}>Nombres y apellidos</Text>
          </View>
          {data.ejecutores.length === 0 ? (
            <Text style={s.empty}>Sin personal ejecutor registrado.</Text>
          ) : (
            data.ejecutores.map((e, i) => (
              <View key={i} style={s.tr}>
                <Text style={[s.td, { width: "30%" }]}>{e.cedula || "—"}</Text>
                <Text style={[s.td, { width: "70%" }]}>{e.nombre || "—"}</Text>
              </View>
            ))
          )}
        </View>

        {/* 4. Análisis de la tarea */}
        <Text style={s.sectionTitle} break>4. Análisis de la tarea</Text>
        <View style={s.table}>
          <View style={s.trHead}>
            <Text style={[s.thText, { width: "60%" }]}>Pregunta</Text>
            <Text style={[s.thText, { width: "40%" }]}>Respuesta</Text>
          </View>
          {PREGUNTAS_ANALISIS.map((q) => (
            <View key={q.id} style={s.tr} wrap={false}>
              <Text style={[s.td, { width: "60%" }]}>{q.texto}</Text>
              <Text style={[s.td, { width: "40%" }]}>{data.analisis[q.id] || "—"}</Text>
            </View>
          ))}
        </View>

        {/* 5. Pasos de la tarea */}
        <Text style={s.sectionTitle}>5. Pasos detallados de la tarea</Text>
        <View style={s.table}>
          <View style={s.trHead}>
            <Text style={[s.thText, { width: "25%" }]}>Paso</Text>
            <Text style={[s.thText, { width: "25%" }]}>Peligros</Text>
            <Text style={[s.thText, { width: "20%" }]}>Consecuencias</Text>
            <Text style={[s.thText, { width: "30%" }]}>Controles requeridos</Text>
          </View>
          {data.pasos.length === 0 ? (
            <Text style={s.empty}>Sin pasos registrados.</Text>
          ) : (
            data.pasos.map((p, i) => (
              <View key={i} style={s.tr} wrap={false}>
                <Text style={[s.td, { width: "25%" }]}>{p.paso || "—"}</Text>
                <Text style={[s.td, { width: "25%" }]}>{p.peligros || "—"}</Text>
                <Text style={[s.td, { width: "20%" }]}>{p.consecuencias || "—"}</Text>
                <Text style={[s.td, { width: "30%" }]}>{p.controles || "—"}</Text>
              </View>
            ))
          )}
        </View>

        {/* 6. Evaluación del riesgo */}
        <Text style={s.sectionTitle}>6. Evaluación del riesgo</Text>
        <EvalRiesgo
          pregunta={EVALUACION_RIESGO.probabilidad.pregunta}
          respuesta={data.probabilidadIncidente}
          textoSi={EVALUACION_RIESGO.probabilidad.si}
          textoNo={EVALUACION_RIESGO.probabilidad.no}
        />
        <EvalRiesgo
          pregunta={EVALUACION_RIESGO.seguridad.pregunta}
          respuesta={data.seguroProceder}
          textoSi={EVALUACION_RIESGO.seguridad.si}
          textoNo={EVALUACION_RIESGO.seguridad.no}
        />

        {/* Firmas y Compromiso */}
        <Text style={s.sectionTitle} break>Firmas y Compromiso</Text>
        <Text style={s.legalText}>
          Personalmente hemos analizado y evaluado los pasos del trabajo, peligros y controles requeridos, y consideramos seguro realizar la labor.
          Como trabajadores nos comprometemos a cumplir con las medidas de control establecidas, suspender el trabajo si surgen nuevos riesgos y reportar el cierre de la actividad al finalizar.
        </Text>

        <View style={s.sigTable}>
          {/* Main header */}
          <View style={[s.trHead, { backgroundColor: "#EBE6E0" }]}>
            <Text style={[s.sigThText, { width: "50%", borderRightWidth: 1, borderRightColor: "#D1CFC9" }]}>INICIO DEL TRABAJO (APERTURA)</Text>
            <Text style={[s.sigThText, { width: "50%" }]}>FIN DEL TRABAJO (CIERRE)</Text>
          </View>
          
          {data.ejecutores.length === 0 ? (
            <Text style={s.empty}>Sin ejecutores registrados.</Text>
          ) : (
            data.ejecutores.map((e, i) => (
              <View key={`ej-${i}`} style={s.sigTr}>
                <View style={[s.sigTdName, { width: "25%", borderRightWidth: 1, borderRightColor: "#F0EBE5" }]}>
                  <Text>{e.nombre || "—"}</Text>
                  <Text style={{ fontSize: 6, color: GRAY, marginTop: 2 }}>C.C. {e.cedula || "—"}</Text>
                </View>
                <View style={[s.sigTdSign, { width: "25%", borderRightWidth: 1, borderRightColor: "#F0EBE5" }]}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  {e.firma ? <Image src={e.firma} style={s.sigImg} /> : <Text style={{ fontSize: 6, color: GRAY }}>Firma:</Text>}
                </View>
                <View style={[s.sigTdName, { width: "25%", borderRightWidth: 1, borderRightColor: "#F0EBE5" }]}>
                  <Text>{e.nombre || "—"}</Text>
                  <Text style={{ fontSize: 6, color: GRAY, marginTop: 2 }}>C.C. {e.cedula || "—"}</Text>
                </View>
                <View style={[s.sigTdSign, { width: "25%" }]}>
                  {/* eslint-disable-next-line jsx-a11y/alt-text */}
                  {e.firmaCierre ? <Image src={e.firmaCierre} style={s.sigImg} /> : <Text style={{ fontSize: 6, color: GRAY }}>Firma (Cierre):</Text>}
                </View>
              </View>
            ))
          )}

          {/* Emisor / Responsable */}
          <View style={[s.sigTr, { borderBottomWidth: 0 }]}>
            <View style={[s.sigTdName, { width: "25%", borderRightWidth: 1, borderRightColor: "#F0EBE5" }]}>
              <Text>{data.emisorNombre || "—"}</Text>
              <Text style={{ fontSize: 6, color: GRAY, marginTop: 2 }}>Emisor / Responsable</Text>
              {data.emisorCedula ? <Text style={{ fontSize: 6, color: GRAY }}>C.C. {data.emisorCedula}</Text> : null}
            </View>
            <View style={[s.sigTdSign, { width: "25%", borderRightWidth: 1, borderRightColor: "#F0EBE5" }]}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              {data.firmaDataUrl ? <Image src={data.firmaDataUrl} style={s.sigImg} /> : <Text style={{ fontSize: 6, color: GRAY }}>Firma:</Text>}
            </View>
            <View style={[s.sigTdName, { width: "25%", borderRightWidth: 1, borderRightColor: "#F0EBE5" }]}>
              <Text>{data.emisorNombre || "—"}</Text>
              <Text style={{ fontSize: 6, color: GRAY, marginTop: 2 }}>Emisor / Responsable</Text>
            </View>
            <View style={[s.sigTdSign, { width: "25%" }]}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              {data.emisorFirmaCierre ? <Image src={data.emisorFirmaCierre} style={s.sigImg} /> : <Text style={{ fontSize: 6, color: GRAY }}>Firma (Cierre):</Text>}
            </View>
          </View>
        </View>

        <Text style={s.disclaimer}>
          Esta firma tiene carácter informativo y NO constituye firma electrónica certificada
          según la Ley 527 de 1999.
        </Text>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generado por Actium · {new Date().toLocaleString("es-CO")}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function buildAtsFormatoPDFBlob(data: AtsFormatoPDFData): Promise<Blob> {
  return pdf(<AtsFormatoDocument data={data} />).toBlob();
}
