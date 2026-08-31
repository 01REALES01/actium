"use client";

import { Document, Page, View, Text, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import { getLogoSrc } from "@/lib/pdf-logo";
import { ACTIUM_PDF, registerActiumFonts } from "@/lib/pdf-fonts";
import { RESULTADO_CONTEO_LABEL } from "@/constants/inventario";
import type { ConteoResultado } from "@/types/database.types";

registerActiumFonts();

export type ConteoPDFItem = {
  codigo: string;
  nombre: string;
  resultado: ConteoResultado;
  nota: string;
};

export type ConteoPDFData = {
  ambitoNombre: string;
  empresaNombre: string | null;
  fecha: string;
  responsableNombre: string;
  observaciones: string;
  items: ConteoPDFItem[];
  firma: string;
};

const ESPRESSO = ACTIUM_PDF.espresso;
const SADDLE = ACTIUM_PDF.saddle;
const SEASHELL = ACTIUM_PDF.seashell;
const BEIGE_BORDER = ACTIUM_PDF.beigeBorder;
const GRAY = ACTIUM_PDF.gray;
const GREEN = ACTIUM_PDF.green;
const RED = ACTIUM_PDF.red;

const s = StyleSheet.create({
  page: { paddingTop: 30, paddingBottom: 34, paddingHorizontal: 40, fontSize: 9, color: "#282828", fontFamily: "Manrope" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 2, borderBottomColor: ESPRESSO, paddingBottom: 10, marginBottom: 14 },
  brandLogo: { width: 118, height: 32, objectFit: "contain" },
  docTitle: { fontSize: 11, fontFamily: "Manrope", fontWeight: 700, color: "#282828", textAlign: "right" },
  docMeta: { fontSize: 8, color: GRAY, textAlign: "right", marginTop: 3 },
  sectionTitle: { fontSize: 9, fontFamily: "Manrope", fontWeight: 700, color: ESPRESSO, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, marginTop: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  field: { width: "50%", marginBottom: 6, paddingRight: 8 },
  fieldFull: { width: "100%", marginBottom: 6 },
  fieldLabel: { fontSize: 6.5, color: SADDLE, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "Manrope", fontWeight: 700, marginBottom: 2 },
  fieldValue: { fontSize: 9, color: "#282828" },
  totales: { flexDirection: "row", gap: 8, marginBottom: 4 },
  totalBox: { flex: 1, borderWidth: 1, borderColor: BEIGE_BORDER, borderRadius: 6, padding: 8, alignItems: "center" },
  totalValor: { fontSize: 16, fontFamily: "Manrope", fontWeight: 700 },
  totalLabel: { fontSize: 6.5, color: GRAY, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 },
  table: { borderWidth: 1, borderColor: BEIGE_BORDER, borderRadius: 4 },
  trHead: { flexDirection: "row", backgroundColor: ESPRESSO },
  thText: { color: "#FFFFFF", fontSize: 7, fontFamily: "Manrope", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, paddingVertical: 5, paddingHorizontal: 5 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BEIGE_BORDER },
  trAlt: { backgroundColor: ACTIUM_PDF.beigeRow },
  td: { fontSize: 8, paddingVertical: 5, paddingHorizontal: 5, color: "#3A3A3A" },
  tdCenter: { fontSize: 8, paddingVertical: 5, paddingHorizontal: 5, color: "#3A3A3A", textAlign: "center" },
  obsBox: { borderWidth: 1, borderColor: BEIGE_BORDER, backgroundColor: SEASHELL, borderRadius: 6, padding: 8, fontSize: 9, color: "#3A3A3A", lineHeight: 1.4 },
  vacio: { fontSize: 8, color: GRAY, fontStyle: "italic", paddingVertical: 8 },
  sigTable: { borderWidth: 1, borderColor: BEIGE_BORDER, borderRadius: 4, marginBottom: 10 },
  sigThText: { color: ESPRESSO, fontSize: 7, fontFamily: "Manrope", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, paddingVertical: 5, textAlign: "center" },
  sigTr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BEIGE_BORDER, minHeight: 55 },
  sigTdName: { fontSize: 7.5, padding: 5, color: "#3A3A3A", justifyContent: "center" },
  sigTdSign: { padding: 2, justifyContent: "flex-end", alignItems: "center" },
  sigImg: { width: 110, height: 45, objectFit: "contain" },
  disclaimer: { fontSize: 6.5, color: GRAY, fontStyle: "italic", marginTop: 8, lineHeight: 1.3 },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#E5E0DA", paddingTop: 6 },
  footerText: { fontSize: 7, color: GRAY },
});

function Campo({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <View style={full ? s.fieldFull : s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue}>{value || "—"}</Text>
    </View>
  );
}

function colorResultado(resultado: ConteoResultado): string {
  if (resultado === "existe") return GREEN;
  if (resultado === "novedad") return SADDLE;
  return RED;
}

function ConteoDocument({ data }: { data: ConteoPDFData }) {
  const existentes = data.items.filter((i) => i.resultado === "existe").length;
  const novedades = data.items.filter((i) => i.resultado === "novedad").length;
  const faltantes = data.items.filter((i) => i.resultado === "faltante");

  return (
    <Document title={`Acta de Inventario ${data.ambitoNombre} ${data.fecha}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={getLogoSrc()} style={s.brandLogo} />
          </View>
          <View>
            <Text style={s.docTitle}>Acta de Inventario de Herramientas</Text>
            <Text style={s.docMeta}>{data.ambitoNombre}</Text>
            <Text style={s.docMeta}>{data.fecha || "—"}</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>Identificación</Text>
        <View style={s.grid}>
          <Campo label="Ámbito" value={data.ambitoNombre} />
          <Campo label="Empresa" value={data.empresaNombre ?? "Actium (bodega)"} />
          <Campo label="Fecha" value={data.fecha} />
          <Campo label="Responsable" value={data.responsableNombre} />
        </View>

        <Text style={s.sectionTitle}>Resultado del conteo</Text>
        <View style={s.totales}>
          <View style={s.totalBox}>
            <Text style={[s.totalValor, { color: GREEN }]}>{existentes}</Text>
            <Text style={s.totalLabel}>Existen</Text>
          </View>
          <View style={s.totalBox}>
            <Text style={[s.totalValor, { color: SADDLE }]}>{novedades}</Text>
            <Text style={s.totalLabel}>Con novedad</Text>
          </View>
          <View style={s.totalBox}>
            <Text style={[s.totalValor, { color: RED }]}>{faltantes.length}</Text>
            <Text style={s.totalLabel}>No existen</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>Detalle del conteo</Text>
        {data.items.length === 0 ? (
          <Text style={s.vacio}>Este conteo no tiene herramientas registradas.</Text>
        ) : (
          <View style={s.table}>
            <View style={s.trHead} fixed>
              <Text style={[s.thText, { width: "16%" }]}>Código</Text>
              <Text style={[s.thText, { width: "34%" }]}>Herramienta</Text>
              <Text style={[s.thText, { width: "18%", textAlign: "center" }]}>Resultado</Text>
              <Text style={[s.thText, { width: "32%" }]}>Nota</Text>
            </View>
            {data.items.map((item, i) => (
              <View key={i} style={[s.tr, i % 2 === 1 ? s.trAlt : {}]} wrap={false}>
                <Text style={[s.td, { width: "16%" }]}>{item.codigo}</Text>
                <Text style={[s.td, { width: "34%" }]}>{item.nombre}</Text>
                <Text style={[s.tdCenter, { width: "18%", color: colorResultado(item.resultado), fontFamily: "Manrope", fontWeight: 700 }]}>
                  {RESULTADO_CONTEO_LABEL[item.resultado]}
                </Text>
                <Text style={[s.td, { width: "32%" }]}>{item.nota || "—"}</Text>
              </View>
            ))}
          </View>
        )}

        {faltantes.length > 0 ? (
          <View>
            <Text style={s.sectionTitle}>Herramientas faltantes</Text>
            <View style={[s.obsBox, { borderColor: RED }]}>
              {faltantes.map((item, i) => (
                <Text key={i} style={{ marginBottom: i === faltantes.length - 1 ? 0 : 3 }}>
                  {item.codigo} · {item.nombre}
                  {item.nota ? ` — ${item.nota}` : ""}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        {data.observaciones ? (
          <View>
            <Text style={s.sectionTitle}>Observaciones</Text>
            <View style={s.obsBox}>
              <Text>{data.observaciones}</Text>
            </View>
          </View>
        ) : null}

        <View wrap={false}>
          <Text style={s.sectionTitle}>Constancia</Text>
          <View style={s.sigTable}>
            <View style={[s.trHead, { backgroundColor: "#EBE6E0" }]}>
              <Text style={s.sigThText}>FIRMA DEL RESPONSABLE DEL CONTEO</Text>
            </View>
            <View style={[s.sigTr, { borderBottomWidth: 0 }]}>
              <View style={[s.sigTdName, { width: "50%" }]}>
                <Text>{data.responsableNombre || "—"}</Text>
              </View>
              <View style={[s.sigTdSign, { width: "50%" }]}>
                {data.firma ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image src={data.firma} style={s.sigImg} />
                ) : (
                  <Text style={{ fontSize: 6, color: GRAY }}>Firma:</Text>
                )}
              </View>
            </View>
          </View>

          <Text style={s.disclaimer}>
            Esta firma tiene carácter informativo y NO constituye firma electrónica certificada según
            la Ley 527 de 1999.
          </Text>
        </View>

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

export async function buildConteoPDFBlob(data: ConteoPDFData): Promise<Blob> {
  return pdf(<ConteoDocument data={data} />).toBlob();
}
