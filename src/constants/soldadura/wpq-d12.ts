// =============================================================================
// WPQ — AWS D1.2/D1.2M:2014, Anexo E, formato E(c).
// =============================================================================
// "Manufacturer's Record Qualification Tests of Welder or Welding Operator or
// Tack Welder". Una sola página: identificación del soldador, variables con que
// soldó, inspección visual, doblez guiado, ensayo de filete y certificación.
// El bloque "For Information Only" es exactamente eso en el papel —equipo con
// que se soldó— y no califica nada; se conserva porque el formato lo imprime.
// =============================================================================

import type { EspecDocumento } from "./tipos";

export const WPQ_D12: EspecDocumento = {
  tipo: "wpq",
  variante: "aws_d1_2",
  formulario: "Form E(c)",
  norma: "AWS D1.2/D1.2M:2014",
  titulo: "Manufacturer's Record Qualification Tests of Welder or Welding Operator or Tack Welder",
  referencia: "Annex E, AWS D1.2/D1.2M, Structural Welding Code — Aluminum",
  claves: {
    numero: "stamp_no",
    titulo: "name",
    proceso: "welding_process",
    wpsRef: "wps_no",
    pqrRef: "pqr_no",
    fecha: "cert_fecha",
  },
  secciones: [
    {
      id: "identificacion",
      titulo: "Welder",
      campos: [
        { t: "texto", id: "name", label: "Name" },
        { t: "texto", id: "clock_no", label: "Clock No." },
        { t: "texto", id: "stamp_no", label: "Stamp No." },
        { t: "texto", id: "retest", label: "Retest" },
        { t: "foto", id: "foto_soldador", label: "Fotografía del soldador", nota: "Identificación de quien se califica" },
        { t: "texto", id: "welding_process", label: "Welding Process" },
        { t: "texto", id: "tipo", label: "Type" },
        {
          t: "texto",
          id: "wps_no",
          label: "In accordance with welding procedure specification WPS No.",
        },
        { t: "texto", id: "pqr_no", label: "and PQR No." },
      ],
    },
    {
      id: "materiales",
      titulo: "Test material",
      campos: [
        { t: "texto", id: "material_group", label: "Material Group" },
        { t: "texto", id: "material_to_group", label: "To Group" },
        { t: "texto", id: "alloy", label: "Alloy" },
        { t: "texto", id: "alloy_to", label: "To" },
        { t: "texto", id: "thickness", label: "Thickness of Test Material", full: true },
        { t: "texto", id: "fm_f_no", label: "Filler Metal F No." },
        { t: "texto", id: "fm_aws_class", label: "AWS Class" },
        { t: "texto", id: "fm_diameter", label: "Diameter" },
        { t: "texto", id: "otros", label: "Other", full: true },
        { t: "texto", id: "position", label: "Position" },
        { t: "texto", id: "backing_material", label: "Backing Material" },
        { t: "texto", id: "elec_current", label: "Electrical Characteristics: Current" },
        { t: "texto", id: "elec_polarity", label: "Polarity" },
        { t: "texto", id: "shielding_gas", label: "Shielding Gas" },
        { t: "texto", id: "flow", label: "Flow" },
      ],
    },
    {
      id: "informacion",
      titulo: "For Information Only",
      campos: [
        { t: "texto", id: "power_source", label: "Power Source", nota: "Make, model, type", full: true },
        { t: "texto", id: "wire_feeder", label: "Wire Feeder", full: true },
        { t: "texto", id: "welding_torch", label: "Welding Torch", full: true },
      ],
    },
    {
      id: "visual",
      titulo: "Visual Inspection",
      ref: "3.6",
      campos: [
        { t: "texto", id: "appearance", label: "Appearance" },
        { t: "texto", id: "undercut", label: "Undercut" },
        { t: "texto", id: "piping_porosity", label: "Piping Porosity" },
      ],
    },
    {
      id: "bend_test",
      titulo: "Guided Bend Test Results",
      campos: [
        {
          t: "tabla",
          id: "bend_test",
          columnas: [
            { id: "type", label: "Type of Bend", peso: 2 },
            { id: "thickness", label: "Specimen Thick., in" },
            { id: "jig", label: "Bend Jig Fig. No." },
            { id: "diameter", label: "Bend Diam., in" },
            { id: "result", label: "Result", peso: 2 },
          ],
          filas: 8,
        },
        {
          t: "texto",
          id: "radiographic",
          label:
            "Radiographic results: Alternative qualification of groove welds by radiography in accordance with 3.21.6.3",
          full: true,
        },
        { t: "texto", id: "bend_conducted_by", label: "Test conducted by" },
        { t: "texto", id: "bend_per", label: "per" },
        { t: "texto", id: "bend_laboratory", label: "Laboratory: Test No." },
      ],
    },
    {
      id: "fillet_test",
      titulo: "Fillet Weld Test Results",
      campos: [
        {
          t: "area",
          id: "fillet_fracture",
          label: "Fracture test",
          nota: "Describe the location, nature, and size of any crack or tearing of specimen",
          full: true,
        },
        { t: "texto", id: "fillet_defects_length", label: "Length and percent of defects" },
        { t: "texto", id: "fillet_defects_inches", label: "Inches / %" },
        { t: "texto", id: "fillet_size_x", label: "Appearance: Fillet Size (in)" },
        { t: "texto", id: "fillet_size_y", label: "in X (in)" },
        { t: "texto", id: "fillet_convexity", label: "Convexity or Concavity (in)" },
        { t: "texto", id: "fillet_conducted_by", label: "Test conducted by" },
        { t: "texto", id: "fillet_per", label: "per" },
        { t: "texto", id: "fillet_laboratory", label: "Laboratory: Test No." },
      ],
    },
    {
      id: "certificacion",
      titulo: "Certification",
      campos: [
        { t: "texto", id: "cert_signed", label: "Signed", nota: "Organization" },
        { t: "texto", id: "cert_by", label: "By" },
        { t: "texto", id: "cert_title", label: "Title" },
        { t: "fecha", id: "cert_fecha", label: "Date" },
      ],
    },
    {
      id: "registro_fotografico",
      titulo: "Registro fotográfico",
      nota: "Evidencia de los ensayos: probetas, macroataques, cordones y cupones. El formato en papel remite a este registro; aquí las fotos viajan con el documento.",
      campos: [
        { t: "galeria", id: "fotos", label: "Fotografías del ensayo" },
      ],
    },
  ],
  firmas: [{ id: "firma_organization", label: "Signed (Organization)" }],
  certificacion:
    "We certify that the statements in this record are correct and that the test welds were prepared, welded, and tested in accordance with the requirements of AWS D1.2/D1.2M, Structural Welding Code—Aluminum.",
};
