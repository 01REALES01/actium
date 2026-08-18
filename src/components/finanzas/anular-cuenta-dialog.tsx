"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { anularCxCAction } from "@/lib/actions/cxc";
import { anularCxPAction } from "@/lib/actions/cxp";
import { formatCOP } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ResultadoAnulacion } from "@/lib/actions/anulacion";

/**
 * Confirmación de anulación de una factura. Anular no solo cambia un estado:
 * revierte los movimientos de los abonos ya registrados, así que la operación
 * mueve cifras del flujo de caja y del techo del rubro.
 *
 * El monto que se anuncia antes de confirmar es el registrado en la factura;
 * lo que efectivamente se revierte son sus movimientos vinculados y aún
 * ejecutados, que puede ser menos. Por eso al terminar se muestra el resultado
 * real que devuelve la RPC en vez de dar por hecho que coincidieron.
 */
export function AnularCuentaDialog({
  tipo,
  cuentaId,
  numeroFactura,
  contraparte,
  montoAbonado,
}: {
  tipo: "cxc" | "cxp";
  cuentaId: string;
  numeroFactura: string;
  /** Cliente (CxC) o proveedor (CxP). */
  contraparte: string;
  /** Lo ya cobrado (CxC) o pagado (CxP) en esta factura. */
  montoAbonado: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoAnulacion | null>(null);

  const esCobro = tipo === "cxc";
  const tieneAbonos = montoAbonado > 0;

  function handleOpenChange(next: boolean) {
    if (!next && loading) return;
    setOpen(next);
    if (!next) {
      setError(null);
      // El refresh se difiere al cierre para no re-renderizar la tabla debajo
      // del diálogo mientras el usuario todavía está leyendo el resultado.
      if (resultado) {
        setResultado(null);
        router.refresh();
      }
    }
  }

  async function confirmar() {
    setError(null);
    setLoading(true);
    try {
      const res = esCobro ? await anularCxCAction(cuentaId) : await anularCxPAction(cuentaId);
      setResultado(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible anular la factura.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="min-h-11 gap-1.5 md:min-h-0"
          aria-label="Anular factura"
        >
          <Ban className="h-4 w-4" strokeWidth={1.5} />
          Anular
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-actium border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-semibold">
            {resultado ? "Factura anulada" : "Anular factura"}
          </DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            Factura {numeroFactura} — {contraparte}
          </DialogDescription>
        </DialogHeader>

        {resultado ? (
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex items-start gap-2 rounded-lg border border-success/20 bg-success/10 p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" strokeWidth={1.5} />
              <div>
                {resultado.abonosRevertidos > 0 ? (
                  <p className="text-[--text-primary]">
                    Se revirtieron {resultado.abonosRevertidos}{" "}
                    {resultado.abonosRevertidos === 1 ? "movimiento" : "movimientos"} por{" "}
                    {formatCOP(resultado.montoRevertido)}.
                  </p>
                ) : (
                  <p className="text-[--text-primary]">
                    No había movimientos por revertir. Las cuotas pendientes dejaron de proyectar
                    caja.
                  </p>
                )}
                <p className="mt-1 text-xs text-[--text-secondary]">
                  La factura ya no afecta el flujo de caja del proyecto ni el consolidado.
                </p>
              </div>
            </div>
            {resultado.abonosRevertidos > 0 && resultado.montoRevertido !== montoAbonado ? (
              <p className="text-xs text-[--text-muted]">
                La factura registraba {formatCOP(montoAbonado)} en{" "}
                {esCobro ? "cobros" : "pagos"}. La diferencia corresponde a movimientos que ya no
                estaban vigentes o que no pudieron vincularse a esta factura.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-col gap-3 text-sm text-[--text-secondary]">
            {tieneAbonos ? (
              <div className="rounded-lg border border-warning/20 bg-warning/10 p-3 text-[--text-primary]">
                <p className="font-medium">
                  Esta factura tiene {formatCOP(montoAbonado)} en {esCobro ? "cobros" : "pagos"}{" "}
                  registrados.
                </p>
                <p className="mt-1 text-xs text-[--text-secondary]">
                  Al anularla, esos movimientos se revierten: dejan de afectar el flujo de caja del
                  proyecto y el consolidado, y liberan el techo del rubro. El historial se conserva.
                </p>
              </div>
            ) : (
              <p>
                Las cuotas pendientes dejarán de proyectar caja. El historial de la factura se
                conserva.
              </p>
            )}
            <p className="text-xs text-[--text-muted]">
              Una factura anulada no admite nuevos {esCobro ? "cobros" : "pagos"}.
            </p>
          </div>
        )}

        {error ? (
          <p className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            {error}
          </p>
        ) : null}

        <DialogFooter>
          {resultado ? (
            <Button type="button" className="min-h-11" onClick={() => handleOpenChange(false)}>
              Entendido
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11"
                onClick={() => handleOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                className={cn("min-h-11", loading && "cursor-progress")}
                onClick={confirmar}
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Anular factura
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
