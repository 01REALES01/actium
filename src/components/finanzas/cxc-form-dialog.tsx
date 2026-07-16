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
import { crearCxCAction } from "@/lib/actions/cxc";
import { hoyLocal } from "@/lib/fecha";
import { formatCOP } from "@/lib/format";
import type { CuotaPeriodicidad, Tables } from "@/types/database.types";

export function CxCFormDialog({
  proyectoId,
  rubrosIngreso,
}: {
  proyectoId: string;
  rubrosIngreso: Pick<Tables<"rubros">, "id" | "nombre" | "codigo">[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rubroId, setRubroId] = useState("");
  const [clienteNombre, setClienteNombre] = useState("");
  const [clienteNit, setClienteNit] = useState("");
  const [numeroFactura, setNumeroFactura] = useState("");
  const [montoTotal, setMontoTotal] = useState("");
  const [fechaEmision, setFechaEmision] = useState(hoyLocal());
  const [numeroCuotas, setNumeroCuotas] = useState("1");
  const [periodicidad, setPeriodicidad] = useState<CuotaPeriodicidad>("mensual");
  const [fechaPrimeraCuota, setFechaPrimeraCuota] = useState(hoyLocal());
  const [notas, setNotas] = useState("");

  const numCuotasNum = Math.max(1, Number(numeroCuotas) || 1);
  const montoPorCuota = Number(montoTotal) > 0 ? Number(montoTotal) / numCuotasNum : 0;

  function resetForm() {
    setRubroId("");
    setClienteNombre("");
    setClienteNit("");
    setNumeroFactura("");
    setMontoTotal("");
    setFechaEmision(hoyLocal());
    setNumeroCuotas("1");
    setPeriodicidad("mensual");
    setFechaPrimeraCuota(hoyLocal());
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
    const monto = Number(montoTotal);

    if (!rubroId) {
      setError("Selecciona el rubro de ingresos.");
      return;
    }
    if (!clienteNombre.trim() || !numeroFactura.trim()) {
      setError("Cliente y número de factura son obligatorios.");
      return;
    }
    if (!Number.isFinite(monto) || monto <= 0) {
      setError("Ingresa un monto válido.");
      return;
    }
    if (numCuotasNum < 1) {
      setError("El número de cuotas debe ser al menos 1.");
      return;
    }

    setLoading(true);
    try {
      await crearCxCAction({
        proyectoId,
        rubroId,
        clienteNombre: clienteNombre.trim(),
        clienteNit: clienteNit.trim() || undefined,
        numeroFactura: numeroFactura.trim(),
        montoTotal: monto,
        fechaEmision,
        numeroCuotas: numCuotasNum,
        periodicidad,
        fechaPrimeraCuota,
        notas: notas.trim() || undefined,
      });
      setOpen(false);
      resetForm();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible crear la cuenta por cobrar.");
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
          <DialogTitle className="font-sans text-lg font-semibold">Nueva cuenta por cobrar</DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            Registra una factura emitida a un cliente y su plan de pagos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto">
          <div className="flex flex-col gap-1.5">
            <Label>Rubro de ingresos</Label>
            <Select value={rubroId} onValueChange={setRubroId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona el rubro" />
              </SelectTrigger>
              <SelectContent>
                {rubrosIngreso.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.codigo ? `${r.codigo} · ` : ""}
                    {r.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {rubrosIngreso.length === 0 ? (
              <p className="text-xs text-warning">
                Este proyecto no tiene rubros de categoría Ingresos. Crea uno primero.
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="cxc-cliente">Cliente</Label>
              <Input id="cxc-cliente" value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cxc-nit">NIT (opcional)</Label>
              <Input id="cxc-nit" value={clienteNit} onChange={(e) => setClienteNit(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cxc-factura">N.° de factura</Label>
              <Input id="cxc-factura" value={numeroFactura} onChange={(e) => setNumeroFactura(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="cxc-monto">Monto total (COP)</Label>
              <Input
                id="cxc-monto"
                type="number"
                min={0}
                step="1000"
                value={montoTotal}
                onChange={(e) => setMontoTotal(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cxc-emision">Fecha de emisión</Label>
              <Input
                id="cxc-emision"
                type="date"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="cxc-notas">Notas (opcional)</Label>
              <Input id="cxc-notas" value={notas} onChange={(e) => setNotas(e.target.value)} />
            </div>
          </div>

          <div className="rounded-lg border border-[--border-subtle] p-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[--text-secondary]">
              Plan de pagos
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cxc-num-cuotas">Número de cuotas</Label>
                <Input
                  id="cxc-num-cuotas"
                  type="number"
                  min={1}
                  max={60}
                  step="1"
                  value={numeroCuotas}
                  onChange={(e) => setNumeroCuotas(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Periodicidad</Label>
                <Select
                  value={periodicidad}
                  onValueChange={(v) => setPeriodicidad(v as CuotaPeriodicidad)}
                  disabled={numCuotasNum <= 1}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quincenal">Quincenal</SelectItem>
                    <SelectItem value="mensual">Mensual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="cxc-primera-cuota">Fecha de la primera cuota</Label>
                <Input
                  id="cxc-primera-cuota"
                  type="date"
                  value={fechaPrimeraCuota}
                  onChange={(e) => setFechaPrimeraCuota(e.target.value)}
                  required
                />
              </div>
            </div>
            {numCuotasNum > 1 && montoPorCuota > 0 ? (
              <p className="mt-3 text-xs text-[--text-secondary]">
                {numCuotasNum} cuotas de aprox. {formatCOP(montoPorCuota)}, cada{" "}
                {periodicidad === "quincenal" ? "15 días" : "mes"}.
              </p>
            ) : null}
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
            <Button type="submit" disabled={loading || rubrosIngreso.length === 0}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Crear factura
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
