import { z } from "zod";

/** Lo que devuelven las RPC `anular_cxc` / `anular_cxp`. */
export type ResultadoAnulacion = {
  /** Movimientos de abono que pasaron de 'ejecutado' a 'anulado'. */
  abonosRevertidos: number;
  /** Suma de esos abonos: lo que dejó de contar en el flujo de caja. */
  montoRevertido: number;
};

const ResultadoRpcSchema = z.object({
  abonos_revertidos: z.number(),
  monto_revertido: z.number(),
});

/**
 * Normaliza el JSONB de la RPC. Si la forma no coincide se lanza: la anulación
 * sí ocurrió en la base, pero no podemos afirmar cuánto se revirtió, y decir
 * "0 abonos" sería peor que fallar — la UI reporta esa cifra al usuario.
 */
export function parseResultadoAnulacion(data: unknown): ResultadoAnulacion {
  const parsed = ResultadoRpcSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error(
      "La factura se anuló, pero no fue posible confirmar cuántos abonos se revirtieron. Verifique el flujo de caja del proyecto.",
    );
  }
  return {
    abonosRevertidos: parsed.data.abonos_revertidos,
    montoRevertido: parsed.data.monto_revertido,
  };
}
