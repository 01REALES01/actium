// =============================================================================
// WPS — AWS D1.2/D1.2M:2014, Anexo E, formato E(a) (dos páginas).
// =============================================================================
// El código estructural de aluminio. Frente al QW-482 de ASME, este formato es
// más corto y organiza las variables por bloques de dos columnas; trae además
// dos cajas de croquis explícitas (diseño de junta y secuencia de soldadura) y
// una tabla de pases con amperaje, voltaje y velocidad.
// =============================================================================

import type { EspecDocumento } from "./tipos";

export const WPS_D12: EspecDocumento = {
  tipo: "wps",
  variante: "aws_d1_2",
  formulario: "Form E(a)",
  norma: "AWS D1.2/D1.2M:2014",
  titulo: "Welding Procedure Specification (WPS)",
  referencia: "Annex E, AWS D1.2/D1.2M, Structural Welding Code — Aluminum",
  claves: {
    numero: "wps_no",
    proceso: "proceso_1",
    pqrRef: "supporting_pqr",
    fecha: "fecha",
    revision: "revision_no",
  },
  secciones: [
    {
      id: "identificacion",
      titulo: "Identification",
      campos: [
        { t: "texto", id: "wps_no", label: "Welding Procedure Specification No." },
        { t: "fecha", id: "fecha", label: "Date" },
        { t: "texto", id: "approved", label: "Approved" },
        { t: "texto", id: "revision_no", label: "Revisions" },
        { t: "fecha", id: "revision_fecha", label: "Date" },
        { t: "texto", id: "revision_approved", label: "Approved" },
        {
          t: "texto",
          id: "supporting_pqr",
          label: "Supporting PQR Numbers",
          nota: "Separe varios números con coma",
          full: true,
        },
      ],
    },
    {
      id: "joints",
      titulo: "Joints",
      campos: [{ t: "croquis", id: "groove_sketch", label: "Groove Design Sketch" }],
    },
    {
      id: "backing",
      titulo: "Backing",
      campos: [
        { t: "texto", id: "backing_type", label: "Type" },
        { t: "texto", id: "backing_permanent", label: "Permanent" },
        { t: "texto", id: "backing_removed", label: "Removed" },
        { t: "texto", id: "backing_other", label: "Other", full: true },
      ],
    },
    {
      id: "base_metals",
      titulo: "Base Metals",
      campos: [
        { t: "texto", id: "bm_m_no", label: "M No." },
        { t: "texto", id: "bm_thickness_from", label: "Thickness" },
        { t: "texto", id: "bm_thickness_to", label: "to" },
        { t: "texto", id: "bm_alloy_temper", label: "Alloy and Temper", full: true },
      ],
    },
    {
      id: "filler_metal",
      titulo: "Filler Metal",
      campos: [
        { t: "texto", id: "fm_f_no", label: "F-No." },
        { t: "texto", id: "fm_aws_no", label: "AWS No. (Class)" },
        { t: "texto", id: "fm_size", label: "Size of electrode" },
        { t: "texto", id: "fm_type", label: "Type of electrode" },
        { t: "texto", id: "fm_other", label: "Other", full: true },
      ],
    },
    {
      id: "shielding_gas",
      titulo: "Shielding Gas",
      campos: [
        { t: "texto", id: "gas_shielding", label: "Shielding gas(es)" },
        { t: "texto", id: "gas_composition", label: "Percent composition" },
        { t: "texto", id: "gas_flow", label: "Flow rate" },
        { t: "texto", id: "gas_other", label: "Other", full: true },
      ],
    },
    {
      id: "position",
      titulo: "Position",
      campos: [
        { t: "texto", id: "pos_groove", label: "Position of groove" },
        { t: "texto", id: "pos_progression", label: "Welding progression" },
        { t: "texto", id: "pos_other", label: "Other", full: true },
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
      id: "cleaning",
      titulo: "Cleaning",
      campos: [
        { t: "texto", id: "clean_oxide", label: "Initial cleaning oxide", full: true },
        { t: "texto", id: "clean_oil", label: "Initial cleaning oil and dirt", full: true },
        { t: "texto", id: "clean_interpass", label: "Interpass cleaning", full: true },
      ],
    },
    {
      id: "pwht",
      titulo: "Postweld Heat Treatment",
      campos: [
        { t: "texto", id: "pwht_original_temper", label: "Original temper" },
        { t: "texto", id: "pwht_final_temper", label: "Final temper" },
        { t: "texto", id: "pwht_temperature", label: "Temperature" },
        { t: "texto", id: "pwht_time", label: "Time" },
        { t: "texto", id: "pwht_quench", label: "Quench", full: true },
      ],
    },
    {
      id: "procesos",
      titulo: "Process(es)",
      nota: "Type: manual, automatic, polarity, pulse, etc.",
      campos: [
        { t: "texto", id: "proceso_1", label: "Process" },
        { t: "texto", id: "proceso_1_tipo", label: "Type" },
        { t: "texto", id: "proceso_2", label: "Process" },
        { t: "texto", id: "proceso_2_tipo", label: "Type" },
        { t: "texto", id: "electrodo_gtaw", label: "Electrode (GTAW)", full: true },
      ],
    },
    {
      id: "technique",
      titulo: "Technique",
      campos: [
        { t: "texto", id: "tec_bead", label: "Stringer or weave bead" },
        { t: "texto", id: "tec_orifice", label: "Orifice or gas cup size" },
        { t: "texto", id: "tec_oscillation", label: "Oscillation" },
        { t: "texto", id: "tec_contact_tube", label: "Contact tube to work distance" },
        {
          t: "texto",
          id: "tec_pass",
          label: "Single pass or multipass",
          nota: "per side",
        },
        { t: "texto", id: "tec_tungsten_extension", label: "Tungsten extension" },
        { t: "texto", id: "tec_backgouging", label: "Method of backgouging" },
        { t: "texto", id: "tec_other", label: "Other", full: true },
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
            { id: "process", label: "Welding Process", peso: 2 },
            { id: "amps", label: "Amps" },
            { id: "volts", label: "Volts" },
            { id: "travel", label: "Travel Speed" },
          ],
          filas: 8,
        },
        { t: "croquis", id: "sequence_sketch", label: "Sketch of Welding Sequence" },
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
  firmas: [{ id: "firma_approved", label: "Approved by" }],
};
