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
import { PlanCuotasEditor, type CuotaCalculada } from "@/components/finanzas/plan-cuotas-editor";
import { crearCxPAction } from "@/lib/actions/cxp";
import { crearProveedorAction } from "@/lib/actions/proveedores";
import type { Proveedor } from "@/lib/data/proveedores";
import { hoyLocal } from "@/lib/fecha";
import type { Tables } from "@/types/database.types";

export function CxPFormDialog({
  proyectoId,
  rubrosEgreso,
  proveedores,
}: {
  proyectoId: string;
  rubrosEgreso: Pick<Tables<"rubros">, "id" | "nombre" | "codigo">[];
  proveedores: Proveedor[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [listaProveedores, setListaProveedores] = useState(proveedores);
  const [proveedorId, setProveedorId] = useState("");
  const [nuevoProveedor, setNuevoProveedor] = useState(proveedores.length === 0);
  const [nuevoProveedorNombre, setNuevoProveedorNombre] = useState("");
  const [nuevoProveedorNit, setNuevoProveedorNit] = useState("");
  const [guardandoProveedor, setGuardandoProveedor] = useState(false);
  const [errorProveedor, setErrorProveedor] = useState<string | null>(null);

  const [rubroId, setRubroId] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [fechaEmision, setFechaEmision] = useState(hoyLocal());
  const [notas, setNotas] = useState("");
  const [cuotas, setCuotas] = useState<CuotaCalculada[]>([]);

  const proveedorSeleccionado = listaProveedores.find((p) => p.id === proveedorId) ?? null;

  function resetForm() {
    setRubroId("");
    setProveedorId("");
    setNuevoProveedor(listaProveedores.length === 0);
    setNuevoProveedorNombre("");
    setNuevoProveedorNit("");
    setErrorProveedor(null);
    setNumeroFactura("");
    setFechaEmision(hoyLocal());
    setNotas("");
    setCuotas([]);
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next && loading) return;
    setOpen(next);
    if (!next) resetForm();
  }

  async function guardarNuevoProveedor() {
    setErrorProveedor(null);
    if (!nuevoProveedorNombre.trim()) {
      setErrorProveedor("El nombre es obligatorio.");
      return;
    }

    setGuardandoProveedor(true);
    try {
      const proveedor = await crearProveedorAction({
        nombre: nuevoProveedorNombre.trim(),
        nit: nuevoProveedorNit.trim() || undefined,
      });
      setListaProveedores((prev) => [...prev, proveedor].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      setProveedorId(proveedor.id);
      setNuevoProveedor(false);
      setNuevoProveedorNombre("");
      setNuevoProveedorNit("");
    } catch (err) {
      setErrorProveedor(err instanceof Error ? err.message : "No fue posible crear el proveedor.");
    } finally {
      setGuardandoProveedor(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!rubroId) {
      setError("Selecciona el rubro.");
      return;
    }
    if (!proveedorSeleccionado) {
      setError("Selecciona o crea un proveedor.");
      return;
    }
    if (!numeroFactura.trim()) {
      setError("El número de factura es obligatorio.");
      return;
    }
    if (cuotas.length === 0) {
      setError("Define al menos una cuota con monto y fecha.");
      return;
    }

    setLoading(true);
    try {
      await crearCxPAction({
        proyectoId,
        rubroId,
        proveedorNombre: proveedorSeleccionado.nombre,
        proveedorNit: proveedorSeleccionado.nit ?? undefined,
        numeroFactura: numeroFactura.trim(),
        fechaEmision,
        notas: notas.trim() || undefined,
        cuotas,
      });
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear la cuenta por pagar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" strokeWidth={1.5} />
          Nueva factura
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-actium border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-semibold">Nueva cuenta por pagar</DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            Registra una factura recibida de un proveedor y su plan de pagos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <Label>Rubro</Label>
            <Select value={rubroId} onValueChange={setRubroId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el rubro" />
              </SelectTrigger>
              <SelectContent>
                {rubrosEgreso.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.codigo ? `${r.codigo} · ` : ""}
                    {r.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Proveedor</Label>
            {nuevoProveedor ? (
              <div className="flex flex-col gap-2 rounded-xl border border-[--border-subtle] p-3">
                <Input
                  value={nuevoProveedorNombre}
                  onChange={(e) => setNuevoProveedorNombre(e.target.value)}
                  placeholder="Nombre del proveedor"
                  autoFocus
                />
                <Input
                  value={nuevoProveedorNit}
                  onChange={(e) => setNuevoProveedorNit(e.target.value)}
                  placeholder="NIT (opcional)"
                />
                {errorProveedor ? <p className="text-xs text-danger">{errorProveedor}</p> : null}
                <div className="flex justify-end gap-2">
                  {listaProveedores.length > 0 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setNuevoProveedor(false);
                        setErrorProveedor(null);
                      }}
                      disabled={guardandoProveedor}
                    >
                      Cancelar
                    </Button>
                  ) : null}
                  <Button type="button" size="sm" onClick={guardarNuevoProveedor} disabled={guardandoProveedor}>
                    {guardandoProveedor ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Guardar proveedor
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Select value={proveedorId} onValueChange={setProveedorId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona el proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {listaProveedores.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={() => setNuevoProveedor(true)}>
                  <Plus className="h-4 w-4" strokeWidth={1.5} />
                  Nuevo
                </Button>
              </div>
            )}
            {proveedorSeleccionado?.nit ? (
              <p className="text-xs text-[--text-secondary]">NIT: {proveedorSeleccionado.nit}</p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cxp-factura">N.° de factura</Label>
              <Input id="cxp-factura" value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cxp-emision">Fecha de emisión</Label>
              <Input
                id="cxp-emision"
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="cxp-notas">Notas (opcional)</Label>
              <Input id="cxp-notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
            </div>
          </div>

          <PlanCuotasEditor onChange={setCuotas} />

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
              Crear factura
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
