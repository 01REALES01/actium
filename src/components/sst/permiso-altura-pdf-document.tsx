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
  SISTEMAS_ACCESO,
  OTRAS_TAR,
  EPP_ALTURA,
  CHEQUEO_ALTURA,
  RESPUESTA_LABEL,
  type RespuestaChequeo,
} from "@/constants/permiso-altura";
import { getLogoSrc } from "@/lib/pdf-logo";
import { ACTIUM_PDF, registerActiumFonts } from "@/lib/pdf-fonts";

registerActiumFonts();

// ─── Tipo de datos del permiso (serializable) ────────────────────────────────

export type EjecutorAltura = {
  cedula: string;
  nombre: string;
  capacitacion: string;
  profesion: string;
  seguridadSocial: string;
};

export type PermisoAlturaPDFData = {
  // 1. Datos básicos
  empresa: string;
  ciudad: string;
  lugarTrabajo: string;
  areaProceso: string;
  ubicacion: string;
  vigencia: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  // 2. Descripción del trabajo
  tiposTrabajo: string;
  herramientas: string;
  alturaAprox: string;
  // 3. Medidas de prevención
  sistemasAcceso: string[]; // ids
  sistemasAccesoOtros?: string;
  otrasTar: Record<string, boolean>; // id -> involucra
  otrasTarCuales: string;
  procedimiento: string;
  epp: string[]; // ids
  eppOtros: string;
  // 4. Lista de chequeo
  chequeo: Record<string, RespuestaChequeo>; // id -> respuesta
  // Personal y firma
  ejecutores: EjecutorAltura[];
  emisorNombre: string;
  emisorCedula: string;
  firmaDataUrl: string; // data:image/png;base64,...
};

const ORANGE = ACTIUM_PDF.orange;
const ESPRESSO = ACTIUM_PDF.espresso;
const SADDLE = ACTIUM_PDF.saddle;
const SEASHELL = ACTIUM_PDF.seashell;
const BEIGE_BORDER = ACTIUM_PDF.beigeBorder;
const GREEN = ACTIUM_PDF.green;
const RED = ACTIUM_PDF.red;
const GRAY = ACTIUM_PDF.gray;

const s = StyleSheet.create({
  page: { paddingTop: 36, paddingBottom: 48, paddingHorizontal: 40, fontSize: 9, color: "#282828", fontFamily: "Manrope" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: ORANGE, paddingBottom: 10, marginBottom: 14 },
  brand: { fontSize: 20, fontFamily: "Manrope", fontWeight: 700, color: ESPRESSO, letterSpacing: 1 },
  brandLogo: { width: 118, height: 32, objectFit: "contain" },
  brandSub: { fontSize: 7, color: GRAY, letterSpacing: 2, marginTop: 2, textTransform: "uppercase" },
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
  table: { borderWidth: 1, borderColor: BEIGE_BORDER, borderRadius: 4, overflow: "hidden" },
  trHead: { flexDirection: "row", backgroundColor: ESPRESSO },
  thText: { color: "#FFFFFF", fontSize: 7, fontFamily: "Manrope", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, paddingVertical: 5, paddingHorizontal: 5 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BEIGE_BORDER },
  td: { fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 5, color: "#3A3A3A" },
  resp: { fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 5, textAlign: "center", fontFamily: "Manrope", fontWeight: 700 },
  empty: { fontSize: 8, color: GRAY, fontStyle: "italic", paddingVertical: 8, paddingHorizontal: 6 },
  // firma
  firmaBox: { marginTop: 14, flexDirection: "row", justifyContent: "space-between" },
  firmaCol: { width: "48%" },
  firmaSlot: { height: 70, justifyContent: "flex-end", alignItems: "center" },
  firmaImg: { width: 150, height: 64, objectFit: "contain" },
  firmaLinea: { borderTopWidth: 1, borderTopColor: "#282828", marginTop: 4, paddingTop: 3 },
  disclaimer: { fontSize: 6.5, color: GRAY, fontStyle: "italic", marginTop: 8, lineHeight: 1.3 },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#E5E0DA", paddingTop: 6 },
  footerText: { fontSize: 7, color: GRAY },
});

function respColor(r: RespuestaChequeo): string {
  if (r === "si") return GREEN;
  if (r === "no") return RED;
  return GRAY;
}

function Campo({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <View style={full ? s.fieldFull : s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue}>{value || "—"}</Text>
    </View>
  );
}

function PermisoAlturaDocument({ data }: { data: PermisoAlturaPDFData }) {
  return (
    <Document title={`Permiso Trabajo en Altura ${data.empresa} ${data.fecha}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={getLogoSrc()} style={s.brandLogo} />
            <Text style={s.brandSub}>Infraestructura y Activos</Text>
          </View>
          <View>
            <Text style={s.docTitle}>Permiso de Trabajo en Altura</Text>
            <Text style={s.docMeta}>Resolución 1409 de 2012</Text>
            <Text style={s.docMeta}>{data.fecha || "—"}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 6.5, color: GRAY, marginBottom: 14, textAlign: "justify", lineHeight: 1.3 }}>
          Resolución 1409 de 2012, Artículo 17. El permiso de trabajo en alturas es un mecanismo que mediante la verificación y control previo de todos los aspectos relacionados en la presente resolución, tiene como objeto prevenir la ocurrencia de accidentes durante la realización de trabajos en alturas. Este permiso de trabajo debe ser emitido para trabajos ocasionales definidos por el coordinador de trabajo en alturas para los efectos de la aplicación de la presente resolución y puede ser diligenciado por el trabajador o por el empleador y debe ser revisado y verificado en el sitio de trabajo por el coordinador de trabajo en alturas.
        </Text>

        {/* 1. Datos básicos */}
        <Text style={s.sectionTitle}>1. Datos básicos del permiso</Text>
        <View style={s.grid}>
          <Campo label="Empresa" value={data.empresa} />
          <Campo label="Ciudad" value={data.ciudad} />
          <Campo label="Lugar de trabajo" value={data.lugarTrabajo} />
          <Campo label="Área / Proceso" value={data.areaProceso} />
          <Campo label="Ubicación donde se realiza el trabajo" value={data.ubicacion} full />
          <Campo label="Vigencia del permiso" value={data.vigencia} />
          <Campo label="Fecha de realización" value={data.fecha} />
          <Campo label="Hora de inicio" value={data.horaInicio} />
          <Campo label="Hora de finalización" value={data.horaFin} />
        </View>

        {/* Personal ejecutor */}
        <Text style={s.sectionTitle}>Personal ejecutor</Text>
        <View style={s.table}>
          <View style={s.trHead}>
            <Text style={[s.thText, { width: "16%" }]}>Cédula</Text>
            <Text style={[s.thText, { width: "24%" }]}>Nombres y apellidos</Text>
            <Text style={[s.thText, { width: "20%" }]}>Capacitación / Cert.</Text>
            <Text style={[s.thText, { width: "16%" }]}>Profesión</Text>
            <Text style={[s.thText, { width: "12%" }]}>Seg. Social</Text>
            <Text style={[s.thText, { width: "12%", textAlign: "center" }]}>Firma</Text>
          </View>
          {data.ejecutores.length === 0 ? (
            <Text style={s.empty}>Sin personal ejecutor registrado.</Text>
          ) : (
            data.ejecutores.map((e, i) => (
              <View key={i} style={s.tr}>
                <Text style={[s.td, { width: "16%" }]}>{e.cedula || "—"}</Text>
                <Text style={[s.td, { width: "24%" }]}>{e.nombre || "—"}</Text>
                <Text style={[s.td, { width: "20%" }]}>{e.capacitacion || "—"}</Text>
                <Text style={[s.td, { width: "16%" }]}>{e.profesion || "—"}</Text>
                <Text style={[s.td, { width: "12%" }]}>{e.seguridadSocial || "—"}</Text>
                <View style={{ width: "12%", borderLeftWidth: 1, borderLeftColor: "#F0EBE5" }}></View>
              </View>
            ))
          )}
        </View>

        {/* 2. Descripción del trabajo */}
        <Text style={s.sectionTitle}>2. Descripción del trabajo a realizar</Text>
        <View style={s.grid}>
          <Campo label="Tipos de trabajos en alturas" value={data.tiposTrabajo} full />
          <Campo label="Herramientas a utilizar" value={data.herramientas} />
          <Campo label="Altura aproximada (mts)" value={data.alturaAprox} />
        </View>

        {/* 3. Medidas de prevención */}
        <Text style={s.sectionTitle}>3. Medidas de prevención y protección</Text>
        <Text style={s.fieldLabel}>Sistemas de acceso a utilizar</Text>
        <View style={s.chipsRow}>
          {SISTEMAS_ACCESO.map((sa) => {
            const on = data.sistemasAcceso.includes(sa.id);
            return (
              <Text key={sa.id} style={[s.chip, on ? s.chipOn : {}]}>
                {on ? "[x] " : "[ ] "}{sa.label}
              </Text>
            );
          })}
        </View>
        {data.sistemasAccesoOtros ? <Text style={s.obsBox}>Otros (¿cuáles?): {data.sistemasAccesoOtros}</Text> : null}

        <Text style={s.fieldLabel}>Otras tareas de alto riesgo involucradas</Text>
        <View style={s.chipsRow}>
          {OTRAS_TAR.map((t) => {
            const on = !!data.otrasTar[t.id];
            return (
              <Text key={t.id} style={[s.chip, on ? s.chipOn : {}]}>
                {on ? "[x] " : "[ ] "}{t.label}
              </Text>
            );
          })}
        </View>
        {data.otrasTarCuales ? <Text style={s.obsBox}>Otras (¿cuáles?): {data.otrasTarCuales}</Text> : null}

        <Text style={s.fieldLabel}>Procedimiento para desarrollar el trabajo</Text>
        <View style={s.obsBox}><Text>{data.procedimiento || "—"}</Text></View>

        <Text style={s.fieldLabel}>EPP y sistemas de protección contra caídas</Text>
        <View style={s.chipsRow}>
          {EPP_ALTURA.map((ep) => {
            const on = data.epp.includes(ep.id);
            return (
              <Text key={ep.id} style={[s.chip, on ? s.chipOn : {}]}>
                {on ? "[x] " : "[ ] "}{ep.label}
              </Text>
            );
          })}
        </View>
        {data.eppOtros ? <Text style={s.obsBox}>Otros EPP (¿cuáles?): {data.eppOtros}</Text> : null}

        {/* 4. Lista de chequeo */}
        <Text style={s.sectionTitle} break>4. Lista de verificación</Text>
        <View style={s.table}>
          <View style={s.trHead}>
            <Text style={[s.thText, { width: "82%" }]}>Ítem</Text>
            <Text style={[s.thText, { width: "18%", textAlign: "center" }]}>Respuesta</Text>
          </View>
          {CHEQUEO_ALTURA.map((item) => {
            const r = data.chequeo[item.id] ?? "";
            return (
              <View key={item.id} style={s.tr} wrap={false}>
                <Text style={[s.td, { width: "82%" }]}>{item.texto}</Text>
                <Text style={[s.resp, { width: "18%", color: respColor(r) }]}>
                  {r ? RESPUESTA_LABEL[r] : "—"}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Autorización y firma */}
        <Text style={s.sectionTitle}>Autorización (Emisor)</Text>
        <View style={s.firmaBox} wrap={false}>
          <View style={s.firmaCol}>
            <View style={s.firmaSlot}>
              {data.firmaDataUrl ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image src={data.firmaDataUrl} style={s.firmaImg} />
              ) : null}
            </View>
            <View style={s.firmaLinea}>
              <Text style={s.fieldValue}>{data.emisorNombre || "—"}</Text>
              <Text style={s.fieldLabel}>Nombre de quien autoriza</Text>
            </View>
          </View>
          <View style={s.firmaCol}>
            <View style={s.firmaSlot} />
            <View style={s.firmaLinea}>
              <Text style={s.fieldValue}>C.C. {data.emisorCedula || "—"}</Text>
              <Text style={s.fieldLabel}>Cédula</Text>
            </View>
          </View>
        </View>
        <Text style={s.disclaimer}>
          Esta firma tiene carácter informativo y NO constituye firma electrónica certificada
          según la Ley 527 de 1999.
        </Text>
        <Text style={[s.disclaimer, { marginTop: 4 }]}>
          El permiso de trabajo en alturas debe tener en cuenta las medidas para garantizar que se mantenga una distancia segura entre el trabajo y lineas o equipos eléctricos energizados y que se cuente con los elementos de protección necesarios, acordes con el nivel de riesgo (escaleras dieléctricas, parrilas, EPP dieléctrico, arco eléctrico, entre otros.)
        </Text>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generado por Actium · {new Date().toLocaleString("es-CO")}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function buildPermisoAlturaPDFBlob(data: PermisoAlturaPDFData): Promise<Blob> {
  return pdf(<PermisoAlturaDocument data={data} />).toBlob();
}
