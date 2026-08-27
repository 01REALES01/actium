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
import { crearItemEppAction, editarItemEppAction } from "@/lib/actions/inventario";
import type { EppSaldoRow } from "@/lib/data/inventario";

type Modo = "crear" | "editar";

export function EppItemFormDialog({
  modo,
  proyectoId,
  item,
}: {
  modo: Modo;
  proyectoId: string;
  item?: EppSaldoRow;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState(item?.nombre ?? "");
  const [unidad, setUnidad] = useState<"UND." | "PAR.">((item?.unidad as "UND." | "PAR.") ?? "UND.");
  const [talla, setTalla] = useState(item?.talla ?? "");
  const [stockMinimo, setStockMinimo] = useState(item?.stock_minimo != null ? String(item.stock_minimo) : "0");

  function resetForm() {
    if (modo === "crear") {
      setNombre("");
      setUnidad("UND.");
      setTalla("");
      setStockMinimo("0");
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
      setError("El nombre del elemento es obligatorio.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nombre: nombre.trim(),
        unidad,
        talla: talla.trim() || undefined,
        stockMinimo: stockMinimo ? Number(stockMinimo) : 0,
      };

      if (modo === "crear") {
        await crearItemEppAction({ proyectoId, ...payload });
      } else if (item) {
        await editarItemEppAction({ inventarioId: item.inventario_id!, ...payload });
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
            Nuevo elemento
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
            {modo === "crear" ? "Nuevo elemento de EPP" : "Editar elemento de EPP"}
          </DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            El saldo se calcula solo a partir de los ingresos y salidas que registres.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="epp-nombre">Nombre</Label>
            <Input id="epp-nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Casco" required />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label>Unidad</Label>
              <Select value={unidad} onValueChange={(v) => setUnidad(v as "UND." | "PAR.")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UND.">UND.</SelectItem>
                  <SelectItem value="PAR.">PAR.</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="epp-talla">Talla (opcional)</Label>
              <Input id="epp-talla" value={talla} onChange={(e) => setTalla(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="epp-minimo">Stock mínimo</Label>
              <Input
                id="epp-minimo"
                type="number"
                min="0"
                inputMode="numeric"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
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
              {modo === "crear" ? "Crear elemento" : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
