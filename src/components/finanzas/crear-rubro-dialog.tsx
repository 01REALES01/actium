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
import { crearRubroAction } from "@/lib/actions/rubros";
import type { CategoriaFlujo } from "@/types/database.types";

const CATEGORIAS: { value: CategoriaFlujo; label: string }[] = [
  { value: "costos_operativos", label: "Costos operativos" },
  { value: "gastos_administrativos", label: "Gastos administrativos" },
  { value: "gastos_financieros", label: "Gastos financieros" },
  { value: "ingresos", label: "Ingresos" },
];

export function CrearRubroDialog({ proyectoId }: { proyectoId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [categoria, setCategoria] = useState<CategoriaFlujo>("costos_operativos");
  const [codigo, setCodigo] = useState("");
  const [montoMaximo, setMontoMaximo] = useState("");

  function resetForm() {
    setNombre("");
    setDescripcion("");
    setCategoria("costos_operativos");
    setCodigo("");
    setMontoMaximo("");
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
    const monto = Number(montoMaximo);
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      setError("Ingresa un monto máximo válido.");
      return;
    }

    setLoading(true);
    try {
      await crearRubroAction({
        proyectoId,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        categoria,
        codigo: codigo.trim() || undefined,
        montoMaximo: monto,
      });
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear el rubro.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Nuevo rubro
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-actium border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-semibold">Nuevo rubro</DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            Crea una partida presupuestal para este proyecto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="rubro-nombre">Nombre</Label>
              <Input
                id="rubro-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Materiales"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rubro-categoria">Categoría</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as CategoriaFlujo)}>
                <SelectTrigger id="rubro-categoria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rubro-codigo">Código (opcional)</Label>
              <Input
                id="rubro-codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Ej. 2.1"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="rubro-monto">
                {categoria === "ingresos" ? "Meta de ingresos (COP)" : "Techo (monto máximo, COP)"}
              </Label>
              <Input
                id="rubro-monto"
                type="number"
                min={0}
                step="1000"
                value={montoMaximo}
                onChange={(e) => setMontoMaximo(e.target.value)}
                required
              />
              {categoria === "ingresos" ? (
                <p className="text-xs text-[--text-secondary]">
                  Es una meta informativa: registrar cobros nunca se bloquea al superarla.
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="rubro-descripcion">Descripción (opcional)</Label>
              <Input
                id="rubro-descripcion"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
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
              Crear rubro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
