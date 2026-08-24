"use client";

import { Document, Page, View, Text, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import {
  NOTA_LEGAL_EPP,
  CONSTANCIA_TRABAJADOR_EPP,
  filasEntregadas,
  type EstadoElementoEpp,
  type ElementoAdicionalEpp,
} from "@/constants/entrega-epp";
import { getLogoSrc } from "@/lib/pdf-logo";
import { ACTIUM_PDF, registerActiumFonts } from "@/lib/pdf-fonts";

registerActiumFonts();

// ─── Tipo de datos del cargo (serializable) ──────────────────────────────────

export type EntregaEppPDFData = {
  empresa: string;
  obra: string;
  area: string;
  fecha: string;
  empleadoId: string;
  trabajadorNombre: string;
  trabajadorCedula: string;
  trabajadorCargo: string;
  elementos: Record<string, EstadoElementoEpp>;
  adicionales: ElementoAdicionalEpp[];
  observaciones: string;
  trabajadorFirma: string;
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
  legalBox: { borderWidth: 1, borderColor: BEIGE_BORDER, backgroundColor: SEASHELL, borderRadius: 6, padding: 8, fontSize: 7.5, color: "#3A3A3A", lineHeight: 1.4, marginBottom: 14, textAlign: "justify" },
  sectionTitle: { fontSize: 9, fontFamily: "Manrope", fontWeight: 700, color: ESPRESSO, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, marginTop: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  field: { width: "50%", marginBottom: 6, paddingRight: 8 },
  fieldFull: { width: "100%", marginBottom: 6 },
  fieldLabel: { fontSize: 6.5, color: SADDLE, textTransform: "uppercase", letterSpacing: 0.5, fontFamily: "Manrope", fontWeight: 700, marginBottom: 2 },
  fieldValue: { fontSize: 9, color: "#282828" },
  table: { borderWidth: 1, borderColor: BEIGE_BORDER, borderRadius: 4, overflow: "hidden" },
  trHead: { flexDirection: "row", backgroundColor: ESPRESSO },
  thText: { color: "#FFFFFF", fontSize: 7, fontFamily: "Manrope", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, paddingVertical: 5, paddingHorizontal: 5 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BEIGE_BORDER },
  trAlt: { backgroundColor: ACTIUM_PDF.beigeRow },
  td: { fontSize: 8, paddingVertical: 5, paddingHorizontal: 5, color: "#3A3A3A" },
  tdCenter: { fontSize: 8, paddingVertical: 5, paddingHorizontal: 5, color: "#3A3A3A", textAlign: "center" },
  obsBox: { borderWidth: 1, borderColor: BEIGE_BORDER, backgroundColor: SEASHELL, borderRadius: 6, padding: 8, fontSize: 9, color: "#3A3A3A", lineHeight: 1.4 },
  vacio: { fontSize: 8, color: GRAY, fontStyle: "italic", paddingVertical: 8 },
  legalText: { fontSize: 7.5, color: "#3A3A3A", fontStyle: "italic", lineHeight: 1.4, marginBottom: 10, textAlign: "justify" },
  sigTable: { borderWidth: 1, borderColor: BEIGE_BORDER, borderRadius: 4, overflow: "hidden", marginBottom: 10 },
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

function EntregaEppDocument({ data }: { data: EntregaEppPDFData }) {
  const filas = filasEntregadas(data.elementos, data.adicionales);

  return (
    <Document title={`Cargo de Entrega de EPP ${data.trabajadorNombre} ${data.fecha}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={getLogoSrc()} style={s.brandLogo} />
          </View>
          <View>
            <Text style={s.docTitle}>Cargo de Entrega de EPP</Text>
            <Text style={s.docMeta}>Elementos de protección personal</Text>
            <Text style={s.docMeta}>{data.fecha || "—"}</Text>
          </View>
        </View>

        <Text style={s.legalBox}>{NOTA_LEGAL_EPP}</Text>

        {/* Identificación */}
        <Text style={s.sectionTitle}>Identificación</Text>
        <View style={s.grid}>
          <Campo label="Nombre del trabajador" value={data.trabajadorNombre} />
          <Campo label="Cédula" value={data.trabajadorCedula} />
          <Campo label="Cargo" value={data.trabajadorCargo} />
          <Campo label="Área" value={data.area} />
          <Campo label="Obra" value={data.obra} />
          <Campo label="Fecha" value={data.fecha} />
        </View>

        {/* Elementos entregados */}
        <Text style={s.sectionTitle}>Elementos entregados</Text>
        {filas.length === 0 ? (
          <Text style={s.vacio}>No se registraron elementos entregados en este cargo.</Text>
        ) : (
          <View style={s.table}>
            <View style={s.trHead}>
              <Text style={[s.thText, { width: "46%" }]}>Elemento entregado</Text>
              <Text style={[s.thText, { width: "16%", textAlign: "center" }]}>Unidad</Text>
              <Text style={[s.thText, { width: "16%", textAlign: "center" }]}>Cantidad</Text>
              <Text style={[s.thText, { width: "22%", textAlign: "center" }]}>Fecha de recepción</Text>
            </View>
            {filas.map((fila, i) => (
              <View key={i} style={[s.tr, i % 2 === 1 ? s.trAlt : {}]} wrap={false}>
                <Text style={[s.td, { width: "46%" }]}>{fila.nombre}</Text>
                <Text style={[s.tdCenter, { width: "16%" }]}>{fila.unidad}</Text>
                <Text style={[s.tdCenter, { width: "16%" }]}>{fila.cantidad || "—"}</Text>
                <Text style={[s.tdCenter, { width: "22%" }]}>{fila.fechaRecepcion || "—"}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Observaciones */}
        {data.observaciones ? (
          <View>
            <Text style={s.sectionTitle}>Observaciones</Text>
            <View style={s.obsBox}>
              <Text>{data.observaciones}</Text>
            </View>
          </View>
        ) : null}

        {/* Constancia y firma */}
        <Text style={s.sectionTitle} break>
          Constancia de recibido
        </Text>
        <Text style={s.legalText}>{CONSTANCIA_TRABAJADOR_EPP}</Text>

        <View style={s.sigTable}>
          <View style={[s.trHead, { backgroundColor: "#EBE6E0" }]}>
            <Text style={s.sigThText}>FIRMA DEL TRABAJADOR QUE RECIBE</Text>
          </View>
          <View style={[s.sigTr, { borderBottomWidth: 0 }]}>
            <View style={[s.sigTdName, { width: "50%" }]}>
              <Text>{data.trabajadorNombre || "—"}</Text>
              <Text style={{ fontSize: 6, color: GRAY, marginTop: 2 }}>C.C. {data.trabajadorCedula || "—"}</Text>
            </View>
            <View style={[s.sigTdSign, { width: "50%" }]}>
              {data.trabajadorFirma ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image src={data.trabajadorFirma} style={s.sigImg} />
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

export async function buildEntregaEppPDFBlob(data: EntregaEppPDFData): Promise<Blob> {
  return pdf(<EntregaEppDocument data={data} />).toBlob();
}
