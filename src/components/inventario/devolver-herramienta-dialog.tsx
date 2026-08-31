"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Undo2, Loader2, AlertCircle } from "lucide-react";
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
import { devolverHerramientaAction } from "@/lib/actions/inventario";
import { CONDICION_OPCIONES, type CondicionDevolucion } from "@/constants/inventario";

export function DevolverHerramientaDialog({
  unidadId,
  unidadCodigo,
  proyectoNombre,
}: {
  unidadId: string;
  unidadCodigo: string;
  proyectoNombre?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [condicion, setCondicion] = useState<CondicionDevolucion | "">("");
  const [notas, setNotas] = useState("");

  function resetForm() {
    setCondicion("");
    setNotas("");
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

    if (!condicion) {
      setError("Indica en qué condición vuelve la herramienta.");
      return;
    }

    setLoading(true);
    try {
      await devolverHerramientaAction({ unidadId, condicion, notas: notas.trim() || undefined });
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible registrar la devolución.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="gap-1.5">
          <Undo2 className="h-4 w-4" strokeWidth={1.5} />
          Devolver
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-actium border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-semibold">Devolver {unidadCodigo}</DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            {proyectoNombre ? `Cierra el préstamo abierto en ${proyectoNombre}.` : "Cierra el préstamo abierto."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Condición de devolución</Label>
            <Select value={condicion} onValueChange={(v) => setCondicion(v as CondicionDevolucion)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona la condición" />
              </SelectTrigger>
              <SelectContent>
                {CONDICION_OPCIONES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {condicion === "malo" ? (
              <p className="text-xs text-warning">La unidad pasará a mantenimiento en lugar de quedar disponible.</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="devolver-notas">Notas (opcional)</Label>
            <Input id="devolver-notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
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
              Registrar devolución
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
