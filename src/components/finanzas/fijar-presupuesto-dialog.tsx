"use client";

import { useState, useTransition } from "react";
import { Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { fijarPresupuestoAction } from "@/lib/actions/rubros";
import { formatCOP } from "@/lib/format";

export function FijarPresupuestoDialog({
  proyectoId,
  sumaActual,
  presupuestoFijado,
}: {
  proyectoId: string;
  sumaActual: number;
  presupuestoFijado: number | null;
}) {
  const [open, setOpen] = useState(false);
  const [monto, setMonto] = useState(String(sumaActual));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const yaFijado = presupuestoFijado !== null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      setError("Ingrese un monto válido mayor a cero.");
      return;
    }
    if (montoNum < sumaActual) {
      setError(
        `El monto fijado no puede ser menor a la suma actual de rubros (${formatCOP(sumaActual)}).`,
      );
      return;
    }

    startTransition(async () => {
      try {
        await fijarPresupuestoAction({ proyectoId, monto: montoNum });
        setOpen(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "No fue posible fijar el presupuesto.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={
            yaFijado
              ? "gap-1.5 border-[--border-default] text-[--text-secondary]"
              : "gap-1.5 border-actium-orange text-actium-orange hover:bg-actium-orange/10"
          }
        >
          <Lock className="h-4 w-4" strokeWidth={1.5} />
          {yaFijado ? `Presupuesto fijado: ${formatCOP(presupuestoFijado!)}` : "Definir presupuesto total"}
        </Button>
      </DialogTrigger>
      <DialogContent className="border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="font-sans">
            {yaFijado ? "Actualizar presupuesto total" : "Definir presupuesto total"}
          </DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            {yaFijado
              ? `El presupuesto actual es ${formatCOP(presupuestoFijado!)}. Puede aumentarlo pero no bajarlo del ejecutado.`
              : "Una vez definido, ningún rubro podrá aumentar su techo de forma que supere este valor. La suma actual de rubros de egreso es " +
                formatCOP(sumaActual) +
                "."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="presupuesto-total">Presupuesto total (COP)</Label>
            <Input
              id="presupuesto-total"
              type="number"
              min={sumaActual}
              step="any"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="bg-[--bg-secondary] border-[--border-default]"
            />
            <p className="text-xs text-[--text-muted]">
              Suma actual de rubros de egreso: {formatCOP(sumaActual)}. El presupuesto total no puede ser menor a este valor.
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-danger/10 border border-danger/20 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="border-[--border-default]"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className="bg-actium-orange text-white hover:bg-actium-orange-hover"
            >
              {pending ? "Guardando..." : "Confirmar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
