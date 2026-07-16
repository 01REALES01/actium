"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, Loader2, AlertCircle } from "lucide-react";
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
import { registrarPagoAction } from "@/lib/actions/cxp";
import { formatCOP } from "@/lib/format";
import { hoyLocal } from "@/lib/fecha";

/** Registrar pago de una CxP. (CxC usa RegistrarCobroCuotaDialog — se paga por cuota, no por factura completa.) */
export function RegistrarPagoDialog({
  id,
  numeroFactura,
  saldoPendiente,
}: {
  id: string;
  numeroFactura: string;
  saldoPendiente: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [monto, setMonto] = useState(String(saldoPendiente));
  const [fecha, setFecha] = useState(hoyLocal());

  function handleOpenChange(next: boolean) {
    if (!next && loading) return;
    setOpen(next);
    if (!next) {
      setError(null);
      setMonto(String(saldoPendiente));
      setFecha(hoyLocal());
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const montoNum = Number(monto);
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setError("Ingresa un monto válido.");
      return;
    }
    if (montoNum > saldoPendiente) {
      setError(`El monto supera el saldo pendiente (${formatCOP(saldoPendiente)}).`);
      return;
    }

    setLoading(true);
    try {
      await registrarPagoAction({ cxpId: id, monto: montoNum, fecha });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible registrar el pago.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <DollarSign className="h-3.5 w-3.5" strokeWidth={1.5} />
          Registrar pago
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm rounded-actium border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-semibold">Registrar pago</DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            Factura {numeroFactura} — saldo pendiente: {formatCOP(saldoPendiente)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pago-monto">Monto (COP)</Label>
            <Input
              id="pago-monto"
              type="number"
              min={0}
              max={saldoPendiente}
              step="1000"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pago-fecha">Fecha</Label>
            <Input id="pago-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </div>

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
              Confirmar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
