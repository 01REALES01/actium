"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Loader2, AlertCircle } from "lucide-react";
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
import { crearUnidadAction, editarUnidadAction } from "@/lib/actions/inventario";
import type { Tables } from "@/types/database.types";

type Modo = "crear" | "editar";

export function UnidadFormDialog({
  modo,
  catalogoId,
  unidad,
}: {
  modo: Modo;
  catalogoId: string;
  unidad?: Tables<"herramienta_unidades">;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [codigo, setCodigo] = useState(unidad?.codigo ?? "");
  const [serial, setSerial] = useState(unidad?.serial ?? "");
  const [fechaAdquisicion, setFechaAdquisicion] = useState(unidad?.fecha_adquisicion ?? "");
  const [costoAdquisicion, setCostoAdquisicion] = useState(
    unidad?.costo_adquisicion != null ? String(unidad.costo_adquisicion) : "",
  );
  const [notas, setNotas] = useState(unidad?.notas ?? "");

  function resetForm() {
    if (modo === "crear") {
      setCodigo("");
      setSerial("");
      setFechaAdquisicion("");
      setCostoAdquisicion("");
      setNotas("");
    }
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

    if (!codigo.trim()) {
      setError("El código (placa) es obligatorio.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        codigo: codigo.trim(),
        serial: serial.trim() || undefined,
        fechaAdquisicion: fechaAdquisicion || undefined,
        costoAdquisicion: costoAdquisicion ? Number(costoAdquisicion) : undefined,
        notas: notas.trim() || undefined,
      };

      if (modo === "crear") {
        await crearUnidadAction({ catalogoId, ...payload });
      } else if (unidad) {
        await editarUnidadAction({ unidadId: unidad.id, ...payload });
      }

      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar los cambios.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {modo === "crear" ? (
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            Nueva unidad
          </Button>
        ) : (
          <Button size="sm" variant="ghost" className="gap-1.5">
            <Pencil className="h-4 w-4" strokeWidth={1.5} />
            Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-actium border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-semibold">
            {modo === "crear" ? "Nueva unidad" : "Editar unidad"}
          </DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            Registra la unidad física con su placa interna. Nace en bodega, disponible para asignar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unidad-codigo">Código / placa</Label>
              <Input id="unidad-codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="HRM-0042" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unidad-serial">Serial (opcional)</Label>
              <Input id="unidad-serial" value={serial} onChange={(e) => setSerial(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unidad-fecha">Fecha de adquisición (opcional)</Label>
              <Input
                id="unidad-fecha"
                type="date"
                value={fechaAdquisicion}
                onChange={(e) => setFechaAdquisicion(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="unidad-costo">Costo de adquisición (opcional)</Label>
              <Input
                id="unidad-costo"
                type="number"
                min="0"
                inputMode="decimal"
                value={costoAdquisicion}
                onChange={(e) => setCostoAdquisicion(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="unidad-notas">Notas (opcional)</Label>
              <Input id="unidad-notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
            </div>
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
              {modo === "crear" ? "Crear unidad" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
