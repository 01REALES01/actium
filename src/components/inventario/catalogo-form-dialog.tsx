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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { crearCatalogoAction, editarCatalogoAction } from "@/lib/actions/inventario";
import { CATEGORIAS_HERRAMIENTA } from "@/constants/inventario";
import type { Tables } from "@/types/database.types";

type Modo = "crear" | "editar";

export function CatalogoFormDialog({
  modo,
  catalogo,
}: {
  modo: Modo;
  catalogo?: Tables<"herramientas_catalogo">;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState(catalogo?.nombre ?? "");
  const [categoria, setCategoria] = useState(catalogo?.categoria ?? "");
  const [marca, setMarca] = useState(catalogo?.marca ?? "");
  const [unidadMedida, setUnidadMedida] = useState(catalogo?.unidad_medida ?? "UND.");
  const [descripcion, setDescripcion] = useState(catalogo?.descripcion ?? "");

  function resetForm() {
    if (modo === "crear") {
      setNombre("");
      setCategoria("");
      setMarca("");
      setUnidadMedida("UND.");
      setDescripcion("");
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

    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nombre: nombre.trim(),
        categoria: categoria || undefined,
        marca: marca.trim() || undefined,
        unidadMedida: unidadMedida || undefined,
        descripcion: descripcion.trim() || undefined,
      };

      if (modo === "crear") {
        await crearCatalogoAction(payload);
      } else if (catalogo) {
        await editarCatalogoAction({ catalogoId: catalogo.id, ...payload });
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
            Nueva herramienta
          </Button>
        ) : (
          <Button size="sm" variant="secondary" className="gap-1.5">
            <Pencil className="h-4 w-4" strokeWidth={1.5} />
            Editar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-actium border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-semibold">
            {modo === "crear" ? "Nuevo tipo de herramienta" : "Editar tipo de herramienta"}
          </DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            Da de alta el modelo en el catálogo maestro de Actium. Las unidades físicas se agregan después.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="catalogo-nombre">Nombre</Label>
            <Input
              id="catalogo-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Pulidora Bosch GWS 9&quot;"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Categoría (opcional)</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_HERRAMIENTA.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="catalogo-marca">Marca (opcional)</Label>
              <Input id="catalogo-marca" value={marca} onChange={(e) => setMarca(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Unidad de medida</Label>
              <Select value={unidadMedida} onValueChange={setUnidadMedida}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UND.">UND.</SelectItem>
                  <SelectItem value="PAR.">PAR.</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="catalogo-descripcion">Descripción (opcional)</Label>
              <Input id="catalogo-descripcion" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
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
              {modo === "crear" ? "Crear tipo" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
