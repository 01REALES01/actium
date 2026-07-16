"use client";

import { useState, useTransition } from "react";
import { ArrowRightLeft } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { transferirPresupuestoAction } from "@/lib/actions/rubros";
import { formatCOP } from "@/lib/format";
import type { Tables } from "@/types/database.types";

export function TransferirPresupuestoDialog({
  proyectoId,
  rubros,
}: {
  proyectoId: string;
  rubros: Tables<"vw_rubro_balance">[];
}) {
  const [open, setOpen] = useState(false);
  const [rubroOrigenId, setRubroOrigenId] = useState("");
  const [rubroDestinoId, setRubroDestinoId] = useState("");
  const [monto, setMonto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Solo rubros de egreso para transferencia (ingresos tienen su propia lógica)
  const rubrosEgreso = rubros.filter((r) => r.categoria !== "ingresos" && r.rubro_id);

  const origenSeleccionado = rubrosEgreso.find((r) => r.rubro_id === rubroOrigenId);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const montoNum = parseFloat(monto);
    if (!rubroOrigenId || !rubroDestinoId) {
      setError("Debe seleccionar ambos rubros.");
      return;
    }
    if (rubroOrigenId === rubroDestinoId) {
      setError("El rubro origen y destino deben ser diferentes.");
      return;
    }
    if (isNaN(montoNum) || montoNum <= 0) {
      setError("Ingrese un monto válido mayor a cero.");
      return;
    }

    startTransition(async () => {
      try {
        await transferirPresupuestoAction({
          proyectoId,
          rubroOrigenId,
          rubroDestinoId,
          monto: montoNum,
        });
        setOpen(false);
        setRubroOrigenId("");
        setRubroDestinoId("");
        setMonto("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No fue posible realizar la transferencia.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-actium-orange text-actium-orange hover:bg-actium-orange/10"
        >
          <ArrowRightLeft className="h-4 w-4" strokeWidth={1.5} />
          Transferir presupuesto
        </Button>
      </DialogTrigger>
      <DialogContent className="border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="font-sans">Transferir presupuesto entre rubros</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-2 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Rubro origen (cede presupuesto)</Label>
            <Select value={rubroOrigenId} onValueChange={setRubroOrigenId}>
              <SelectTrigger className="bg-[--bg-secondary] border-[--border-default]">
                <SelectValue placeholder="Seleccione el rubro origen" />
              </SelectTrigger>
              <SelectContent className="bg-[--bg-elevated] border-[--border-subtle]">
                {rubrosEgreso.map((r) => (
                  <SelectItem key={r.rubro_id!} value={r.rubro_id!}>
                    <span className="flex items-center justify-between gap-4 w-full">
                      <span>{r.nombre}</span>
                      <span className="text-xs text-[--text-muted]">
                        disponible: {formatCOP(r.disponible ?? 0)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {origenSeleccionado && (
              <p className="text-xs text-[--text-muted]">
                Techo actual: {formatCOP(origenSeleccionado.monto_maximo ?? 0)} — Ejecutado: {formatCOP(origenSeleccionado.ejecutado ?? 0)}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Rubro destino (recibe presupuesto)</Label>
            <Select value={rubroDestinoId} onValueChange={setRubroDestinoId}>
              <SelectTrigger className="bg-[--bg-secondary] border-[--border-default]">
                <SelectValue placeholder="Seleccione el rubro destino" />
              </SelectTrigger>
              <SelectContent className="bg-[--bg-elevated] border-[--border-subtle]">
                {rubrosEgreso
                  .filter((r) => r.rubro_id !== rubroOrigenId)
                  .map((r) => (
                    <SelectItem key={r.rubro_id!} value={r.rubro_id!}>
                      {r.nombre}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="monto-transfer">Monto a transferir (COP)</Label>
            <Input
              id="monto-transfer"
              type="number"
              min="1"
              step="any"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="0"
              className="bg-[--bg-secondary] border-[--border-default]"
            />
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
              {pending ? "Transfiriendo..." : "Confirmar transferencia"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
