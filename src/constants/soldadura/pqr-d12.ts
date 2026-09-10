// =============================================================================
// PQR — AWS D1.2/D1.2M:2014, Anexo E, formato E(b) (dos páginas).
// =============================================================================
// Registra los valores reales del cupón y sus ensayos: tracción en junta a tope
// (groove weld test), doblez guiado y ensayo de filete. La segunda página cierra
// con la declaración de conformidad de la Cláusula 4 y la firma del fabricante.
// =============================================================================

import type { EspecDocumento } from "./tipos";

export const PQR_D12: EspecDocumento = {
  tipo: "pqr",
  variante: "aws_d1_2",
  formulario: "Form E(b)",
  norma: "AWS D1.2/D1.2M:2014",
  titulo: "Procedure Qualification Record (PQR)",
  referencia: "Annex E, AWS D1.2/D1.2M, Structural Welding Code — Aluminum",
  claves: {
    numero: "pqr_no",
    proceso: "proceso_1",
    wpsRef: "wps_no",
    fecha: "fecha",
  },
  secciones: [
    {
      id: "identificacion",
      titulo: "Identification",
      campos: [
        { t: "texto", id: "pqr_no", label: "Procedure Qualification Record no." },
        { t: "fecha", id: "fecha", label: "Date" },
        { t: "texto", id: "wps_no", label: "WPS no." },
        { t: "texto", id: "proceso_1", label: "Process 1" },
        { t: "texto", id: "proceso_2", label: "Process 2" },
      ],
    },
    {
      id: "croquis",
      titulo: "Sketches",
      campos: [
        { t: "croquis", id: "design_sketch", label: "Design Sketch" },
        { t: "croquis", id: "sequence_sketch", label: "Welding Sequence Sketch" },
      ],
    },
    {
      id: "base_metals",
      titulo: "Base metals",
      campos: [
        { t: "texto", id: "bm_group_no", label: "Group no." },
        { t: "texto", id: "bm_group_to", label: "To" },
        { t: "texto", id: "bm_alloy_temper", label: "Alloy and Temper" },
        { t: "texto", id: "bm_alloy_to", label: "To" },
        { t: "texto", id: "bm_thickness", label: "Thickness" },
        { t: "texto", id: "bm_thickness_to", label: "To" },
      ],
    },
    {
      id: "filler_metals",
      titulo: "Filler metals",
      campos: [
        { t: "texto", id: "fm_f_number", label: "F-number" },
        { t: "texto", id: "fm_aws_class", label: "AWS class" },
        { t: "texto", id: "fm_diameter", label: "Diameter" },
        { t: "texto", id: "fm_shielding_gas", label: "Shielding gas(es)" },
        { t: "texto", id: "fm_composition", label: "Percent composition" },
        { t: "texto", id: "fm_flow_rate", label: "Flow rate" },
        { t: "texto", id: "fm_tungsten", label: "Tungsten electrode (GTAW)" },
        { t: "texto", id: "fm_size", label: "Size" },
        { t: "texto", id: "fm_type", label: "Type" },
        { t: "texto", id: "fm_backup_type", label: "Backup type" },
        { t: "texto", id: "fm_alloy", label: "Alloy" },
        { t: "texto", id: "fm_backgouging", label: "Backgouging" },
      ],
    },
    {
      id: "pases",
      titulo: "Welding Passes",
      campos: [
        {
          t: "tabla",
          id: "pases",
          columnas: [
            { id: "pass_no", label: "Pass No." },
            { id: "process_no", label: "Process No." },
            { id: "amps", label: "Amps" },
            { id: "volts", label: "Volts" },
            { id: "travel", label: "Travel Speed" },
          ],
          filas: 7,
        },
        { t: "texto", id: "power_source", label: "Type of welding power source", full: true },
        { t: "texto", id: "single_multiple_electrode", label: "Single or multiple electrode" },
        { t: "texto", id: "stringer_weave", label: "Stringer or weave bead" },
        { t: "texto", id: "welding_current", label: "Welding current", nota: "ac or dc" },
        { t: "texto", id: "polarity", label: "Polarity" },
        { t: "texto", id: "position_groove", label: "Position of groove" },
      ],
    },
    {
      id: "cleaning",
      titulo: "Cleaning procedure",
      campos: [
        { t: "texto", id: "clean_oxide", label: "Initial — Oxide removal method", full: true },
        { t: "texto", id: "clean_degreasing", label: "Initial — Degreasing agent", full: true },
        { t: "texto", id: "clean_interpass", label: "Interpass", full: true },
        { t: "texto", id: "clean_smut", label: "Interpass — Smut removal", full: true },
        {
          t: "texto",
          id: "clean_dye_penetrant",
          label: "Interpass — Dye penetrant removal",
          full: true,
        },
      ],
    },
    {
      id: "preheat",
      titulo: "Preheat",
      campos: [
        { t: "texto", id: "preheat_temp", label: "Preheat temperature" },
        { t: "texto", id: "interpass_temp", label: "Interpass temperature" },
      ],
    },
    {
      id: "pwht",
      titulo: "Postweld heat treatment",
      campos: [
        { t: "texto", id: "pwht_general", label: "Postweld heat treatment", full: true },
        { t: "texto", id: "pwht_original_temper", label: "Original temper" },
        { t: "texto", id: "pwht_final_temper", label: "Final temper" },
        { t: "texto", id: "pwht_temperature", label: "Temperature" },
        { t: "texto", id: "pwht_time", label: "Time" },
        { t: "texto", id: "pwht_quench", label: "Quench", full: true },
      ],
    },
    {
      id: "groove_weld_test",
      titulo: "Groove Weld Test",
      campos: [
        {
          t: "tabla",
          id: "groove_weld_test",
          columnas: [
            { id: "specimen", label: "Specimen No." },
            { id: "width", label: "Width" },
            { id: "thickness", label: "Thickness" },
            { id: "area", label: "Area" },
            { id: "load", label: "Ultimate Tensile Load, lb" },
            { id: "stress", label: "Ultimate Unit Stress, psi" },
            { id: "failure", label: "Character of Failure and Location", peso: 2 },
          ],
          filas: 4,
        },
      ],
    },
    {
      id: "bend_test",
      titulo: "Guided Bend Test",
      campos: [
        {
          t: "tabla",
          id: "bend_test",
          columnas: [
            { id: "type", label: "Type of Bend", peso: 2 },
            { id: "jig", label: "Bend Jig Fig. No." },
            { id: "result", label: "Result", peso: 2 },
          ],
          filas: 8,
        },
        { t: "texto", id: "visual_examination", label: "Visual examination" },
        { t: "texto", id: "visual_pass", label: "Pass" },
        { t: "texto", id: "visual_fail", label: "Fail" },
        {
          t: "texto",
          id: "failure_character",
          label: "Type and character of failure",
          full: true,
        },
      ],
    },
    {
      id: "fillet_weld_test",
      titulo: "Fillet Weld Test",
      campos: [
        { t: "texto", id: "fillet_fracture", label: "Fracture test", nota: "Pass or fail" },
        { t: "texto", id: "fillet_root_fusion", label: "Root fusion", nota: "Yes or no" },
        {
          t: "texto",
          id: "fillet_macro",
          label: "Macro test: Weld size and contour",
          nota: "Sat. or Unsat.",
        },
        { t: "texto", id: "fillet_penetration", label: "Penetration", nota: "Sat. or Unsat." },
      ],
    },
    {
      id: "certificacion",
      titulo: "Certification",
      campos: [
        { t: "texto", id: "welder_name", label: "Welder's name" },
        { t: "texto", id: "clock_no", label: "Clock no." },
        { t: "texto", id: "stamp_no", label: "Stamp no." },
        { t: "texto", id: "tests_conducted_by", label: "Tests conducted by" },
        { t: "texto", id: "laboratory", label: "Laboratory" },
        { t: "texto", id: "test_number", label: "Test number" },
        { t: "texto", id: "per", label: "Per" },
        { t: "texto", id: "cert_signed", label: "Signed", nota: "Manufacturer" },
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
  firmas: [{ id: "firma_manufacturer", label: "Signed (Manufacturer)" }],
  certificacion:
    "We certify that the statements in this record are correct and that the test welds were prepared, welded, and tested in accordance with the requirements of Clause 4, AWS D1.2/D1.2M, Structural Welding Code—Aluminum.",
};
