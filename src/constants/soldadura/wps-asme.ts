// =============================================================================
// WPS — ASME BPVC Sección IX, formato QW-482 (frente y respaldo).
// =============================================================================
// Transcripción literal del formato oficial. Los rótulos quedan en inglés a
// propósito: el documento se audita contra el código y el inspector busca el
// mismo texto que tiene impreso en el QW-482. La aplicación alrededor —botones,
// avisos, ayudas— sí habla español.
// =============================================================================

import type { EspecDocumento } from "./tipos";

export const WPS_ASME: EspecDocumento = {
  tipo: "wps",
  variante: "asme_ix",
  formulario: "QW-482",
  norma: "ASME BPVC.IX-2023",
  titulo: "Suggested Format for Welding Procedure Specifications (WPS)",
  referencia: "See QW-200.1, Section IX, ASME Boiler and Pressure Vessel Code",
  claves: {
    numero: "wps_no",
    titulo: "organization_name",
    proceso: "welding_processes",
    pqrRef: "supporting_pqr",
    fecha: "fecha",
    revision: "revision_no",
  },
  secciones: [
    {
      id: "identificacion",
      titulo: "Identification",
      campos: [
        { t: "texto", id: "organization_name", label: "Organization Name" },
        { t: "texto", id: "by", label: "By" },
        { t: "texto", id: "wps_no", label: "Welding Procedure Specification No." },
        { t: "fecha", id: "fecha", label: "Date" },
        { t: "texto", id: "supporting_pqr", label: "Supporting PQR No.(s)" },
        { t: "texto", id: "revision_no", label: "Revision No." },
        { t: "fecha", id: "revision_fecha", label: "Revision Date" },
        { t: "texto", id: "welding_processes", label: "Welding Process(es)" },
        {
          t: "texto",
          id: "types",
          label: "Type(s)",
          nota: "Automatic, Manual, Machine, or Semi-Automatic",
        },
      ],
    },
    {
      id: "joints",
      titulo: "Joints",
      ref: "QW-402",
      campos: [
        { t: "texto", id: "joint_design", label: "Joint Design" },
        { t: "texto", id: "root_spacing", label: "Root Spacing" },
        { t: "texto", id: "backing_yes", label: "Backing: Yes" },
        { t: "texto", id: "backing_no", label: "Backing: No" },
        {
          t: "texto",
          id: "backing_material",
          label: "Backing Material (Type)",
          nota: "Refer to both backing and retainers",
          full: true,
        },
        {
          t: "checks",
          id: "backing_clase",
          label: "Backing material class",
          opciones: [
            { id: "metal", label: "Metal" },
            { id: "nonfusing_metal", label: "Nonfusing Metal" },
            { id: "nonmetallic", label: "Nonmetallic" },
            { id: "other", label: "Other" },
          ],
        },
        {
          t: "nota",
          texto:
            "Sketches, Production Drawings, Weld Symbols, or Written Description should show the general arrangement of the parts to be welded. Where applicable, the details of weld groove may be specified.",
        },
        {
          t: "nota",
          texto:
            "Sketches may be attached to illustrate joint design, weld layers, and bead sequence (e.g., for toughness procedures, for multiple process procedures, etc.)",
        },
        { t: "area", id: "joint_details", label: "Details", full: true },
        { t: "croquis", id: "joint_sketch", label: "Joint design sketch" },
      ],
    },
    {
      id: "base_metals",
      titulo: "Base Metals",
      ref: "QW-403",
      nota: "Each base metal-filler metal combination should be specified individually.",
      campos: [
        { t: "texto", id: "bm_p_no", label: "P-No." },
        { t: "texto", id: "bm_group_no", label: "Group No." },
        { t: "texto", id: "bm_to_p_no", label: "to P-No." },
        { t: "texto", id: "bm_to_group_no", label: "Group No." },
        {
          t: "texto",
          id: "bm_spec",
          label: "Specification and type, grade, or UNS Number",
          full: true,
        },
        {
          t: "texto",
          id: "bm_to_spec",
          label: "to Specification and type, grade, or UNS Number",
          full: true,
        },
        { t: "texto", id: "bm_chem", label: "Chem. Analysis and Mech. Prop.", full: true },
        { t: "texto", id: "bm_to_chem", label: "to Chem. Analysis and Mech. Prop.", full: true },
        { t: "texto", id: "bm_thk_groove", label: "Thickness Range — Base Metal: Groove" },
        { t: "texto", id: "bm_thk_fillet", label: "Thickness Range — Fillet" },
        {
          t: "sino",
          id: "bm_max_pass",
          label: "Maximum Pass Thickness 1/2 in. (13 mm) or less",
          full: true,
        },
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
            "Spec. No. (SFA)",
            "AWS No. (Class)",
            "F-No.",
            "A-No.",
            "Size of Filler Metals",
            "Filler Metal Product Form",
            "Supplemental Filler Metal",
            "Weld Metal — Deposited Thickness: Groove",
            "Weld Metal — Deposited Thickness: Fillet",
            "Electrode-Flux (Class)",
            "Flux Type",
            "Flux Trade Name",
            "Consumable Insert",
            "Other",
          ],
        },
      ],
    },
    {
      id: "positions",
      titulo: "Positions",
      ref: "QW-405",
      campos: [
        { t: "texto", id: "pos_groove", label: "Position(s) of Groove" },
        { t: "texto", id: "pos_progression_up", label: "Welding Progression: Up" },
        { t: "texto", id: "pos_progression_down", label: "Down" },
        { t: "texto", id: "pos_fillet", label: "Position(s) of Fillet" },
        { t: "texto", id: "pos_other", label: "Other", full: true },
      ],
    },
    {
      id: "preheat",
      titulo: "Preheat",
      ref: "QW-406",
      nota: "Continuous or special heating, where applicable, should be specified.",
      campos: [
        { t: "texto", id: "preheat_min", label: "Preheat Temperature, Minimum" },
        { t: "texto", id: "interpass_max", label: "Interpass Temperature, Maximum" },
        { t: "texto", id: "preheat_maintenance", label: "Preheat Maintenance" },
        { t: "texto", id: "preheat_other", label: "Other", full: true },
      ],
    },
    {
      id: "pwht",
      titulo: "Postweld Heat Treatment",
      ref: "QW-407",
      campos: [
        { t: "texto", id: "pwht_temp_range", label: "Temperature Range" },
        { t: "texto", id: "pwht_time_range", label: "Time Range" },
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
      nota: "Amps and volts, or power or energy range, should be specified for each electrode size, position, and thickness, etc.",
      campos: [
        {
          t: "tabla",
          id: "electrical",
          columnas: [
            { id: "pass", label: "Weld Pass(es)" },
            { id: "process", label: "Process" },
            { id: "fm_class", label: "Filler Metal Classification" },
            { id: "fm_diam", label: "Filler Metal Diameter" },
            { id: "current", label: "Current Type and Polarity" },
            { id: "amps", label: "Amps (Range)" },
            { id: "wire_feed", label: "Wire Feed Speed (Range)" },
            { id: "energy", label: "Energy or Power (Range)" },
            { id: "volts", label: "Volts (Range)" },
            { id: "travel", label: "Travel Speed (Range)" },
            { id: "otros", label: "Other", peso: 2 },
          ],
          filas: 3,
        },
        { t: "texto", id: "pulsing_current", label: "Pulsing Current" },
        { t: "texto", id: "heat_input", label: "Heat Input (max.)" },
        {
          t: "texto",
          id: "tungsten",
          label: "Tungsten Electrode Size and Type",
          nota: "Pure Tungsten, 2% Thoriated, etc.",
          full: true,
        },
        {
          t: "texto",
          id: "transfer_mode",
          label: "Mode of Metal Transfer for GMAW (FCAW)",
          nota: "Spray Arc, Short-Circuiting Arc, etc.",
          full: true,
        },
        { t: "texto", id: "elec_other", label: "Other", full: true },
      ],
    },
    {
      id: "technique",
      titulo: "Technique",
      ref: "QW-410",
      campos: [
        { t: "texto", id: "tec_bead", label: "String or Weave Bead" },
        { t: "texto", id: "tec_orifice", label: "Orifice, Nozzle, or Gas Cup Size" },
        {
          t: "texto",
          id: "tec_cleaning",
          label: "Initial and Interpass Cleaning (Brushing, Grinding, etc.)",
          full: true,
        },
        { t: "texto", id: "tec_back_gouging", label: "Method of Back Gouging" },
        { t: "texto", id: "tec_oscillation", label: "Oscillation" },
        { t: "texto", id: "tec_contact_tube", label: "Contact Tube to Work Distance" },
        { t: "texto", id: "tec_multiple_pass", label: "Multiple or Single Pass (Per Side)" },
        { t: "texto", id: "tec_multiple_electrodes", label: "Multiple or Single Electrodes" },
        { t: "texto", id: "tec_electrode_spacing", label: "Electrode Spacing" },
        { t: "texto", id: "tec_peening", label: "Peening" },
        { t: "texto", id: "tec_other", label: "Other", full: true },
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
  firmas: [{ id: "firma_by", label: "By" }],
  notaPie:
    "Each base metal-filler metal combination should be specified individually. Sketches may be attached to illustrate joint design, weld layers, and bead sequence.",
};

