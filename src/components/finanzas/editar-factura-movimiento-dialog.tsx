"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { actualizarFacturaMovimientoAction } from "@/lib/actions/presupuesto";

export function EditarFacturaMovimientoDialog({
  movimientoId,
  numeroFacturaActual,
  facturaPendienteActual,
}: {
  movimientoId: string;
  numeroFacturaActual: string | null;
  facturaPendienteActual: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [numeroFactura, setNumeroFactura] = useState(numeroFacturaActual ?? "");
  const [facturaPendiente, setFacturaPendiente] = useState(facturaPendienteActual);

  function handleOpenChange(next: boolean) {
    if (!next && loading) return;
    setOpen(next);
    if (!next) {
      setError(null);
      setNumeroFactura(numeroFacturaActual ?? "");
      setFacturaPendiente(facturaPendienteActual);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!facturaPendiente && !numeroFactura.trim()) {
      setError("Ingresa el número de factura o marca \"Factura pendiente\".");
      return;
    }

    setLoading(true);
    try {
      await actualizarFacturaMovimientoAction({
        movimientoId,
        numeroFactura: facturaPendiente ? undefined : numeroFactura.trim(),
        facturaPendiente,
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar los cambios. Intenta de nuevo.");
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
          className="h-11 w-11 p-0"
          title="Editar factura"
        >
          <Pencil className="h-4 w-4" strokeWidth={1.5} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-actium border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-semibold">Editar factura</DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            Actualiza el número de factura de este movimiento. Este cambio no afecta su monto,
            rubro ni estado.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="numero-factura">Número de factura</Label>
            <Input
              id="numero-factura"
              value={numeroFactura}
              onChange={(e) => setNumeroFactura(e.target.value)}
              placeholder="Ej. FE-00123"
              disabled={facturaPendiente}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={facturaPendiente}
              onChange={(e) => setFacturaPendiente(e.target.checked)}
              className="h-4 w-4 rounded border-[--border-default] bg-[--bg-secondary] accent-actium-orange"
            />
            <span className="text-sm text-[--text-secondary]">
              Factura pendiente (aún no ha sido emitida)
            </span>
          </label>

          {error ? (
            <p className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
