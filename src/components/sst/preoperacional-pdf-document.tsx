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
  HERRAMIENTAS_PREOP,
  ESCALAS,
  CERTIFICACION_OPERADOR,
  etiquetaCorta,
  esEquipoCritico,
  elementosFaltantes,
  elementosVencidos,
  nombreEquipo,
  itemsPorGrupo,
  valorCritico,
  type EquipoPreop,
  type EstadoHerramientaPreop,
  type HerramientaPreop,
  type ItemChequeo,
} from "@/constants/preoperacional";
import { getLogoSrc } from "@/lib/pdf-logo";
import { ACTIUM_PDF, registerActiumFonts } from "@/lib/pdf-fonts";

registerActiumFonts();

// ─── Tipo de datos del permiso (serializable) ────────────────────────────────

export type PreoperacionalPDFData = {
  // 1. Datos generales
  empresa: string;
  frenteTrabajo: string;
  area: string;
  ubicacion: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
  trabajoEjecutado: string;
  // 2..n. Herramientas inspeccionadas (id del catálogo → estado)
  herramientas: Record<string, EstadoHerramientaPreop>;
  observacionesGenerales: string;
  // Firmas
  inspectorNombre: string;
  inspectorCedula: string;
  inspectorFirma: string;
  supervisorNombre: string;
  supervisorCedula: string;
  supervisorFirma: string;
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
  // equipo
  equipoHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: SEASHELL, borderWidth: 1, borderColor: BEIGE_BORDER, borderRadius: 4, paddingVertical: 5, paddingHorizontal: 7, marginTop: 8, marginBottom: 5 },
  equipoNombre: { fontSize: 8.5, fontFamily: "Manrope", fontWeight: 700, color: ESPRESSO },
  sello: { fontSize: 7, fontFamily: "Manrope", fontWeight: 700, color: "#FFFFFF", backgroundColor: RED, borderRadius: 3, paddingVertical: 2, paddingHorizontal: 5, textTransform: "uppercase", letterSpacing: 0.5 },
  selloOk: { backgroundColor: GREEN },
  noAplica: { fontSize: 8, color: GRAY, fontStyle: "italic", paddingVertical: 6 },
  // tablas
  table: { borderWidth: 1, borderColor: BEIGE_BORDER, borderRadius: 4, overflow: "hidden" },
  trHead: { flexDirection: "row", backgroundColor: ESPRESSO },
  thText: { color: "#FFFFFF", fontSize: 7, fontFamily: "Manrope", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, paddingVertical: 5, paddingHorizontal: 5 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BEIGE_BORDER },
  trAlt: { backgroundColor: ACTIUM_PDF.beigeRow },
  td: { fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 5, color: "#3A3A3A" },
  resp: { fontSize: 7.5, paddingVertical: 4, paddingHorizontal: 5, textAlign: "center", fontFamily: "Manrope", fontWeight: 700 },
  leyenda: { fontSize: 6.5, color: GRAY, marginBottom: 5, fontStyle: "italic" },
  nota: { fontSize: 6.5, color: GRAY, lineHeight: 1.35, marginTop: 5, textAlign: "justify" },
  // firmas — misma tabla que el resto de los permisos SST
  legalText: { fontSize: 7.5, color: "#3A3A3A", fontStyle: "italic", lineHeight: 1.4, marginBottom: 10, textAlign: "justify" },
  sigTable: { borderWidth: 1, borderColor: BEIGE_BORDER, borderRadius: 4, overflow: "hidden", marginBottom: 10 },
  sigThText: { color: ESPRESSO, fontSize: 7, fontFamily: "Manrope", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, paddingVertical: 5, textAlign: "center" },
  sigTr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BEIGE_BORDER, minHeight: 40 },
  sigTdName: { fontSize: 7.5, padding: 5, color: "#3A3A3A", justifyContent: "center" },
  sigTdSign: { padding: 2, justifyContent: "flex-end", alignItems: "center" },
  sigImg: { width: 80, height: 35, objectFit: "contain" },
  disclaimer: { fontSize: 6.5, color: GRAY, fontStyle: "italic", marginTop: 8, lineHeight: 1.3 },
  footer: { position: "absolute", bottom: 22, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#E5E0DA", paddingTop: 6 },
  footerText: { fontSize: 7, color: GRAY },
});

/** Verde para lo conforme, naranja para lo aceptable, rojo para lo crítico. */
function colorRespuesta(herramienta: HerramientaPreop, item: ItemChequeo, valor: string): string {
  if (!valor) return GRAY;
  if (valor === valorCritico(herramienta.escala, item)) return RED;
  if (valor === "na") return GRAY;
  if (valor === "ea") return ORANGE;
  return GREEN;
}

function Campo({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <View style={full ? s.fieldFull : s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <Text style={s.fieldValue}>{value || "—"}</Text>
    </View>
  );
}

// ─── Bloque de un equipo ─────────────────────────────────────────────────────

function EquipoChequeo({
  herramienta,
  equipo,
  indice,
  hoy,
}: {
  herramienta: HerramientaPreop;
  equipo: EquipoPreop;
  indice: number;
  hoy: string;
}) {
  const critico = esEquipoCritico(herramienta, equipo, hoy);

  return (
    <View>
      <View style={s.equipoHead} wrap={false}>
        <Text style={s.equipoNombre}>{nombreEquipo(herramienta, equipo, indice)}</Text>
        <Text style={[s.sello, critico ? {} : s.selloOk]}>
          {critico ? herramienta.etiquetaCritica : "Apto para operar"}
        </Text>
      </View>

      <View style={s.table}>
        <View style={s.trHead}>
          <Text style={[s.thText, { width: "78%" }]}>Aspecto a verificar</Text>
          <Text style={[s.thText, { width: "22%", textAlign: "center" }]}>Estado</Text>
        </View>
        {itemsPorGrupo(herramienta).map((grupo, gi) => (
          <View key={grupo.grupo ?? gi} wrap={false}>
            {grupo.grupo && (
              <View style={s.tr}>
                <Text style={[s.td, { width: "100%", fontFamily: "Manrope", fontWeight: 700, color: ESPRESSO, backgroundColor: SEASHELL, textTransform: "uppercase", fontSize: 7 }]}>
                  {grupo.grupo}
                </Text>
              </View>
            )}
            {grupo.items.map(({ item, codigo }, i) => {
              const valor = equipo.respuestas[item.id] ?? "";
              return (
                <View key={item.id} style={[s.tr, i % 2 === 1 ? s.trAlt : {}]}>
                  <Text style={[s.td, { width: "78%" }]}>
                    {codigo ? `${codigo} ${item.texto}` : item.texto}
                  </Text>
                  <Text style={[s.resp, { width: "22%", color: colorRespuesta(herramienta, item, valor) }]}>
                    {valor ? etiquetaCorta(herramienta.escala, valor) : "—"}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>

      {herramienta.epp && (
        <View style={{ marginTop: 6 }}>
          <Text style={s.fieldLabel}>EPP a utilizar</Text>
          <View style={s.chipsRow}>
            {herramienta.epp.map((ep) => {
              const on = equipo.epp.includes(ep.id);
              return (
                <Text key={ep.id} style={[s.chip, on ? s.chipOn : {}]}>
                  {on ? "[x] " : "[ ] "}
                  {ep.label}
                </Text>
              );
            })}
          </View>
        </View>
      )}

      {equipo.observaciones ? (
        <View style={{ marginTop: 5 }}>
          <Text style={s.fieldLabel}>Observaciones</Text>
          <View style={s.obsBox}>
            <Text>{equipo.observaciones}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function EquipoInventario({
  herramienta,
  equipo,
  indice,
  hoy,
}: {
  herramienta: HerramientaPreop;
  equipo: EquipoPreop;
  indice: number;
  hoy: string;
}) {
  const faltantes = elementosFaltantes(herramienta, equipo).map((el) => el.id);
  const vencidos = elementosVencidos(herramienta, equipo, hoy).map((el) => el.id);
  const critico = faltantes.length > 0 || vencidos.length > 0;

  return (
    <View>
      <View style={s.equipoHead} wrap={false}>
        <Text style={s.equipoNombre}>{nombreEquipo(herramienta, equipo, indice)}</Text>
        <Text style={[s.sello, critico ? {} : s.selloOk]}>
          {critico ? herramienta.etiquetaCritica : "Dotación completa"}
        </Text>
      </View>

      <View style={s.table}>
        <View style={s.trHead}>
          <Text style={[s.thText, { width: "46%" }]}>Elemento</Text>
          <Text style={[s.thText, { width: "16%" }]}>Presentación</Text>
          <Text style={[s.thText, { width: "11%", textAlign: "center" }]}>Requerida</Text>
          <Text style={[s.thText, { width: "11%", textAlign: "center" }]}>Encontrada</Text>
          <Text style={[s.thText, { width: "16%", textAlign: "center" }]}>Vence</Text>
        </View>
        {(herramienta.inventario ?? []).map((el, i) => {
          const registro = equipo.inventario[el.id];
          const falta = faltantes.includes(el.id);
          const vencido = vencidos.includes(el.id);
          return (
            <View key={el.id} style={[s.tr, i % 2 === 1 ? s.trAlt : {}]} wrap={false}>
              <Text style={[s.td, { width: "46%" }]}>{el.nombre}</Text>
              <Text style={[s.td, { width: "16%" }]}>{el.presentacion}</Text>
              <Text style={[s.resp, { width: "11%", color: "#3A3A3A" }]}>{el.requerida}</Text>
              <Text style={[s.resp, { width: "11%", color: falta ? RED : GREEN }]}>
                {registro?.cantidad === "" || registro?.cantidad === undefined
                  ? "—"
                  : registro.cantidad}
              </Text>
              <Text style={[s.resp, { width: "16%", color: vencido ? RED : "#3A3A3A" }]}>
                {registro?.vence || "—"}
              </Text>
            </View>
          );
        })}
      </View>

      {critico ? (
        <Text style={[s.nota, { color: RED }]}>
          {faltantes.length > 0
            ? `Faltantes: ${faltantes.length} ${faltantes.length === 1 ? "elemento" : "elementos"}. `
            : ""}
          {vencidos.length > 0
            ? `Vencidos o por vencer: ${vencidos.length} ${vencidos.length === 1 ? "elemento" : "elementos"}. `
            : ""}
          Reponer antes de continuar la labor.
        </Text>
      ) : null}

      {equipo.observaciones ? (
        <View style={{ marginTop: 5 }}>
          <Text style={s.fieldLabel}>Observaciones</Text>
          <View style={s.obsBox}>
            <Text>{equipo.observaciones}</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ─── Documento ───────────────────────────────────────────────────────────────

function PreoperacionalDocument({ data }: { data: PreoperacionalPDFData }) {
  const hoy = data.fecha || new Date().toISOString().split("T")[0];

  return (
    <Document title={`Instrucciones Preoperacionales ${data.empresa} ${data.fecha}`}>
      <Page size="A4" style={s.page}>
        <View style={s.header} fixed>
          <View>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={getLogoSrc()} style={s.brandLogo} />
          </View>
          <View>
            <Text style={s.docTitle}>Instrucciones Preoperacionales</Text>
            <Text style={s.docMeta}>Inspección de herramientas y equipos</Text>
            <Text style={s.docMeta}>{data.fecha || "—"}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 6.5, color: GRAY, marginBottom: 14, textAlign: "justify", lineHeight: 1.3 }}>
          La inspección preoperacional se realiza antes de iniciar la labor y sobre cada equipo que
          se va a utilizar. Todo equipo marcado como fuera de servicio debe retirarse de forma
          inmediata del área de trabajo para impedir que se continúe usando, y reportarse al
          supervisor. Las herramientas sin equipos registrados se entienden como no aplicables a
          esta labor.
        </Text>

        {/* 1. Datos generales */}
        <Text style={s.sectionTitle}>1. Datos generales</Text>
        <View style={s.grid}>
          <Campo label="Empresa" value={data.empresa} />
          <Campo label="Frente de trabajo" value={data.frenteTrabajo} />
          <Campo label="Área / Proceso" value={data.area} />
          <Campo label="Ubicación" value={data.ubicacion} />
          <Campo label="Fecha de inspección" value={data.fecha} />
          <Campo label="Hora de inicio" value={data.horaInicio} />
          <Campo label="Hora de finalización" value={data.horaFin} />
          <Campo label="Trabajo ejecutado" value={data.trabajoEjecutado} full />
        </View>

        {/* 2..n. Herramientas */}
        {/* Cada herramienta con equipos abre página; las que no aplican son una
            línea y siguen el flujo, para no dejar páginas casi vacías. */}
        {(() => {
          const conEquipos = HERRAMIENTAS_PREOP.filter((h) => {
            const e = data.herramientas[h.id];
            return !e?.noAplica && (e?.equipos?.length ?? 0) > 0;
          }).map((h) => h.id);

          return HERRAMIENTAS_PREOP.map((herramienta, indice) => {
          const estado = data.herramientas[herramienta.id];
          const equipos = estado?.equipos ?? [];
          const aplica = !estado?.noAplica && equipos.length > 0;

          return (
            <View key={herramienta.id} break={conEquipos.indexOf(herramienta.id) > 0 || undefined}>
              <Text style={s.sectionTitle}>
                {indice + 2}. {herramienta.nombre}
              </Text>

              {!aplica ? (
                <Text style={s.noAplica}>
                  No aplica: no se registraron equipos de esta herramienta para la labor.
                </Text>
              ) : (
                <View>
                  {ESCALAS[herramienta.escala].leyenda ? (
                    <Text style={s.leyenda}>{ESCALAS[herramienta.escala].leyenda}</Text>
                  ) : null}

                  {equipos.map((equipo, i) =>
                    herramienta.modo === "inventario" ? (
                      <EquipoInventario
                        key={i}
                        herramienta={herramienta}
                        equipo={equipo}
                        indice={i}
                        hoy={hoy}
                      />
                    ) : (
                      <EquipoChequeo
                        key={i}
                        herramienta={herramienta}
                        equipo={equipo}
                        indice={i}
                        hoy={hoy}
                      />
                    ),
                  )}

                  {herramienta.referencia ? (
                    <View style={{ marginTop: 8 }} wrap={false}>
                      <Text style={s.fieldLabel}>{herramienta.referencia.titulo}</Text>
                      <View style={s.table}>
                        <View style={s.trHead}>
                          {herramienta.referencia.columnas.map((col, i) => (
                            <Text key={i} style={[s.thText, { width: "25%", textAlign: "center" }]}>
                              {col}
                            </Text>
                          ))}
                        </View>
                        {herramienta.referencia.filas.map((fila, i) => (
                          <View key={i} style={[s.tr, i % 2 === 1 ? s.trAlt : {}]}>
                            {fila.map((celda, j) => (
                              <Text key={j} style={[s.resp, { width: "25%", color: "#3A3A3A" }]}>
                                {celda || "—"}
                              </Text>
                            ))}
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}

                  {(herramienta.notas ?? []).map((nota, i) => (
                    <Text key={i} style={s.nota}>
                      {nota}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          );
          });
        })()}

        {/* Observaciones generales */}
        {data.observacionesGenerales ? (
          <View>
            <Text style={s.sectionTitle}>Observaciones generales</Text>
            <View style={s.obsBox}>
              <Text>{data.observacionesGenerales}</Text>
            </View>
          </View>
        ) : null}

        {/* Firmas */}
        <Text style={s.sectionTitle} break>
          Firmas y compromiso
        </Text>
        <Text style={s.legalText}>{CERTIFICACION_OPERADOR}</Text>

        <View style={s.sigTable}>
          <View style={[s.trHead, { backgroundColor: "#EBE6E0" }]}>
            <Text style={[s.sigThText, { width: "50%", borderRightWidth: 1, borderRightColor: "#D1CFC9" }]}>
              INSPECCIONÓ / OPERADOR
            </Text>
            <Text style={[s.sigThText, { width: "50%" }]}>VERIFICÓ / SUPERVISOR SST</Text>
          </View>

          <View style={[s.sigTr, { borderBottomWidth: 0 }]}>
            <View style={[s.sigTdName, { width: "25%", borderRightWidth: 1, borderRightColor: "#F0EBE5" }]}>
              <Text>{data.inspectorNombre || "—"}</Text>
              <Text style={{ fontSize: 6, color: GRAY, marginTop: 2 }}>C.C. {data.inspectorCedula || "—"}</Text>
            </View>
            <View style={[s.sigTdSign, { width: "25%", borderRightWidth: 1, borderRightColor: "#F0EBE5" }]}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              {data.inspectorFirma ? <Image src={data.inspectorFirma} style={s.sigImg} /> : <Text style={{ fontSize: 6, color: GRAY }}>Firma:</Text>}
            </View>
            <View style={[s.sigTdName, { width: "25%", borderRightWidth: 1, borderRightColor: "#F0EBE5" }]}>
              <Text>{data.supervisorNombre || "—"}</Text>
              <Text style={{ fontSize: 6, color: GRAY, marginTop: 2 }}>C.C. {data.supervisorCedula || "—"}</Text>
            </View>
            <View style={[s.sigTdSign, { width: "25%" }]}>
              {/* eslint-disable-next-line jsx-a11y/alt-text */}
              {data.supervisorFirma ? <Image src={data.supervisorFirma} style={s.sigImg} /> : <Text style={{ fontSize: 6, color: GRAY }}>Firma:</Text>}
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

export async function buildPreoperacionalPDFBlob(data: PreoperacionalPDFData): Promise<Blob> {
  return pdf(<PreoperacionalDocument data={data} />).toBlob();
}
