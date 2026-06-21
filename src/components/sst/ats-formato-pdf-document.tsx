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
};

// Paleta del formato: rejilla en marrón café, bandas beige, texto grafito.
const BORDER_COLOR = ACTIUM_PDF.espresso;
const BG_HEADER = ACTIUM_PDF.seashell;
const TEXT_DARK = ACTIUM_PDF.graphite;
const ESPRESSO = ACTIUM_PDF.espresso;

const s = StyleSheet.create({
  page: { 
    paddingTop: 30, 
    paddingBottom: 30, 
    paddingHorizontal: 30, 
    fontSize: 8, 
    color: TEXT_DARK, 
    fontFamily: "Manrope" 
  },
  // Contenedor principal con borde exterior grueso (opcional, como en la imagen parece haber un borde de todo el form)
  outerBorder: {
    borderWidth: 2,
    borderColor: BORDER_COLOR,
    flex: 1,
  },
  headerRow: { 
    flexDirection: "row", 
    borderBottomWidth: 1, 
    borderBottomColor: BORDER_COLOR,
    alignItems: "center"
  },
  logoBox: {
    width: "40%",
    padding: 10,
    borderRightWidth: 1,
    borderRightColor: BORDER_COLOR,
    alignItems: "center"
  },
  brandLogo: { width: 140, objectFit: "contain" },
  titleBox: {
    width: "60%",
    padding: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  docTitle: {
    fontSize: 16,
    fontFamily: "Manrope", fontWeight: 700,
    color: ESPRESSO,
    textTransform: "uppercase"
  },
  // General table structure
  row: { 
    flexDirection: "row", 
    borderBottomWidth: 1, 
    borderBottomColor: BORDER_COLOR 
  },
  col2: { 
    width: "50%", 
    borderRightWidth: 1, 
    borderRightColor: BORDER_COLOR,
    padding: 4 
  },
  col2Last: { 
    width: "50%", 
    padding: 4 
  },
  colFull: {
    width: "100%",
    padding: 4
  },
  label: { 
    fontFamily: "Manrope", 
    fontSize: 7.5,
    marginBottom: 2
  },
  value: { 
    fontSize: 8,
    fontFamily: "Manrope",
  },
  sectionHeaderBox: {
    backgroundColor: BG_HEADER,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    padding: 4,
    alignItems: "center"
  },
  sectionHeaderText: {
    fontFamily: "Manrope", fontWeight: 700,
    fontSize: 8,
    color: ESPRESSO,
    textTransform: "uppercase"
  },
  
  // Permisos Table
  permisoRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  permisoCol: {
    width: "33.33%",
    borderRightWidth: 1,
    borderRightColor: BORDER_COLOR,
    padding: 4,
  },
  permisoColLast: {
    width: "33.33%",
    padding: 4,
  },
  permisoText: {
    fontSize: 8,
    fontFamily: "Manrope"
  },
  
  // Ejecutores Signatures
  ejecutorHeader: {
    flexDirection: "row",
    backgroundColor: BG_HEADER,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  ejecutorCol1: {
    width: "60%",
    borderRightWidth: 1,
    borderRightColor: BORDER_COLOR,
    padding: 4,
    alignItems: "center"
  },
  ejecutorCol2: {
    width: "40%",
    padding: 4,
    alignItems: "center"
  },
  ejecutorRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
    height: 20
  },
  ejecutorVal1: {
    width: "60%",
    borderRightWidth: 1,
    borderRightColor: BORDER_COLOR,
    padding: 4,
    justifyContent: "center"
  },
  ejecutorVal2: {
    width: "40%",
    padding: 4,
  },
  
  // Equipos Table
  equipoRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  equipoCol1: {
    width: "20%",
    borderRightWidth: 1,
    borderRightColor: BORDER_COLOR,
    padding: 4,
    fontFamily: "Manrope", fontWeight: 700
  },
  equipoCol2: {
    width: "5%",
    borderRightWidth: 1,
    borderRightColor: BORDER_COLOR,
  }, // checkbox simulado
  equipoCol3: {
    width: "75%",
    padding: 4,
  },
  
  // Analisis
  analisisRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  analisisCol1: {
    width: "50%",
    borderRightWidth: 1,
    borderRightColor: BORDER_COLOR,
    padding: 4,
  },
  analisisCol2: {
    width: "50%",
    padding: 4,
  },
  
  // Pasos Table
  pasosHeader: {
    flexDirection: "row",
    backgroundColor: BG_HEADER,
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  pasosH1: { width: "25%", borderRightWidth: 1, borderRightColor: BORDER_COLOR, padding: 4, fontFamily: "Manrope", fontWeight: 700, textAlign: "center" },
  pasosH2: { width: "25%", borderRightWidth: 1, borderRightColor: BORDER_COLOR, padding: 4, fontFamily: "Manrope", fontWeight: 700, textAlign: "center" },
  pasosH3: { width: "20%", borderRightWidth: 1, borderRightColor: BORDER_COLOR, padding: 4, fontFamily: "Manrope", fontWeight: 700, textAlign: "center" },
  pasosH4: { width: "30%", padding: 4, fontFamily: "Manrope", fontWeight: 700, textAlign: "center" },
  
  pasosRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER_COLOR, minHeight: 20 },
  pasosD1: { width: "25%", borderRightWidth: 1, borderRightColor: BORDER_COLOR, padding: 4 },
  pasosD2: { width: "25%", borderRightWidth: 1, borderRightColor: BORDER_COLOR, padding: 4 },
  pasosD3: { width: "20%", borderRightWidth: 1, borderRightColor: BORDER_COLOR, padding: 4 },
  pasosD4: { width: "30%", padding: 4 },

  // Evaluacion
  evalRow: { padding: 4, borderBottomWidth: 1, borderBottomColor: BORDER_COLOR },
  evalQuestion: { fontFamily: "Manrope", fontWeight: 700, fontStyle: "italic", marginBottom: 4 },
  evalOptionRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  evalBoxIcon: { width: 10, height: 10, borderWidth: 1, borderColor: BORDER_COLOR, marginRight: 4, justifyContent: "center", alignItems: "center" },
  evalBoxChecked: { fontSize: 8 },
  evalLabelText: { fontSize: 8 },
  
  emisorSignatureRow: { flexDirection: "row", minHeight: 60, alignItems: "center", justifyContent: "center" },
  emisorImg: { height: 40, width: 100, objectFit: "contain" }
});

function AtsFormatoDocument({ data }: { data: AtsFormatoPDFData }) {
  // Helpers para checkear si un permiso está
  const isPermiso = (id: string) => data.permisos.includes(id) ? "X" : " ";
  
  // Garantizar siempre mínimo 5 filas vacías para firmas
  const maxEjecutores = Math.max(5, data.ejecutores.length);
  const ejecutoresFilas = Array.from({ length: maxEjecutores }).map((_, i) => data.ejecutores[i]);

  // Garantizar mínimo 10 filas de pasos
  const maxPasos = Math.max(10, data.pasos.length);
  const pasosFilas = Array.from({ length: maxPasos }).map((_, i) => data.pasos[i]);

  return (
    <Document title={`ATS ${data.empresa} ${data.fecha}`}>
      <Page size="A4" style={s.page}>
        <View style={s.outerBorder}>
          
          {/* Header */}
          <View style={s.headerRow}>
            <View style={s.logoBox}>
              <Image src={getLogoSrc()} style={s.brandLogo} />
            </View>
            <View style={s.titleBox}>
              <Text style={s.docTitle}>ATS <Text style={{fontSize: 12}}>ANALISIS DE TRABAJO SEGURO</Text></Text>
            </View>
          </View>

          {/* Datos Basicos */}
          <View style={s.row}>
            <View style={s.col2}><Text style={s.label}>Empresa:</Text><Text style={s.value}>{data.empresa}</Text></View>
            <View style={s.col2Last}><Text style={s.label}>Ciudad:</Text><Text style={s.value}>{data.ciudad}</Text></View>
          </View>
          <View style={s.row}>
            <View style={s.col2}><Text style={s.label}>Área/Proceso:</Text><Text style={s.value}>{data.areaProceso}</Text></View>
            <View style={s.col2Last}><Text style={s.label}>Ubicación donde se realiza el trabajo:</Text><Text style={s.value}>{data.ubicacion}</Text></View>
          </View>
          <View style={s.row}>
            <View style={s.col2}><Text style={s.label}>Fecha de realización del Trabajo (dd/mm/aaaa):</Text><Text style={s.value}>{data.fecha}</Text></View>
            <View style={s.col2Last}><Text style={s.label}>Lugar de Trabajo:</Text><Text style={s.value}>{data.lugarTrabajo}</Text></View>
          </View>
          <View style={s.row}>
            <View style={s.col2}><Text style={s.label}>Hora de Inicio (a.m./p.m.):</Text><Text style={s.value}>{data.horaInicio}</Text></View>
            <View style={s.col2Last}><Text style={s.label}>Hora de Finalización (a.m./p.m.):</Text><Text style={s.value}>{data.horaFin}</Text></View>
          </View>
          <View style={[s.row, { minHeight: 40 }]}>
            <View style={s.colFull}>
              <Text style={s.label}>Descripción de la tarea a realizar:</Text>
              <Text style={s.value}>{data.descripcionTarea}</Text>
            </View>
          </View>

          {/* Permisos */}
          <View style={s.sectionHeaderBox}>
            <Text style={s.sectionHeaderText}>PARA ESTE TRABAJO SE REQUIERE PERMISO DE:</Text>
          </View>
          
          <View style={s.permisoRow}>
            <View style={s.permisoCol}><Text style={s.permisoText}>TRABAJO EN ALTURA  {isPermiso('altura')}</Text></View>
            <View style={s.permisoCol}><Text style={s.permisoText}>ESPACIO CONFINADO  {isPermiso('confinado')}</Text></View>
            <View style={s.permisoColLast}><Text style={s.permisoText}>CALIENTE  {isPermiso('caliente')}</Text></View>
          </View>
          <View style={s.permisoRow}>
            <View style={s.col2}><Text style={s.permisoText}>ENERGIA PELIGROSAS  {isPermiso('energia')}</Text></View>
            <View style={s.col2Last}><Text style={s.permisoText}>OTRO, CUAL?  {data.permisoOtroCual}</Text></View>
          </View>

          {/* Ejecutores Tabla 1 */}
          <View style={s.ejecutorHeader}>
            <View style={s.ejecutorCol1}><Text style={s.value}>Cedula, Nombres y Apellidos de los trabajadores (Ejecutor)</Text></View>
            <View style={s.ejecutorCol2}><Text style={s.value}>Firma</Text></View>
          </View>
          {ejecutoresFilas.map((e, idx) => (
            <View key={`ej1-${idx}`} style={s.ejecutorRow}>
              <View style={s.ejecutorVal1}>
                <Text style={s.value}>{e ? `${e.cedula || ""} - ${e.nombre || ""}` : ""}</Text>
              </View>
              <View style={s.ejecutorVal2}></View>
            </View>
          ))}

          {/* Equipos */}
          <View style={s.sectionHeaderBox}>
            <Text style={s.sectionHeaderText}>EQUIPOS Y HERRAMIENTAS A UTILIZAR</Text>
          </View>
          <View style={s.ejecutorHeader}>
            <View style={[s.equipoCol1, { alignItems: "center", borderRightWidth: 0 }]}><Text style={s.value}>EQUIPOS Y</Text><Text style={s.value}>HERRAMIENTAS</Text></View>
            <View style={[s.equipoCol3, { width: "80%", alignItems: "center", justifyContent: "center" }]}><Text style={[s.value, {fontStyle: "italic", fontFamily: "Manrope", fontWeight: 700}]}>Indique cada una de las herramientas a utilizar.</Text></View>
          </View>
          
          {CATEGORIAS_HERRAMIENTAS.map((c, i, arr) => (
            <View key={`cat-${c.id}`} style={[s.equipoRow, i === arr.length - 1 ? { borderBottomWidth: 0 } : {}]}>
              <View style={s.equipoCol1}><Text style={s.value}>{c.label}</Text></View>
              <View style={s.equipoCol2}>
                <Text style={{textAlign: 'center', marginTop: 2}}>{data.herramientas[c.id] ? "X" : ""}</Text>
              </View>
              <View style={s.equipoCol3}><Text style={s.value}>{data.herramientas[c.id] || ""}</Text></View>
            </View>
          ))}
          
        </View>
      </Page>

      <Page size="A4" style={s.page}>
        <View style={s.outerBorder}>
          {/* Analisis Tarea */}
          <View style={s.sectionHeaderBox}>
            <Text style={s.sectionHeaderText}>ANALISIS DE LA TAREA</Text>
          </View>
          {PREGUNTAS_ANALISIS.map((q) => (
            <View key={`q-${q.id}`} style={s.analisisRow}>
              <View style={s.analisisCol1}><Text style={s.value}>{q.texto}</Text></View>
              <View style={s.analisisCol2}><Text style={s.value}>{data.analisis[q.id] || ""}</Text></View>
            </View>
          ))}

          {/* Pasos */}
          <View style={s.pasosHeader}>
            <View style={s.pasosH1}><Text style={s.value}>Pasos detallados de la tarea</Text></View>
            <View style={s.pasosH2}><Text style={s.value}>Peligros existentes y potenciales</Text></View>
            <View style={s.pasosH3}><Text style={s.value}>Consecuencias</Text></View>
            <View style={s.pasosH4}><Text style={s.value}>Controles Requeridos</Text></View>
          </View>
          
          {pasosFilas.map((p, idx) => (
            <View key={`p-${idx}`} style={s.pasosRow}>
              <View style={s.pasosD1}><Text style={s.value}>{p ? p.paso : ""}</Text></View>
              <View style={s.pasosD2}><Text style={s.value}>{p ? p.peligros : ""}</Text></View>
              <View style={s.pasosD3}><Text style={s.value}>{p ? p.consecuencias : ""}</Text></View>
              <View style={s.pasosD4}><Text style={s.value}>{p ? p.controles : ""}</Text></View>
            </View>
          ))}

          {/* Evaluacion Riesgo */}
          <View style={s.sectionHeaderBox}>
            <Text style={s.sectionHeaderText}>EVALUACION DEL RIESGO</Text>
          </View>
          
          <View style={s.evalRow}>
            <Text style={s.evalQuestion}>{EVALUACION_RIESGO.probabilidad.pregunta}</Text>
            <View style={s.evalOptionRow}>
              <View style={s.evalBoxIcon}><Text style={s.evalBoxChecked}>{data.probabilidadIncidente === "si" ? "X" : " "}</Text></View>
              <Text style={s.evalLabelText}>{EVALUACION_RIESGO.probabilidad.si}</Text>
            </View>
            <View style={s.evalOptionRow}>
              <View style={s.evalBoxIcon}><Text style={s.evalBoxChecked}>{data.probabilidadIncidente === "no" ? "X" : " "}</Text></View>
              <Text style={s.evalLabelText}>{EVALUACION_RIESGO.probabilidad.no}</Text>
            </View>
          </View>
          
          <View style={s.evalRow}>
            <Text style={s.evalQuestion}>{EVALUACION_RIESGO.seguridad.pregunta}</Text>
            <View style={s.evalOptionRow}>
              <View style={s.evalBoxIcon}><Text style={s.evalBoxChecked}>{data.seguroProceder === "si" ? "X" : " "}</Text></View>
              <Text style={s.evalLabelText}>{EVALUACION_RIESGO.seguridad.si}</Text>
            </View>
            <View style={s.evalOptionRow}>
              <View style={s.evalBoxIcon}><Text style={s.evalBoxChecked}>{data.seguroProceder === "no" ? "X" : " "}</Text></View>
              <Text style={s.evalLabelText}>{EVALUACION_RIESGO.seguridad.no}</Text>
            </View>
          </View>

          {/* Ejecutores Tabla 2 */}
          <View style={s.ejecutorHeader}>
            <View style={s.ejecutorCol1}><Text style={[s.value, {fontFamily: "Manrope", fontWeight: 700}]}>Nombre y Cedula de los trabajadores (Ejecutor)</Text></View>
            <View style={s.ejecutorCol2}><Text style={[s.value, {fontFamily: "Manrope", fontWeight: 700}]}>Firma</Text></View>
          </View>
          {ejecutoresFilas.map((e, idx) => (
            <View key={`ej2-${idx}`} style={s.ejecutorRow}>
              <View style={s.ejecutorVal1}>
                <Text style={s.value}>{e ? `${e.nombre || ""} - ${e.cedula || ""}` : ""}</Text>
              </View>
              <View style={s.ejecutorVal2}></View>
            </View>
          ))}

          {/* Emisor */}
          <View style={s.ejecutorHeader}>
            <View style={s.ejecutorCol1}><Text style={[s.value, {fontFamily: "Manrope", fontWeight: 700}]}>Nombre y Cedula de la persona (Emisor)</Text></View>
            <View style={s.ejecutorCol2}><Text style={[s.value, {fontFamily: "Manrope", fontWeight: 700}]}>Firma</Text></View>
          </View>
          <View style={[s.ejecutorRow, s.emisorSignatureRow, { borderBottomWidth: 0 }]}>
            <View style={s.ejecutorVal1}>
              <Text style={s.value}>{data.emisorNombre} - {data.emisorCedula}</Text>
            </View>
            <View style={[s.ejecutorVal2, { justifyContent: "center", alignItems: "center" }]}>
              {data.firmaDataUrl ? (
                <Image src={data.firmaDataUrl} style={s.emisorImg} />
              ) : null}
            </View>
          </View>

        </View>
      </Page>
    </Document>
  );
}

export async function buildAtsFormatoPDFBlob(data: AtsFormatoPDFData): Promise<Blob> {
  return pdf(<AtsFormatoDocument data={data} />).toBlob();
}
