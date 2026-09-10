"use client";

// =============================================================================
// PDF de los documentos de soldadura (WPS / PQR / WPQ, ASME IX y AWS D1.2).
// =============================================================================
// Un solo documento para los seis formatos: recibe la especificación y los
// valores diligenciados y los recorre.
//
// La composición es la del formato de calificación que usa el cliente: TODO es
// una rejilla continua de celdas con borde, etiqueta a la izquierda y valor a
// la derecha, con bandas de sección separando los bloques. Ese "aire de
// planilla" es lo que hace que un inspector lo reconozca como documento de
// calidad y no como un informe. Lo que cambia frente al original son los
// colores y la tipografía, que son los de Actium: café espresso en cabeceras,
// beige en las etiquetas, naranja en los valores diligenciados y Manrope en
// todo el documento.
//
// Reglas de paginación aplicadas (ver PDF-PAGINACION.md): `minPresenceAhead` en
// las bandas de sección, `fixed` en las cabeceras de tabla, `wrap={false}` solo
// por fila, ningún `break` incondicional y sin `overflow: "hidden"`.
// =============================================================================

import React from "react";
import { Document, Page, View, Text, Image, StyleSheet, pdf } from "@react-pdf/renderer";
import {
  filasDiligenciadas,
  type CampoSpec,
  type EspecDocumento,
  type FilaTabla,
  type SeccionSpec,
  type ValoresDocumento,
} from "@/constants/soldadura";
import { getLogoSrc } from "@/lib/pdf-logo";
import { ACTIUM_PDF, registerActiumFonts } from "@/lib/pdf-fonts";

registerActiumFonts();

export type EmpresaPDF = { nombre: string; nit: string; email: string };

export type DocumentoSoldaduraPDFData = {
  espec: EspecDocumento;
  valores: ValoresDocumento;
  /** Consecutivo interno de Actium: WPS-2026-0001. */
  codigo: string;
  empresa: EmpresaPDF;
};

const ORANGE = ACTIUM_PDF.orange;
const ESPRESSO = ACTIUM_PDF.espresso;
const SADDLE = ACTIUM_PDF.saddle;
const SEASHELL = ACTIUM_PDF.seashell;
const BEIGE_ROW = ACTIUM_PDF.beigeRow;
const BORDE = ACTIUM_PDF.beigeBorder;
const GRAY = ACTIUM_PDF.gray;
const BANDA = "#EBE6E0";

const s = StyleSheet.create({
  page: { paddingTop: 26, paddingBottom: 40, paddingHorizontal: 32, fontSize: 8, color: "#282828", fontFamily: "Manrope" },

  // ─── Encabezado ───────────────────────────────────────────────────────────
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  brandLogo: { width: 150, height: 40, objectFit: "contain" },
  headerRight: { alignItems: "flex-end", maxWidth: 330 },
  docTitle: { fontSize: 10, fontFamily: "Manrope", fontWeight: 700, color: ORANGE, textAlign: "right" },
  docSubtitle: { fontSize: 9.5, fontFamily: "Manrope", fontWeight: 700, color: ORANGE, textAlign: "right", textTransform: "uppercase" },
  headerContacto: { textAlign: "center", color: ORANGE, fontSize: 8, marginTop: 6, marginBottom: 10, textDecoration: "underline" },
  headerNorma: { textAlign: "center", color: GRAY, fontSize: 6.5, marginBottom: 10 },

  // ─── Rejilla de celdas ────────────────────────────────────────────────────
  // El borde se dibuja arriba e izquierda en el contenedor y derecha y abajo en
  // cada celda: así la rejilla queda continua y sin líneas dobles.
  grid: { borderTopWidth: 1, borderLeftWidth: 1, borderColor: BORDE, marginBottom: 8 },
  fila: { flexDirection: "row", alignItems: "stretch" },
  celdaEtiqueta: { backgroundColor: SEASHELL, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDE, paddingVertical: 3.5, paddingHorizontal: 5, justifyContent: "center" },
  celdaValor: { borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDE, paddingVertical: 3.5, paddingHorizontal: 5, justifyContent: "center" },
  textoEtiqueta: { fontSize: 7, color: ESPRESSO, fontFamily: "Manrope", fontWeight: 600 },
  textoValor: { fontSize: 7.5, color: ORANGE, fontFamily: "Manrope", fontWeight: 600 },
  textoValorVacio: { fontSize: 7.5, color: "#C9C0B6" },
  textoNotaCelda: { fontSize: 5.5, color: GRAY, fontStyle: "italic", marginTop: 1 },

  // ─── Banda de sección ─────────────────────────────────────────────────────
  banda: { backgroundColor: BANDA, borderWidth: 1, borderColor: BORDE, paddingVertical: 4, paddingHorizontal: 6, marginTop: 8, marginBottom: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bandaTexto: { fontSize: 7.5, fontFamily: "Manrope", fontWeight: 700, color: ESPRESSO, textTransform: "uppercase", letterSpacing: 0.6 },
  bandaRef: { fontSize: 6.5, color: SADDLE, fontFamily: "Manrope", fontWeight: 600 },
  bandaNota: { fontSize: 6, color: GRAY, fontStyle: "italic", lineHeight: 1.3, marginTop: 3, marginBottom: 3 },

  // ─── Tablas de datos ──────────────────────────────────────────────────────
  tabla: { borderTopWidth: 1, borderLeftWidth: 1, borderColor: BORDE, marginBottom: 8 },
  trHead: { flexDirection: "row", backgroundColor: ESPRESSO },
  th: { color: "#FFFFFF", fontSize: 6, fontFamily: "Manrope", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.2, paddingVertical: 4, paddingHorizontal: 4, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDE, textAlign: "center" },
  tr: { flexDirection: "row", alignItems: "stretch" },
  trAlt: { backgroundColor: BEIGE_ROW },
  td: { fontSize: 7, color: ORANGE, fontFamily: "Manrope", fontWeight: 600, paddingVertical: 3.5, paddingHorizontal: 4, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDE, textAlign: "center" },
  tdRotulo: { fontSize: 7, color: ESPRESSO, fontFamily: "Manrope", fontWeight: 600, paddingVertical: 3.5, paddingHorizontal: 4, borderRightWidth: 1, borderBottomWidth: 1, borderColor: BORDE, backgroundColor: SEASHELL, textAlign: "left" },

  // ─── Identidad con retrato ────────────────────────────────────────────────
  identidad: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  identidadDatos: { flex: 1 },
  retratoCaja: { width: 80, marginLeft: 8, borderWidth: 1, borderColor: BORDE, padding: 3, alignItems: "center" },
  retrato: { width: 72, height: 90, objectFit: "cover" },
  retratoVacio: { width: 72, height: 90, backgroundColor: SEASHELL, alignItems: "center", justifyContent: "center" },
  retratoPie: { fontSize: 5.5, color: GRAY, marginTop: 2, textAlign: "center" },

  // ─── Croquis y registro fotográfico ───────────────────────────────────────
  croquisCaja: { borderWidth: 1, borderColor: BORDE, backgroundColor: "#FFFFFF", padding: 4, alignItems: "center", justifyContent: "center", minHeight: 90, marginBottom: 8 },
  croquisImg: { maxHeight: 230, objectFit: "contain" },
  vacioTexto: { fontSize: 6.5, color: GRAY, fontStyle: "italic", paddingVertical: 6 },
  fotosFila: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  fotoCaja: { width: "33.33%", padding: 3 },
  fotoImg: { width: "100%", height: 108, objectFit: "cover", borderWidth: 1, borderColor: BORDE },
  fotoPie: { fontSize: 5.5, color: GRAY, textAlign: "center", marginTop: 2 },

  // ─── Certificación y firmas ───────────────────────────────────────────────
  certText: { fontSize: 7, color: ORANGE, fontFamily: "Manrope", fontWeight: 700, lineHeight: 1.4, marginTop: 10, marginBottom: 14 },
  firmasFila: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  firmaCol: { flex: 1, paddingHorizontal: 6, alignItems: "center" },
  firmaImg: { height: 42, width: 120, objectFit: "contain", marginBottom: 2 },
  firmaHueco: { height: 42, marginBottom: 2 },
  firmaLinea: { borderTopWidth: 1, borderTopColor: "#282828", width: "100%", paddingTop: 3 },
  firmaRotulo: { fontSize: 7, fontFamily: "Manrope", fontWeight: 700, color: "#282828", textAlign: "center" },
  firmaSub: { fontSize: 6.5, color: GRAY, textAlign: "center", marginTop: 1 },
  disclaimer: { fontSize: 6, color: GRAY, fontStyle: "italic", marginTop: 12, lineHeight: 1.3 },
  notaPie: { fontSize: 6, color: GRAY, fontStyle: "italic", marginTop: 4, lineHeight: 1.3 },

  footer: { position: "absolute", bottom: 20, left: 32, right: 32, flexDirection: "row", justifyContent: "space-between" },
  footerText: { fontSize: 6.5, color: GRAY },
  footerPag: { fontSize: 6.5, color: ORANGE, fontFamily: "Manrope", fontWeight: 700 },
});

// ─── Lectores tolerantes del payload ─────────────────────────────────────────
// El payload de un documento emitido hace meses puede no tener una clave que el
// formato agregó después: siempre se lee con un valor por defecto.

const txt = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
const lista = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
const filasDe = (v: unknown): FilaTabla[] => (Array.isArray(v) ? (v as FilaTabla[]) : []);

/** Ancho relativo de una columna dentro de su tabla. */
function anchos(pesos: (number | undefined)[]): string[] {
  const total = pesos.reduce<number>((acc, p) => acc + (p ?? 1), 0);
  return pesos.map((p) => `${((((p ?? 1) as number) / total) * 100).toFixed(3)}%`);
}

// ─── Celdas ──────────────────────────────────────────────────────────────────

function Etiqueta({ ancho, texto, nota }: { ancho: string; texto: string; nota?: string }) {
  return (
    <View style={[s.celdaEtiqueta, { width: ancho }]}>
      <Text style={s.textoEtiqueta}>{texto}</Text>
      {nota ? <Text style={s.textoNotaCelda}>{nota}</Text> : null}
    </View>
  );
}

function Valor({ ancho, texto }: { ancho: string; texto: string }) {
  return (
    <View style={[s.celdaValor, { width: ancho }]}>
      <Text style={texto ? s.textoValor : s.textoValorVacio}>{texto || "—"}</Text>
    </View>
  );
}

/**
 * Un campo simple, resuelto a par etiqueta/valor. Los que no son texto se
 * reducen aquí a una cadena para que toda la rejilla se componga igual.
 */
type Par = { etiqueta: string; valor: string; nota?: string; full?: boolean };

function aPar(campo: CampoSpec, valores: ValoresDocumento): Par | null {
  switch (campo.t) {
    case "texto":
    case "fecha":
      return {
        etiqueta: campo.label,
        valor: txt(valores[campo.id]),
        nota: "nota" in campo ? campo.nota : undefined,
        full: campo.full,
      };
    case "area":
      return { etiqueta: campo.label, valor: txt(valores[campo.id]), nota: campo.nota, full: true };
    case "sino": {
      const v = txt(valores[campo.id]);
      return { etiqueta: campo.label, valor: v === "si" ? "Yes" : v === "no" ? "No" : "", full: campo.full };
    }
    case "check":
      return { etiqueta: campo.label, valor: valores[campo.id] ? "Yes" : "No" };
    case "checks": {
      const marcadas = lista(valores[campo.id]);
      return {
        etiqueta: campo.label,
        valor: campo.opciones.filter((o) => marcadas.includes(o.id)).map((o) => o.label).join(" · "),
        full: true,
      };
    }
    default:
      return null;
  }
}

/** Rejilla de pares etiqueta/valor: dos por renglón, o uno si el campo es ancho. */
function RejillaPares({ pares }: { pares: Par[] }) {
  if (pares.length === 0) return null;

  // Se agrupan de a dos, salvo los `full`, que ocupan el renglón completo.
  const renglones: Par[][] = [];
  for (const par of pares) {
    const ultimo = renglones[renglones.length - 1];
    if (par.full || !ultimo || ultimo.length === 2 || ultimo[0].full) renglones.push([par]);
    else ultimo.push(par);
  }

  return (
    <View style={s.grid}>
      {renglones.map((renglon, i) => (
        <View key={i} style={s.fila} wrap={false}>
          {renglon.length === 1 ? (
            <>
              <Etiqueta ancho="25%" texto={renglon[0].etiqueta} nota={renglon[0].nota} />
              <Valor ancho="75%" texto={renglon[0].valor} />
            </>
          ) : (
            renglon.map((par, j) => (
              <React.Fragment key={j}>
                <Etiqueta ancho="25%" texto={par.etiqueta} nota={par.nota} />
                <Valor ancho="25%" texto={par.valor} />
              </React.Fragment>
            ))
          )}
        </View>
      ))}
    </View>
  );
}

function Tabla({ campo, valores }: { campo: Extract<CampoSpec, { t: "tabla" }>; valores: ValoresDocumento }) {
  const columnaRotulo = campo.filasFijas ? campo.columnas[0].id : undefined;
  const datos = filasDiligenciadas(filasDe(valores[campo.id]), columnaRotulo);
  if (datos.length === 0) return <Text style={s.vacioTexto}>Sin registros.</Text>;

  const ancho = anchos(campo.columnas.map((c) => c.peso));

  return (
    <View style={s.tabla}>
      <View style={s.trHead} fixed>
        {campo.columnas.map((c, i) => (
          <Text key={c.id} style={[s.th, { width: ancho[i] }]}>
            {c.label}
          </Text>
        ))}
      </View>
      {datos.map((fila, i) => (
        <View key={i} style={i % 2 === 1 ? [s.tr, s.trAlt] : s.tr} wrap={false}>
          {campo.columnas.map((c, j) => (
            <Text key={c.id} style={[c.id === columnaRotulo ? s.tdRotulo : s.td, { width: ancho[j] }]}>
              {(fila[c.id] || "").trim() || "—"}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function Croquis({ campo, valores }: { campo: Extract<CampoSpec, { t: "croquis" }>; valores: ValoresDocumento }) {
  const src = txt(valores[campo.id]);
  return (
    <View wrap={false}>
      <View style={s.banda}>
        <Text style={s.bandaTexto}>{campo.label}</Text>
      </View>
      <View style={s.croquisCaja}>
        {src ? (
          // eslint-disable-next-line jsx-a11y/alt-text
          <Image src={src} style={s.croquisImg} />
        ) : (
          <Text style={s.vacioTexto}>Sin croquis adjunto</Text>
        )}
      </View>
    </View>
  );
}

function Galeria({ campo, valores }: { campo: Extract<CampoSpec, { t: "galeria" }>; valores: ValoresDocumento }) {
  const fotos = lista(valores[campo.id]);
  if (fotos.length === 0) return <Text style={s.vacioTexto}>Sin registro fotográfico.</Text>;

  return (
    <View style={s.fotosFila}>
      {fotos.map((src, i) => (
        <View key={i} style={s.fotoCaja} wrap={false}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={src} style={s.fotoImg} />
          <Text style={s.fotoPie}>Fotografía {i + 1}</Text>
        </View>
      ))}
    </View>
  );
}

function Seccion({ seccion, valores }: { seccion: SeccionSpec; valores: ValoresDocumento }) {
  const retrato = seccion.campos.find((c): c is Extract<CampoSpec, { t: "foto" }> => c.t === "foto");
  const pares = seccion.campos.map((c) => aPar(c, valores)).filter((p): p is Par => p !== null);
  const notas = seccion.campos.filter((c): c is Extract<CampoSpec, { t: "nota" }> => c.t === "nota");
  const complejos = seccion.campos.filter(
    (c) => c.t === "tabla" || c.t === "croquis" || c.t === "galeria",
  );

  const rejilla = <RejillaPares pares={pares} />;

  return (
    <View>
      {/* Una banda de sección nunca debe quedar huérfana al pie de la hoja. */}
      <View style={s.banda} minPresenceAhead={78}>
        <Text style={s.bandaTexto}>{seccion.titulo}</Text>
        {seccion.ref ? <Text style={s.bandaRef}>{seccion.ref}</Text> : null}
      </View>

      {seccion.nota ? <Text style={s.bandaNota}>{seccion.nota}</Text> : null}
      {notas.map((n, i) => (
        <Text key={i} style={s.bandaNota}>
          {n.texto}
        </Text>
      ))}

      {/* Con retrato, los datos y la foto van lado a lado: es el encabezado de
          identificación del formato de calificación del cliente. */}
      {retrato ? (
        <View style={s.identidad} wrap={false}>
          <View style={s.identidadDatos}>{rejilla}</View>
          <View style={s.retratoCaja}>
            {txt(valores[retrato.id]) ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={txt(valores[retrato.id])} style={s.retrato} />
            ) : (
              <View style={s.retratoVacio}>
                <Text style={s.vacioTexto}>Sin foto</Text>
              </View>
            )}
            <Text style={s.retratoPie}>{retrato.label}</Text>
          </View>
        </View>
      ) : (
        rejilla
      )}

      {complejos.map((campo, i) => {
        if (campo.t === "tabla") return <Tabla key={campo.id} campo={campo} valores={valores} />;
        if (campo.t === "croquis") return <Croquis key={campo.id} campo={campo} valores={valores} />;
        return <Galeria key={campo.id} campo={campo} valores={valores} />;
      })}
    </View>
  );
}

function DocumentoSoldaduraDocument({ data }: { data: DocumentoSoldaduraPDFData }) {
  const { espec, valores, codigo, empresa } = data;

  return (
    <Document title={`${espec.formulario} ${codigo}`}>
      <Page size="A4" style={s.page}>
        <View fixed>
          <View style={s.header}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={getLogoSrc()} style={s.brandLogo} />
            <View style={s.headerRight}>
              <Text style={s.docTitle}>{espec.titulo}</Text>
              <Text style={s.docSubtitle}>
                {espec.formulario} · {codigo}
              </Text>
            </View>
          </View>
          {empresa.email ? <Text style={s.headerContacto}>{empresa.email}</Text> : null}
          <Text style={s.headerNorma}>
            {[empresa.nombre, empresa.nit && `NIT ${empresa.nit}`, espec.norma, espec.referencia]
              .filter(Boolean)
              .join("  ·  ")}
          </Text>
        </View>

        {espec.secciones.map((seccion) => (
          <Seccion key={seccion.id} seccion={seccion} valores={valores} />
        ))}

        {/* Certificación y firmas caen de corrido tras el contenido y solo
            saltan de página si de verdad no caben enteras. */}
        <View wrap={false}>
          {espec.certificacion ? (
            <Text style={s.certText}>{espec.certificacion}</Text>
          ) : (
            <View style={{ marginTop: 14 }} />
          )}

          <View style={s.firmasFila}>
            {espec.firmas.map((firma) => (
              <View key={firma.id} style={s.firmaCol}>
                {txt(valores[firma.id]) ? (
                  // eslint-disable-next-line jsx-a11y/alt-text
                  <Image src={txt(valores[firma.id])} style={s.firmaImg} />
                ) : (
                  <View style={s.firmaHueco} />
                )}
                <View style={s.firmaLinea}>
                  <Text style={s.firmaRotulo}>{firma.label}</Text>
                  <Text style={s.firmaSub}>{empresa.nombre}</Text>
                </View>
              </View>
            ))}
            <View style={s.firmaCol}>
              <View style={s.firmaHueco} />
              <View style={s.firmaLinea}>
                <Text style={s.firmaRotulo}>Fecha</Text>
                <Text style={s.firmaSub}>Date</Text>
              </View>
            </View>
          </View>

          <Text style={s.disclaimer}>
            Esta firma tiene carácter informativo y NO constituye firma electrónica certificada
            según la Ley 527 de 1999.
          </Text>
          {espec.notaPie ? <Text style={s.notaPie}>{espec.notaPie}</Text> : null}
        </View>

        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {espec.formulario} · {espec.norma} · {codigo}
          </Text>
          <Text
            style={s.footerPag}
            render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function buildDocumentoSoldaduraPDFBlob(data: DocumentoSoldaduraPDFData): Promise<Blob> {
  return pdf(<DocumentoSoldaduraDocument data={data} />).toBlob();
}
