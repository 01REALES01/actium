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
import { ajustarTechoRubroAction } from "@/lib/actions/rubros";
import { formatCOP } from "@/lib/format";
import type { CategoriaFlujo } from "@/types/database.types";

export function AjustarTechoDialog({
  rubroId,
  rubroNombre,
  montoActual,
  categoria,
}: {
  rubroId: string;
  rubroNombre: string;
  montoActual: number;
  categoria?: CategoriaFlujo | null;
}) {
  const esIngreso = categoria === "ingresos";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nuevoMonto, setNuevoMonto] = useState(String(montoActual));
  const [justificacion, setJustificacion] = useState("");

  function handleOpenChange(next: boolean) {
    if (!next && loading) return;
    setOpen(next);
    if (!next) {
      setError(null);
      setNuevoMonto(String(montoActual));
      setJustificacion("");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const monto = Number(nuevoMonto);
    if (!Number.isFinite(monto) || monto <= 0) {
      setError("Ingresa un monto válido.");
      return;
    }
    if (!justificacion.trim()) {
      setError("La justificación es obligatoria.");
      return;
    }

    setLoading(true);
    try {
      await ajustarTechoRubroAction({ rubroId, nuevoMonto: monto, justificacion: justificacion.trim() });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible ajustar el techo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5">
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
          Editar techo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-actium border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-semibold">
            {esIngreso ? "Ajustar meta de ingresos" : "Ajustar techo de rubro"}
          </DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            {rubroNombre} — {esIngreso ? "meta actual" : "techo actual"}: {formatCOP(montoActual)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="nuevo-monto">{esIngreso ? "Nueva meta (COP)" : "Nuevo techo (COP)"}</Label>
            <Input
              id="nuevo-monto"
              type="number"
              min={0}
              step="1000"
              value={nuevoMonto}
              onChange={(e) => setNuevoMonto(e.target.value)}
              required
            />
            {esIngreso ? (
              <p className="text-xs text-[--text-secondary]">
                Es una meta informativa: registrar cobros nunca se bloquea al superarla.
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="justificacion">Justificación</Label>
            <Input
              id="justificacion"
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
              placeholder="Motivo del ajuste"
              required
            />
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
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
