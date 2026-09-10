// =============================================================================
// WPQ — ASME BPVC Sección IX, formato QW-484A.
// =============================================================================
// Califica al SOLDADOR, no al procedimiento: por eso el cuerpo del formato es
// una sola tabla de variables con dos columnas —el valor real con que se soldó
// el cupón y el rango que ese valor califica— y el resto son resultados de
// ensayo. Los rótulos de las variables vienen impresos: se diligencian las
// columnas, no la primera celda.
// =============================================================================

import type { EspecDocumento } from "./tipos";

export const WPQ_ASME: EspecDocumento = {
  tipo: "wpq",
  variante: "asme_ix",
  formulario: "QW-484A",
  norma: "ASME BPVC.IX-2023",
  titulo: "Suggested Format A for Welder Performance Qualifications (WPQ)",
  referencia: "See QW-301, Section IX, ASME Boiler and Pressure Vessel Code",
  claves: {
    numero: "identification_no",
    titulo: "welder_name",
    wpsRef: "wps_followed",
    fecha: "date_welded",
  },
  secciones: [
    {
      id: "identificacion",
      titulo: "Welder / Test Description",
      campos: [
        { t: "texto", id: "welder_name", label: "Welder's name" },
        { t: "texto", id: "identification_no", label: "Identification no." },
        { t: "texto", id: "wps_followed", label: "Identification of WPS followed" },
        { t: "fecha", id: "date_welded", label: "Date welded" },
        { t: "texto", id: "base_metal_spec", label: "Specification and type/grade or UNS Number of base metal(s)" },
        { t: "texto", id: "base_metal_thickness", label: "Thickness" },
        {
          t: "checks",
          id: "test_tipo",
          label: "Test type",
          opciones: [
            { id: "test_coupon", label: "Test coupon" },
            { id: "production_weld", label: "Production weld" },
          ],
        },
        { t: "foto", id: "foto_soldador", label: "Fotografía del soldador", nota: "Identificación de quien se califica" },
      ],
    },
    {
      id: "variables",
      titulo: "Testing Variables and Qualification Limits",
      ref: "QW-350",
      campos: [
        {
          t: "tabla",
          id: "variables",
          columnas: [
            { id: "variable", label: "Welding Variables (QW-350)", peso: 3 },
            { id: "actual", label: "Actual Values", peso: 2 },
            { id: "range", label: "Range Qualified", peso: 2 },
          ],
          filas: 0,
          filasFijas: [
            "Welding process(es)",
            "Type (i.e., manual, semi-automatic) used",
            "Backing (with/without)",
            "Plate / Pipe (enter diameter if pipe or tube)",
            "Base metal P-Number to P-Number",
            "Filler metal or electrode specification(s) (SFA) (info. only)",
            "Filler metal or electrode classification(s) (info. only)",
            "Filler metal F-Number(s)",
            "Consumable insert (GTAW, PAW, LBW)",
            "Filler Metal Product Form (QW-404.23) (GTAW or PAW)",
            "Deposit thickness for each process — Process 1",
            "Deposit thickness for each process — Process 2",
            "Position(s)",
            "Vertical progression (uphill or downhill)",
            "Type of fuel gas (OFW)",
            "Use of backing gas (GTAW, PAW, GMAW, LBW)",
            "Transfer mode (spray, globular, or pulse to short circuit-GMAW)",
            "GTAW current type and polarity (AC, DCEP, DCEN)",
            "For LBW or LBBW — Type of equipment",
            "For LBW or LBBW — Technique (keyhole LBW or melt-in)",
            "For LBW or LBBW — Torch-controlled oscillation",
            "For LBW or LBBW — Mode of operation (pulsed or continuous)",
          ],
        },
        { t: "sino", id: "proceso1_3_capas", label: "Process 1 — 3 layers minimum" },
        { t: "sino", id: "proceso2_3_capas", label: "Process 2 — 3 layers minimum" },
      ],
    },
    {
      id: "resultados",
      titulo: "Results",
      campos: [
        {
          t: "texto",
          id: "visual_examination",
          label: "Visual examination of completed weld (QW-302.4)",
          full: true,
        },
        {
          t: "checks",
          id: "tipo_ensayo",
          label: "Tests performed",
          opciones: [
            { id: "transverse", label: "Transverse face and root bends [QW-462.3(a)]" },
            { id: "longitudinal", label: "Longitudinal bends [QW-462.3(b)]" },
            { id: "side", label: "Side bends [QW-462.2]" },
            {
              id: "pipe_overlay",
              label: "Pipe bend specimen, corrosion-resistant weld metal overlay [QW-462.5(c)]",
            },
            {
              id: "plate_overlay",
              label: "Plate bend specimen, corrosion-resistant weld metal overlay [QW-462.5(d)]",
            },
            { id: "pipe_macro", label: "Pipe specimen, macro test for fusion [QW-462.5(b)]" },
            { id: "plate_macro", label: "Plate specimen, macro test for fusion [QW-462.5(e)]" },
          ],
        },
        {
          t: "tabla",
          id: "resultados_ensayo",
          columnas: [
            { id: "type", label: "Type", peso: 2 },
            { id: "result", label: "Result", peso: 2 },
          ],
          filas: 6,
        },
        {
          t: "texto",
          id: "volumetric_results",
          label: "Alternative Volumetric Examination Results (QW-191)",
          full: true,
        },
        {
          t: "checks",
          id: "volumetric_metodo",
          label: "Volumetric method (check one)",
          opciones: [
            { id: "rt", label: "RT" },
            { id: "ut", label: "UT" },
          ],
        },
        { t: "texto", id: "fillet_fracture", label: "Fillet weld — fracture test (QW-181.2)" },
        { t: "texto", id: "fillet_defects", label: "Length and percent of defects" },
        {
          t: "checks",
          id: "fillet_tipo",
          label: "Fillet weld type",
          opciones: [
            { id: "plate", label: "Fillet welds in plate [QW-462.4(b)]" },
            { id: "pipe", label: "Fillet welds in pipe [QW-462.4(c)]" },
          ],
        },
        { t: "texto", id: "macro_examination", label: "Macro examination (QW-184)" },
        { t: "texto", id: "fillet_size", label: "Fillet size (in.)" },
        { t: "texto", id: "concavity", label: "Concavity or convexity (in.)" },
        { t: "texto", id: "other_tests", label: "Other tests", full: true },
      ],
    },
    {
      id: "certificacion",
      titulo: "Certification",
      campos: [
        { t: "texto", id: "film_evaluated_by", label: "Film or specimens evaluated by" },
        { t: "texto", id: "film_company", label: "Company" },
        { t: "texto", id: "mechanical_tests_by", label: "Mechanical tests conducted by" },
        { t: "texto", id: "laboratory_test_no", label: "Laboratory test no." },
        { t: "texto", id: "welding_supervised_by", label: "Welding supervised by" },
        { t: "texto", id: "cert_organization", label: "Organization" },
        { t: "fecha", id: "cert_fecha", label: "Date" },
        { t: "texto", id: "cert_certified_by", label: "Certified by" },
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
  firmas: [{ id: "firma_certified_by", label: "Certified by" }],
  certificacion:
    "We certify that the statements in this record are correct and that the test coupons were prepared, welded, and tested in accordance with the requirements of Section IX of the ASME BOILER AND PRESSURE VESSEL CODE.",
};
