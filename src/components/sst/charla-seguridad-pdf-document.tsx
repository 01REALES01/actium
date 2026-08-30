"use client";

import { Document, Page, View, Text, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import {
  NOTA_LEGAL_CHARLA,
  TIPOS_ACTIVIDAD,
  MODALIDADES,
  RESULTADOS_GENERALES,
  EVALUACIONES_ASISTENTE,
  METODOS_VERIFICACION,
  TIPOS_EVIDENCIA,
  etiquetaDuracion,
  type AsistenteCharla,
  type TemaCharla,
} from "@/constants/charla-seguridad";
import { getLogoSrc } from "@/lib/pdf-logo";
import { ACTIUM_PDF, registerActiumFonts } from "@/lib/pdf-fonts";

registerActiumFonts();

// ─── Tipo de datos del registro (serializable) ───────────────────────────────

export type CharlaSeguridadPDFData = {
  proyecto: string;
  lugar: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  duracionMinutos: number | null;
  tipoActividad: string;
  modalidad: string;
  tema: string;
  objetivo: string;
  capacitadorNombre: string;
  capacitadorCargo: string;
  temas: TemaCharla[];
  asistentes: AsistenteCharla[];
  metodosVerificacion: string[];
  resultadoGeneral: string;
  tiposEvidencia: string[];
  evidenciaOtra: string;
  observaciones: string;
  capacitadorFirma: string;
  responsableSstNombre: string;
  responsableSstFirma: string;
  responsableAreaNombre: string;
  responsableAreaFirma: string;
};

const ESPRESSO = ACTIUM_PDF.espresso;
const SADDLE = ACTIUM_PDF.saddle;
const SEASHELL = ACTIUM_PDF.seashell;
const BEIGE_BORDER = ACTIUM_PDF.beigeBorder;
const GRAY = ACTIUM_PDF.gray;

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 40, fontSize: 9, color: "#282828", fontFamily: "Manrope" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: ESPRESSO, paddingBottom: 10, marginBottom: 14 },
  brandLogo: { width: 118, height: 32, objectFit: "contain" },
  docTitle: { fontSize: 11, fontFamily: "Manrope", fontWeight: 700, color: "#282828", textAlign: "right" },
  docMeta: { fontSize: 8, color: GRAY, textAlign: "right", marginTop: 3 },
  sectionTitle: { fontSize: 9, fontFamily: "Manrope", fontWeight: 700, color: ESPRESSO, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, marginTop: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  field: { width: "33.33%", marginBottom: 6, paddingRight: 8 },
  fieldHalf: { width: "50%", marginBottom: 6, paddingRight: 8 },
  fieldFull: { width: "100%", marginBottom: 6 },
  fieldLabel: { fontSize: 6.5, color: SADDLE, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "Manrope", fontWeight: 700, marginBottom: 2 },
  fieldValue: { fontSize: 9, color: "#282828" },
  temaRow: { flexDirection: "row", marginBottom: 3 },
  temaNum: { fontSize: 8, color: SADDLE, fontFamily: "Manrope", fontWeight: 700, width: 16 },
  temaText: { fontSize: 8.5, color: "#3A3A3A", flex: 1 },
  table: { borderWidth: 1, borderColor: BEIGE_BORDER, borderRadius: 4, overflow: "hidden" },
  trHead: { flexDirection: "row", backgroundColor: ESPRESSO },
  thText: { color: "#FFFFFF", fontSize: 6.5, fontFamily: "Manrope", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, paddingVertical: 5, paddingHorizontal: 4 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BEIGE_BORDER, minHeight: 30 },
  trAlt: { backgroundColor: ACTIUM_PDF.beigeRow },
  td: { fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 4, color: "#3A3A3A" },
  tdCenter: { fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 4, color: "#3A3A3A", textAlign: "center" },
  sigThumb: { width: 42, height: 20, objectFit: "contain" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  chip: { borderWidth: 1, borderColor: BEIGE_BORDER, backgroundColor: SEASHELL, borderRadius: 10, paddingVertical: 3, paddingHorizontal: 7, fontSize: 7.5, color: ESPRESSO, marginRight: 4, marginBottom: 4 },
  obsBox: { borderWidth: 1, borderColor: BEIGE_BORDER, backgroundColor: SEASHELL, borderRadius: 6, padding: 8, fontSize: 9, color: "#3A3A3A", lineHeight: 1.4 },
  vacio: { fontSize: 8, color: GRAY, fontStyle: "italic", paddingVertical: 8 },
  legalText: { fontSize: 7.5, color: "#3A3A3A", fontStyle: "italic", lineHeight: 1.4, marginTop: 10, marginBottom: 6, textAlign: "justify" },
  sigTable: { flexDirection: "row", borderWidth: 1, borderColor: BEIGE_BORDER, borderRadius: 4, overflow: "hidden", marginBottom: 10 },
  sigCol: { flex: 1, borderRightWidth: 1, borderRightColor: BEIGE_BORDER },
  sigColLast: { flex: 1 },
  sigHead: { backgroundColor: "#EBE6E0", paddingVertical: 5, alignItems: "center" },
  sigHeadText: { color: ESPRESSO, fontSize: 6.5, fontFamily: "Manrope", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3, textAlign: "center" },
  sigBody: { minHeight: 60, alignItems: "center", justifyContent: "flex-end", padding: 5 },
  sigImg: { width: 100, height: 42, objectFit: "contain" },
  sigName: { fontSize: 7, color: "#3A3A3A", marginTop: 3, textAlign: "center" },
  disclaimer: { fontSize: 6.5, color: GRAY, fontStyle: "italic", marginTop: 8, lineHeight: 1.3 },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#E5E0DA", paddingTop: 6 },
  footerText: { fontSize: 7, color: GRAY },
});

function Campo({ label, value, ancho = "field" }: { label: string; value: string; ancho?: "field" | "fieldHalf" | "fieldFull" }) {
  return (
    <View style={s[ancho]}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue}>{value || "—"}</Text>
    </View>
  );
}

function rotulo(catalogo: { id: string; label: string }[], id: string): string {
  return catalogo.find((c) => c.id === id)?.label || "—";
}

function Firma({ nombre, firma, titulo }: { nombre: string; firma: string; titulo: string }) {
  return (
    <View style={titulo === "RESPONSABLE DEL ÁREA" ? s.sigColLast : s.sigCol}>
      <View style={s.sigHead}>
        <Text style={s.sigHeadText}>{titulo}</Text>
      </View>
      <View style={s.sigBody}>
        {firma ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={firma} style={s.sigImg} />
        ) : (
          <Text style={{ fontSize: 6, color: GRAY }}>Sin firmar</Text>
        )}
        <Text style={s.sigName}>{nombre || "—"}</Text>
      </View>
    </View>
  );
}

function CharlaSeguridadDocument({ data }: { data: CharlaSeguridadPDFData }) {
  const temas = data.temas.map((t) => t.texto.trim()).filter(Boolean);
  const asistentes = data.asistentes.filter((a) => a.nombre.trim());

  return (
    <Document title={`Registro de Capacitación ${data.tema} ${data.fecha}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={getLogoSrc()} style={s.brandLogo} />
          </View>
          <View>
            <Text style={s.docTitle}>Registro de Capacitación / Charla de Seguridad</Text>
            <Text style={s.docMeta}>Versión: 01</Text>
            <Text style={s.docMeta}>{data.fecha || "—"}</Text>
          </View>
        </View>

        {/* Datos generales */}
        <Text style={s.sectionTitle}>Datos generales</Text>
        <View style={s.grid}>
          <Campo label="Proyecto / obra" value={data.proyecto} />
          <Campo label="Lugar / frente de trabajo" value={data.lugar} />
          <Campo label="Fecha" value={data.fecha} />
          <Campo label="Hora inicio / fin" value={data.horaInicio && data.horaFin ? `${data.horaInicio} - ${data.horaFin}` : "—"} />
          <Campo label="Duración" value={etiquetaDuracion(data.duracionMinutos)} />
          <Campo label="Modalidad" value={rotulo(MODALIDADES, data.modalidad)} />
          <Campo label="Tipo de actividad" value={rotulo(TIPOS_ACTIVIDAD, data.tipoActividad)} />
          <Campo label="Capacitador / relator" value={data.capacitadorNombre} />
          <Campo label="Cargo del capacitador" value={data.capacitadorCargo} />
          <Campo label="Tema" value={data.tema} ancho="fieldFull" />
          <Campo label="Objetivo" value={data.objetivo} ancho="fieldFull" />
        </View>

        {/* Contenido / temas tratados */}
        <Text style={s.sectionTitle}>Contenido / temas tratados</Text>
        {temas.length === 0 ? (
          <Text style={s.vacio}>No se registraron temas.</Text>
        ) : (
          temas.map((t, i) => (
            <View key={i} style={s.temaRow}>
              <Text style={s.temaNum}>{i + 1}.</Text>
              <Text style={s.temaText}>{t}</Text>
            </View>
          ))
        )}

        {/* Asistentes */}
        <Text style={s.sectionTitle} break>
          Asistentes
        </Text>
        {asistentes.length === 0 ? (
          <Text style={s.vacio}>No se registraron asistentes.</Text>
        ) : (
          <View style={s.table}>
            <View style={s.trHead} fixed>
              <Text style={[s.thText, { width: "5%" }]}>N°</Text>
              <Text style={[s.thText, { width: "22%" }]}>Nombre completo</Text>
              <Text style={[s.thText, { width: "14%" }]}>Identificación</Text>
              <Text style={[s.thText, { width: "16%" }]}>Cargo</Text>
              <Text style={[s.thText, { width: "16%" }]}>Empresa</Text>
              <Text style={[s.thText, { width: "13%", textAlign: "center" }]}>Firma</Text>
              <Text style={[s.thText, { width: "14%", textAlign: "center" }]}>Evaluación</Text>
            </View>
            {asistentes.map((a, i) => (
              <View key={a.id} style={[s.tr, i % 2 === 1 ? s.trAlt : {}]} wrap={false}>
                <Text style={[s.tdCenter, { width: "5%" }]}>{i + 1}</Text>
                <Text style={[s.td, { width: "22%" }]}>{a.nombre}</Text>
                <Text style={[s.td, { width: "14%" }]}>{a.identificacion || "—"}</Text>
                <Text style={[s.td, { width: "16%" }]}>{a.cargo || "—"}</Text>
                <Text style={[s.td, { width: "16%" }]}>{a.empresa || "—"}</Text>
                <View style={[s.tdCenter, { width: "13%", alignItems: "center", justifyContent: "center" }]}>
                  {a.firma ? (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <Image src={a.firma} style={s.sigThumb} />
                  ) : (
                    <Text style={{ fontSize: 6.5, color: GRAY }}>—</Text>
                  )}
                </View>
                <Text style={[s.tdCenter, { width: "14%" }]}>{rotulo(EVALUACIONES_ASISTENTE, a.evaluacion)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Verificación de comprensión */}
        <Text style={s.sectionTitle} break>
          Verificación de comprensión
        </Text>
        <View style={s.grid}>
          <Campo label="Resultado general" value={rotulo(RESULTADOS_GENERALES, data.resultadoGeneral)} ancho="fieldHalf" />
          <Campo
            label="Evidencia anexa"
            value={
              data.tiposEvidencia.length === 0
                ? "—"
                : data.tiposEvidencia
                    .map((id) => (id === "otra" && data.evidenciaOtra.trim() ? data.evidenciaOtra.trim() : rotulo(TIPOS_EVIDENCIA, id)))
                    .join(", ")
            }
            ancho="fieldHalf"
          />
        </View>
        <Text style={s.fieldLabel}>Métodos de verificación</Text>
        <View style={[s.chipsRow, { marginTop: 4, marginBottom: 8 }]}>
          {data.metodosVerificacion.length === 0 ? (
            <Text style={s.vacio}>No se registraron métodos de verificación.</Text>
          ) : (
            data.metodosVerificacion.map((id) => (
              <Text key={id} style={s.chip}>
                {rotulo(METODOS_VERIFICACION, id)}
              </Text>
            ))
          )}
        </View>

        {/* Observaciones */}
        {data.observaciones ? (
          <View>
            <Text style={s.sectionTitle}>Observaciones / compromisos</Text>
            <View style={s.obsBox}>
              <Text>{data.observaciones}</Text>
            </View>
          </View>
        ) : null}

        {/* Firmas de cierre */}
        <Text style={s.sectionTitle} break>
          Firmas
        </Text>
        <View style={s.sigTable}>
          <Firma titulo="FIRMA CAPACITADOR" nombre={data.capacitadorNombre} firma={data.capacitadorFirma} />
          <Firma titulo="RESPONSABLE SST / VERIFICACIÓN" nombre={data.responsableSstNombre} firma={data.responsableSstFirma} />
          <Firma titulo="RESPONSABLE DEL ÁREA" nombre={data.responsableAreaNombre} firma={data.responsableAreaFirma} />
        </View>

        <Text style={s.legalText}>{NOTA_LEGAL_CHARLA}</Text>
        <Text style={s.disclaimer}>
          Las firmas de este registro tienen carácter informativo y NO constituyen firma electrónica
          certificada según la Ley 527 de 1999.
        </Text>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generado por Actium · {new Date().toLocaleString("es-CO")}</Text>
          <Text
            style={s.footerText}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function buildCharlaSeguridadPDFBlob(data: CharlaSeguridadPDFData): Promise<Blob> {
  return pdf(<CharlaSeguridadDocument data={data} />).toBlob();
}
