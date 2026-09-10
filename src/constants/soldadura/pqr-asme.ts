// =============================================================================
// PQR — ASME BPVC Sección IX, formato QW-483 (frente y respaldo).
// =============================================================================
// El PQR registra los valores REALES con que se soldó el cupón de prueba y los
// ensayos que lo respaldan; el WPS, en cambio, declara rangos. Por eso aquí no
// hay campos de "range" y sí cuatro tablas de ensayos.
// =============================================================================

import type { EspecDocumento } from "./tipos";

export const PQR_ASME: EspecDocumento = {
  tipo: "pqr",
  variante: "asme_ix",
  formulario: "QW-483",
  norma: "ASME BPVC.IX-2023",
  titulo: "Suggested Format for Procedure Qualification Records (PQR)",
  referencia:
    "See QW-200.2, Section IX, ASME Boiler and Pressure Vessel Code — Record Actual Variables Used to Weld Test Coupon",
  claves: {
    numero: "pqr_no",
    titulo: "organization_name",
    proceso: "welding_processes",
    wpsRef: "wps_no",
    fecha: "fecha",
  },
  secciones: [
    {
      id: "identificacion",
      titulo: "Identification",
      campos: [
        { t: "texto", id: "organization_name", label: "Organization Name" },
        { t: "texto", id: "pqr_no", label: "Procedure Qualification Record No." },
        { t: "fecha", id: "fecha", label: "Date" },
        { t: "texto", id: "wps_no", label: "WPS No." },
        { t: "sino", id: "qg_106_4", label: "QG-106.4 Group Qualification" },
        { t: "texto", id: "welding_processes", label: "Welding Process(es)" },
        { t: "texto", id: "types", label: "Types (Manual, Automatic, Semi-Automatic)" },
      ],
    },
    {
      id: "joints",
      titulo: "Joints",
      ref: "QW-402",
      nota: "For combination qualifications, the deposited weld metal thickness shall be recorded for each filler metal and process used.",
      campos: [
        { t: "croquis", id: "joint_sketch", label: "Groove Design of Test Coupon" },
        { t: "area", id: "joint_details", label: "Joint details", full: true },
      ],
    },
    {
      id: "base_metals",
      titulo: "Base Metals",
      ref: "QW-403",
      campos: [
        { t: "texto", id: "bm_material_spec", label: "Material Spec." },
        { t: "texto", id: "bm_type_grade", label: "Type or Grade, or UNS Number" },
        { t: "texto", id: "bm_p_no", label: "P-No." },
        { t: "texto", id: "bm_group_no", label: "Group No." },
        { t: "texto", id: "bm_to_p_no", label: "to P-No." },
        { t: "texto", id: "bm_to_group_no", label: "Group No." },
        { t: "texto", id: "bm_thk_coupon", label: "Thickness of Test Coupon" },
        { t: "texto", id: "bm_diam_coupon", label: "Diameter of Test Coupon" },
        { t: "texto", id: "bm_max_pass", label: "Maximum Pass Thickness" },
        { t: "texto", id: "bm_other", label: "Other", full: true },
      ],
    },
    {
      id: "filler_metals",
      titulo: "Filler Metals",
      ref: "QW-404",
      campos: [
        {
          t: "tabla",
          id: "filler_metals",
          columnas: [
            { id: "variable", label: "Variable", peso: 2 },
            { id: "c1", label: "1" },
            { id: "c2", label: "2" },
          ],
          filas: 0,
          filasFijas: [
            "SFA Specification",
            "AWS Classification",
            "Filler Metal F-No.",
            "Weld Metal Analysis A-No.",
            "Size of Filler Metal",
            "Filler Metal Product Form",
            "Supplemental Filler Metal",
            "Electrode Flux Classification",
            "Flux Type",
            "Flux Trade Name",
            "Weld Metal Thickness",
            "Other",
          ],
        },
      ],
    },
    {
      id: "position",
      titulo: "Position",
      ref: "QW-405",
      campos: [
        { t: "texto", id: "pos_positions", label: "Position(s)" },
        { t: "texto", id: "pos_progression", label: "Weld Progression (Uphill, Downhill)" },
        { t: "texto", id: "pos_other", label: "Other", full: true },
      ],
    },
    {
      id: "preheat",
      titulo: "Preheat",
      ref: "QW-406",
      campos: [
        { t: "texto", id: "preheat_temp", label: "Preheat Temperature" },
        { t: "texto", id: "interpass_temp", label: "Interpass Temperature" },
        { t: "texto", id: "preheat_other", label: "Other", full: true },
      ],
    },
    {
      id: "pwht",
      titulo: "Postweld Heat Treatment",
      ref: "QW-407",
      campos: [
        { t: "texto", id: "pwht_temp", label: "Temperature" },
        { t: "texto", id: "pwht_time", label: "Time" },
        { t: "texto", id: "pwht_other", label: "Other", full: true },
      ],
    },
    {
      id: "gas",
      titulo: "Gas",
      ref: "QW-408",
      campos: [
        {
          t: "tabla",
          id: "gas",
          columnas: [
            { id: "linea", label: "" },
            { id: "gases", label: "Gas(es)" },
            { id: "composicion", label: "Percent Composition (Mixture)" },
            { id: "flujo", label: "Flow Rate" },
          ],
          filas: 0,
          filasFijas: ["Shielding", "Trailing", "Backing", "Other"],
        },
      ],
    },
    {
      id: "electrical",
      titulo: "Electrical Characteristics",
      ref: "QW-409",
      campos: [
        { t: "texto", id: "elec_current", label: "Current" },
        { t: "texto", id: "elec_polarity", label: "Polarity" },
        { t: "texto", id: "elec_amps", label: "Amps." },
        { t: "texto", id: "elec_volts", label: "Volts" },
        { t: "texto", id: "elec_waveform", label: "Waveform Control" },
        { t: "texto", id: "elec_power", label: "Power or Energy" },
        { t: "texto", id: "elec_arc_time", label: "Arc Time" },
        { t: "texto", id: "elec_bead_length", label: "Weld Bead Length" },
        { t: "texto", id: "elec_tungsten", label: "Tungsten Electrode Size" },
        { t: "texto", id: "elec_transfer", label: "Mode of Metal Transfer for GMAW (FCAW)" },
        { t: "texto", id: "elec_heat_input", label: "Heat Input" },
        { t: "texto", id: "elec_other", label: "Other", full: true },
      ],
    },
    {
      id: "technique",
      titulo: "Technique",
      ref: "QW-410",
      campos: [
        { t: "texto", id: "tec_travel_speed", label: "Travel Speed" },
        { t: "texto", id: "tec_bead", label: "String or Weave Bead" },
        { t: "texto", id: "tec_oscillation", label: "Oscillation" },
        { t: "texto", id: "tec_multipass", label: "Multipass or Single Pass (Per Side)" },
        { t: "texto", id: "tec_electrodes", label: "Single or Multiple Electrodes" },
        { t: "texto", id: "tec_other", label: "Other", full: true },
      ],
    },
    {
      id: "tensile",
      titulo: "Tensile Test",
      ref: "QW-150",
      campos: [
        {
          t: "tabla",
          id: "tensile",
          columnas: [
            { id: "specimen", label: "Specimen No." },
            { id: "width", label: "Width" },
            { id: "thickness", label: "Thickness" },
            { id: "area", label: "Area" },
            { id: "load", label: "Ultimate Total Load" },
            { id: "stress", label: "Ultimate Unit Stress (psi or MPa)" },
            { id: "failure", label: "Type of Failure and Location", peso: 2 },
          ],
          filas: 4,
        },
        {
          t: "texto",
          id: "tensile_alt_spec",
          label: "Alternative Tension Specimen Specification (QW-462)",
          full: true,
        },
      ],
    },
    {
      id: "bend",
      titulo: "Guided-Bend Tests",
      ref: "QW-160",
      campos: [
        {
          t: "tabla",
          id: "bend",
          columnas: [
            { id: "type", label: "Type and Figure No.", peso: 2 },
            { id: "result", label: "Result", peso: 2 },
          ],
          filas: 4,
        },
      ],
    },
    {
      id: "toughness",
      titulo: "Toughness Tests",
      ref: "QW-170",
      campos: [
        {
          t: "tabla",
          id: "toughness",
          columnas: [
            { id: "specimen", label: "Specimen No." },
            { id: "notch", label: "Notch Location" },
            { id: "size", label: "Specimen Size" },
            { id: "temp", label: "Test Temperature" },
            { id: "ftlb", label: "ft-lb or J" },
            { id: "shear", label: "% Shear" },
            { id: "mils", label: "Mils (in.) or mm" },
            { id: "drop_weight", label: "Drop Weight Break (Y/N)" },
          ],
          filas: 4,
          nota: "ft-lb or J, % Shear y Mils son los valores de tenacidad del formato.",
        },
        { t: "area", id: "toughness_comments", label: "Comments", full: true },
      ],
    },
    {
      id: "fillet",
      titulo: "Fillet-Weld Test",
      ref: "QW-180",
      campos: [
        { t: "sino", id: "fillet_satisfactory", label: "Result — Satisfactory" },
        { t: "sino", id: "fillet_penetration", label: "Penetration into Parent Metal" },
        { t: "texto", id: "fillet_macro", label: "Macro — Results", full: true },
      ],
    },
    {
      id: "other_tests",
      titulo: "Other Tests",
      campos: [
        { t: "texto", id: "other_test_type", label: "Type of Test" },
        { t: "texto", id: "other_deposit_analysis", label: "Deposit Analysis" },
        { t: "texto", id: "other_other", label: "Other", full: true },
      ],
    },
    {
      id: "certificacion",
      titulo: "Certification",
      campos: [
        { t: "texto", id: "welder_name", label: "Welder's Name" },
        { t: "texto", id: "clock_no", label: "Clock No." },
        { t: "texto", id: "stamp_no", label: "Stamp No." },
        { t: "texto", id: "tests_conducted_by", label: "Tests Conducted by" },
        { t: "texto", id: "laboratory_test_no", label: "Laboratory Test No." },
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
    "We certify that the statements in this record are correct and that the test welds were prepared, welded, and tested in accordance with the requirements of Section IX of the ASME Boiler and Pressure Vessel Code.",
  notaPie:
    "Detail of record of tests are illustrative only and may be modified to conform to the type and number of tests required by the Code.",
};
