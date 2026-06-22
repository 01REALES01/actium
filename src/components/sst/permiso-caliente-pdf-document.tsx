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
  PERMISOS_ADICIONALES,
  ENERGIAS_PELIGROSAS,
  EPP_CALIENTE,
  CHEQUEO_CALIENTE,
  RESPUESTA_LABEL,
  type RespuestaChequeo,
  type RespuestaSiNo,
} from "@/constants/permiso-caliente";
import { getLogoSrc } from "@/lib/pdf-logo";
import { ACTIUM_PDF, registerActiumFonts } from "@/lib/pdf-fonts";

registerActiumFonts();

// ─── Tipo de datos del permiso (serializable) ────────────────────────────────

export type TrabajadorCaliente = {
  nombre: string;
  cedula: string;
};

export type PermisoCalientePDFData = {
  // 1. Datos básicos
  empresa: string;
  area: string;
  proposito: string;
  desde: string; // fecha
  desdeHora: string;
  hasta: string; // fecha
  hastaHora: string;
  // 2. Permisos adicionales
  permisosAdicionales: Record<string, RespuestaSiNo>; // id -> si/no
  instruccionesSO: Record<string, string>; // id -> instrucciones
  // 3. Lista de chequeo por secciones
  chequeo: Record<string, RespuestaChequeo>; // itemId -> respuesta
  // 4. Bloqueo de energías
  energias: string[]; // ids
  equiposBloquear: string;
  mecanismoBloqueo: string;
  bloqueadoPor: string;
  // 5. EPP
  epp: string[]; // ids
  // 6. Trabajadores y firmas
  trabajadores: TrabajadorCaliente[];
  emisorNombre: string;
  emisorFirma: string;
  coordinadorNombre: string;
  coordinadorFirma: string;
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
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: ESPRESSO, paddingBottom: 10, marginBottom: 14 },
  brand: { fontSize: 20, fontFamily: "Manrope", fontWeight: 700, color: ESPRESSO, letterSpacing: 1 },
  brandLogo: { width: 118, height: 32, objectFit: "contain" },
  brandSub: { fontSize: 7, color: GRAY, letterSpacing: 2, marginTop: 2, textTransform: "uppercase" },
  docTitle: { fontSize: 11, fontFamily: "Manrope", fontWeight: 700, color: "#282828", textAlign: "right" },
  docMeta: { fontSize: 8, color: GRAY, textAlign: "right", marginTop: 3 },
  sectionTitle: { fontSize: 9, fontFamily: "Manrope", fontWeight: 700, color: ESPRESSO, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, marginTop: 14 },
  subTitle: { fontSize: 8, fontFamily: "Manrope", fontWeight: 700, color: ORANGE, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 8, marginBottom: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  field: { width: "50%", marginBottom: 6, paddingRight: 8 },
  fieldFull: { width: "100%", marginBottom: 6 },
  fieldLabel: { fontSize: 6.5, color: SADDLE, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "Manrope", fontWeight: 700, marginBottom: 2 },
  fieldValue: { fontSize: 9, color: "#282828" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 4 },
  chip: { borderWidth: 1, borderColor: BEIGE_BORDER, borderRadius: 4, paddingVertical: 3, paddingHorizontal: 6, fontSize: 7.5, color: "#3A3A3A" },
  chipOn: { borderColor: ORANGE, backgroundColor: "#FDEDE4", color: ESPRESSO },
  obsBox: { borderWidth: 1, borderColor: BEIGE_BORDER, backgroundColor: SEASHELL, borderRadius: 6, padding: 8, fontSize: 9, color: "#3A3A3A", lineHeight: 1.4, marginBottom: 4 },
  table: { borderWidth: 1, borderColor: BEIGE_BORDER, borderRadius: 4, overflow: "hidden", marginBottom: 4 },
  trHead: { flexDirection: "row", backgroundColor: ESPRESSO },
  thText: { color: "#FFFFFF", fontSize: 7, fontFamily: "Manrope", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, paddingVertical: 5, paddingHorizontal: 5 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BEIGE_BORDER },
  td: { fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 5, color: "#3A3A3A" },
  resp: { fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 5, textAlign: "center", fontFamily: "Manrope", fontWeight: 700 },
  empty: { fontSize: 8, color: GRAY, fontStyle: "italic", paddingVertical: 8, paddingHorizontal: 6 },
  firmaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  firmaCol: { width: "48%" },
  firmaImg: { width: 150, height: 60, objectFit: "contain" },
  firmaLinea: { borderTopWidth: 1, borderTopColor: "#282828", marginTop: 4, paddingTop: 3 },
  disclaimer: { fontSize: 6.5, color: GRAY, fontStyle: "italic", marginTop: 8, lineHeight: 1.3 },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#E5E0DA", paddingTop: 6 },
  footerText: { fontSize: 7, color: GRAY },
  // signatures table
  legalText: { fontSize: 7.5, color: "#3A3A3A", fontStyle: "italic", lineHeight: 1.4, marginBottom: 10, textAlign: "justify" },
  sigTable: { borderWidth: 1, borderColor: BEIGE_BORDER, borderRadius: 4, overflow: "hidden", marginBottom: 10 },
  sigThText: { color: ESPRESSO, fontSize: 7, fontFamily: "Manrope", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, paddingVertical: 5, textAlign: "center" },
  sigTr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BEIGE_BORDER, minHeight: 40 },
  sigTdName: { fontSize: 7.5, padding: 5, color: "#3A3A3A", justifyContent: "center" },
  sigTdSign: { padding: 2, justifyContent: "flex-end", alignItems: "center" },
  sigImg: { width: 80, height: 35, objectFit: "contain" },
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

function FirmaCol({ nombre, firma, rol }: { nombre: string; firma: string; rol: string }) {
  return (
    <View style={s.firmaCol}>
      {firma ? (
        // eslint-disable-next-line jsx-a11y/alt-text
        <Image src={firma} style={s.firmaImg} />
      ) : (
        <View style={{ height: 60 }} />
      )}
      <View style={s.firmaLinea}>
        <Text style={s.fieldValue}>{nombre || "—"}</Text>
        <Text style={s.fieldLabel}>{rol}</Text>
      </View>
    </View>
  );
}

function PermisoCalienteDocument({ data }: { data: PermisoCalientePDFData }) {
  return (
    <Document title={`Permiso Trabajo en Caliente ${data.empresa} ${data.desde}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={getLogoSrc()} style={s.brandLogo} />
          </View>
          <View>
            <Text style={s.docTitle}>Permiso para Trabajos en Caliente</Text>
            <Text style={s.docMeta}>{data.empresa || "—"}</Text>
            <Text style={s.docMeta}>{data.desde || "—"}</Text>
          </View>
        </View>

        {/* 1. Datos básicos */}
        <Text style={s.sectionTitle}>1. Datos del permiso</Text>
        <View style={s.grid}>
          <Campo label="Empresa" value={data.empresa} />
          <Campo label="Área donde se realiza el trabajo" value={data.area} />
          <Campo label="Propósito del trabajo" value={data.proposito} full />
          <Campo label="Desde" value={[data.desde, data.desdeHora].filter(Boolean).join("  ")} />
          <Campo label="Hasta" value={[data.hasta, data.hastaHora].filter(Boolean).join("  ")} />
        </View>

        {/* 2. Permisos adicionales */}
        <Text style={s.sectionTitle}>2. Permisos adicionales requeridos</Text>
        <View style={s.chipsRow}>
          {PERMISOS_ADICIONALES.map((p) => {
            const r = data.permisosAdicionales[p.id] ?? "";
            return (
              <Text key={p.id} style={[s.chip, r === "si" ? s.chipOn : {}]}>
                {p.label}: {r === "si" ? "Sí" : r === "no" ? "No" : "—"}
              </Text>
            );
          })}
        </View>
        {PERMISOS_ADICIONALES.map((p) => {
          const r = data.permisosAdicionales[p.id];
          const instr = data.instruccionesSO?.[p.id];
          if (r === "si" && instr) {
            return <Text key={`instr-${p.id}`} style={s.obsBox}>Instrucciones SO ({p.label}): {instr}</Text>;
          }
          return null;
        })}

        {/* 3. Lista de verificación */}
        <Text style={s.sectionTitle}>3. Lista de verificación</Text>
        {CHEQUEO_CALIENTE.map((sec) => (
          <View key={sec.id} wrap={false}>
            <Text style={s.subTitle}>{sec.titulo}</Text>
            <View style={s.table}>
              <View style={s.trHead}>
                <Text style={[s.thText, { width: "82%" }]}>Ítem</Text>
                <Text style={[s.thText, { width: "18%", textAlign: "center" }]}>Respuesta</Text>
              </View>
              {sec.items.map((item) => {
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
          </View>
        ))}

        {/* 4. Bloqueo de energías */}
        <Text style={s.sectionTitle} break>4. Bloqueo de energías peligrosas</Text>
        <View style={s.chipsRow}>
          {ENERGIAS_PELIGROSAS.map((en) => {
            const on = data.energias.includes(en.id);
            return (
              <Text key={en.id} style={[s.chip, on ? s.chipOn : {}]}>
                {on ? "[x] " : "[ ] "}{en.label}
              </Text>
            );
          })}
        </View>
        <View style={s.grid}>
          <Campo label="Equipos que deben ser bloqueados" value={data.equiposBloquear} full />
          <Campo label="Mecanismo utilizado para el bloqueo" value={data.mecanismoBloqueo} />
          <Campo label="Bloqueado por" value={data.bloqueadoPor} />
        </View>

        {/* 5. EPP */}
        <Text style={s.sectionTitle}>5. Elementos de protección personal</Text>
        <View style={s.chipsRow}>
          {EPP_CALIENTE.map((ep) => {
            const on = data.epp.includes(ep.id);
            return (
              <Text key={ep.id} style={[s.chip, on ? s.chipOn : {}]}>
                {on ? "[x] " : "[ ] "}{ep.label}
              </Text>
            );
          })}
        </View>

        {/* Firmas y Compromiso */}
        <Text style={s.sectionTitle} break>Firmas y Compromiso</Text>
        <Text style={s.legalText}>
          Personalmente hemos verificado los puntos anteriores y consideramos seguro realizar el proceso.{"\n"}
          Como trabajador me comprometo a: dar por terminado el trabajo si durante la ejecución del mismo existen cambios en alguna de las condiciones: personales, locativas, de seguridad, climáticas o si escucho la señal de alarma, al igual me comprometo a avisar a la persona que me otorgo el permiso de trabajo cuando se termine la labor.
        </Text>

        <View style={s.sigTable}>
          {/* Main header */}
          <View style={[s.trHead, { backgroundColor: "#EBE6E0" }]}>
            <Text style={[s.sigThText, { width: "50%", borderRightWidth: 1, borderRightColor: "#D1CFC9" }]}>INICIO DEL PERMISO</Text>
            <Text style={[s.sigThText, { width: "50%" }]}>FIN DEL PERMISO</Text>
          </View>
          
          {data.trabajadores.length === 0 ? (
            <Text style={s.empty}>Sin trabajadores registrados.</Text>
          ) : (
            data.trabajadores.map((t, i) => (
              <View key={`t-${i}`} style={s.sigTr}>
                <View style={[s.sigTdName, { width: "25%", borderRightWidth: 1, borderRightColor: "#F0EBE5" }]}>
                  <Text>{t.nombre || "—"}</Text>
                  <Text style={{ fontSize: 6, color: GRAY, marginTop: 2 }}>C.C. {t.cedula || "—"}</Text>
                </View>
                <View style={[s.sigTdSign, { width: "25%", borderRightWidth: 1, borderRightColor: "#F0EBE5" }]}>
                  <Text style={{ fontSize: 6, color: GRAY }}>Firma:</Text>
                </View>
                <View style={[s.sigTdName, { width: "25%", borderRightWidth: 1, borderRightColor: "#F0EBE5" }]}>
                  <Text>{t.nombre || "—"}</Text>
                  <Text style={{ fontSize: 6, color: GRAY, marginTop: 2 }}>C.C. {t.cedula || "—"}</Text>
                </View>
                <View style={[s.sigTdSign, { width: "25%" }]}>
                  <Text style={{ fontSize: 6, color: GRAY }}>Firma (Cierre):</Text>
                </View>
              </View>
            ))
          )}

          {/* Emisor */}
          <View style={s.sigTr}>
            <View style={[s.sigTdName, { width: "25%", borderRightWidth: 1, borderRightColor: "#F0EBE5" }]}>
              <Text>{data.emisorNombre || "—"}</Text>
              <Text style={{ fontSize: 6, color: GRAY, marginTop: 2 }}>Emisor del Permiso</Text>
            </View>
            <View style={[s.sigTdSign, { width: "25%", borderRightWidth: 1, borderRightColor: "#F0EBE5" }]}>
              {data.emisorFirma ? <Image src={data.emisorFirma} style={s.sigImg} /> : <Text style={{ fontSize: 6, color: GRAY }}>Firma:</Text>}
            </View>
            <View style={[s.sigTdName, { width: "25%", borderRightWidth: 1, borderRightColor: "#F0EBE5" }]}>
              <Text>{data.emisorNombre || "—"}</Text>
              <Text style={{ fontSize: 6, color: GRAY, marginTop: 2 }}>Emisor del Permiso</Text>
            </View>
            <View style={[s.sigTdSign, { width: "25%" }]}>
              <Text style={{ fontSize: 6, color: GRAY }}>Firma (Cierre):</Text>
            </View>
          </View>

          {/* SISO */}
          <View style={[s.sigTr, { borderBottomWidth: 0 }]}>
            <View style={[s.sigTdName, { width: "25%", borderRightWidth: 1, borderRightColor: "#F0EBE5" }]}>
              <Text>{data.coordinadorNombre || "—"}</Text>
              <Text style={{ fontSize: 6, color: GRAY, marginTop: 2 }}>Coordinador SISO</Text>
            </View>
            <View style={[s.sigTdSign, { width: "25%", borderRightWidth: 1, borderRightColor: "#F0EBE5" }]}>
              {data.coordinadorFirma ? <Image src={data.coordinadorFirma} style={s.sigImg} /> : <Text style={{ fontSize: 6, color: GRAY }}>Firma:</Text>}
            </View>
            <View style={[s.sigTdName, { width: "25%", borderRightWidth: 1, borderRightColor: "#F0EBE5" }]}>
              <Text>{data.coordinadorNombre || "—"}</Text>
              <Text style={{ fontSize: 6, color: GRAY, marginTop: 2 }}>Coordinador SISO</Text>
            </View>
            <View style={[s.sigTdSign, { width: "25%" }]}>
              <Text style={{ fontSize: 6, color: GRAY }}>Firma (Cierre):</Text>
            </View>
          </View>
        </View>

        <Text style={s.disclaimer}>
          La firma impresa del Emisor y Coordinador SISO tiene carácter informativo y autoriza el inicio de labores.
          El cierre del permiso y la conformidad de los trabajadores deben validarse en campo.
        </Text>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>Generado por Actium · {new Date().toLocaleString("es-CO")}</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function buildPermisoCalientePDFBlob(data: PermisoCalientePDFData): Promise<Blob> {
  return pdf(<PermisoCalienteDocument data={data} />).toBlob();
}
