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
import { crearProveedorAction, actualizarProveedorAction } from "@/lib/actions/proveedores";
import type { Proveedor } from "@/lib/data/proveedores";

type Modo = "crear" | "editar";

export function ProveedorFormDialog({ modo, proveedor }: { modo: Modo; proveedor?: Proveedor }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState(proveedor?.nombre ?? "");
  const [nit, setNit] = useState(proveedor?.nit ?? "");

  function resetForm() {
    if (modo === "crear") {
      setNombre("");
      setNit("");
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
      const payload = { nombre: nombre.trim(), nit: nit.trim() || undefined };

      if (modo === "crear") {
        await crearProveedorAction(payload);
      } else if (proveedor) {
        await actualizarProveedorAction({ proveedorId: proveedor.id, ...payload });
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
            Nuevo proveedor
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
            {modo === "crear" ? "Nuevo proveedor" : "Editar proveedor"}
          </DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            Nombre y NIT quedan disponibles para seleccionar al crear una factura.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proveedor-nombre">Nombre</Label>
            <Input id="proveedor-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="proveedor-nit">NIT (opcional)</Label>
            <Input id="proveedor-nit" value={nit} onChange={(e) => setNit(e.target.value)} />
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
              {modo === "crear" ? "Crear proveedor" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
