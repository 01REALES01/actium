"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, AlertCircle } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { registrarYEjecutarMovimientoAction } from "@/lib/actions/presupuesto";
import { hoyLocal } from "@/lib/fecha";
import type { MovimientoTipo, Tables } from "@/types/database.types";

const TIPOS: { value: MovimientoTipo; label: string }[] = [
  { value: "gasto", label: "Gasto" },
  { value: "traslado_entre_rubros", label: "Traslado entre rubros" },
];

export function MovimientoDialog({
  proyectoId,
  rubros,
}: {
  proyectoId: string;
  rubros: Pick<Tables<"rubros">, "id" | "nombre" | "codigo">[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tipo, setTipo] = useState<MovimientoTipo>("gasto");
  const [rubroDestinoId, setRubroDestinoId] = useState("");
  const [rubroOrigenId, setRubroOrigenId] = useState("");
  const [monto, setMonto] = useState("");
  const [justificacion, setJustificacion] = useState("");

  function resetForm() {
    setTipo("gasto");
    setRubroDestinoId("");
    setRubroOrigenId("");
    setMonto("");
    setJustificacion("");
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next && loading) return;
    setOpen(next);
    if (!next) resetForm();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const montoNum = Number(monto);
    if (!rubroDestinoId) {
      setError("Selecciona el rubro destino.");
      return;
    }
    if (tipo === "traslado_entre_rubros" && (!rubroOrigenId || rubroOrigenId === rubroDestinoId)) {
      setError("Selecciona un rubro de origen distinto al destino.");
      return;
    }
    if (!Number.isFinite(montoNum) || montoNum <= 0) {
      setError("Ingresa un monto válido.");
      return;
    }
    if (!justificacion.trim()) {
      setError("La justificación es obligatoria.");
      return;
    }

    setLoading(true);
    try {
      await registrarYEjecutarMovimientoAction({
        proyectoId,
        rubroDestinoId,
        rubroOrigenId: tipo === "traslado_entre_rubros" ? rubroOrigenId : undefined,
        tipo,
        monto: montoNum,
        justificacion: justificacion.trim(),
      });
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible registrar el movimiento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Nuevo movimiento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-actium border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-semibold">Nuevo movimiento</DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            Se registra y ejecuta de inmediato. Fecha efectiva: {hoyLocal()}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as MovimientoTipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tipo === "traslado_entre_rubros" ? (
            <div className="flex flex-col gap-1.5">
              <Label>Rubro origen</Label>
              <Select value={rubroOrigenId} onValueChange={setRubroOrigenId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona el rubro origen" />
                </SelectTrigger>
                <SelectContent>
                  {rubros.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.codigo ? `${r.codigo} · ` : ""}
                      {r.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label>Rubro destino</Label>
            <Select value={rubroDestinoId} onValueChange={setRubroDestinoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el rubro destino" />
              </SelectTrigger>
              <SelectContent>
                {rubros.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.codigo ? `${r.codigo} · ` : ""}
                    {r.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mov-monto">Monto (COP)</Label>
            <Input
              id="mov-monto"
              type="number"
              min={0}
              step="1000"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mov-justificacion">Justificación</Label>
            <Input
              id="mov-justificacion"
              value={justificacion}
              onChange={(e) => setJustificacion(e.target.value)}
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
              Registrar y ejecutar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
