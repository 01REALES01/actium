// =============================================================================
// Resolución de un formato de soldadura a partir de tipo y variante.
// =============================================================================
// Punto único de entrada: el formulario, el PDF y las acciones piden el formato
// aquí y nunca importan un archivo de especificación directamente. Agregar una
// tercera variante normativa es agregar tres entradas a este mapa.
// =============================================================================

import type { DocumentoTipo, DocumentoVariante, EspecDocumento } from "./tipos";
import { WPS_ASME } from "./wps-asme";
import { PQR_ASME } from "./pqr-asme";
import { WPQ_ASME } from "./wpq-asme";
import { WPS_D12 } from "./wps-d12";
import { PQR_D12 } from "./pqr-d12";
import { WPQ_D12 } from "./wpq-d12";

const ESPECS: Record<DocumentoVariante, Record<DocumentoTipo, EspecDocumento>> = {
  asme_ix: { wps: WPS_ASME, pqr: PQR_ASME, wpq: WPQ_ASME },
  aws_d1_2: { wps: WPS_D12, pqr: PQR_D12, wpq: WPQ_D12 },
};

export function obtenerEspec(tipo: DocumentoTipo, variante: DocumentoVariante): EspecDocumento {
  return ESPECS[variante][tipo];
}

export * from "./tipos";
