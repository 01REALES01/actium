"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownToLine, ArrowUpFromLine, Settings2, Loader2, AlertCircle } from "lucide-react";
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
import { registrarMovimientoEppAction } from "@/lib/actions/inventario";
import { EPP_MOVIMIENTO_OPCIONES } from "@/constants/inventario";
import { hoyLocal } from "@/lib/fecha";
import type { EppMovimientoTipo } from "@/types/database.types";

const ICONO: Record<EppMovimientoTipo, typeof ArrowDownToLine> = {
  ingreso: ArrowDownToLine,
  salida: ArrowUpFromLine,
  ajuste: Settings2,
};

export function EppMovimientoDialog({
  inventarioId,
  itemNombre,
  saldoActual,
}: {
  inventarioId: string;
  itemNombre: string;
  saldoActual: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [tipo, setTipo] = useState<EppMovimientoTipo>("salida");
  const [cantidad, setCantidad] = useState("");
  const [fecha, setFecha] = useState(hoyLocal());
  const [motivo, setMotivo] = useState("");
  const [entregadoA, setEntregadoA] = useState("");

  function resetForm() {
    setTipo("salida");
    setCantidad("");
    setFecha(hoyLocal());
    setMotivo("");
    setEntregadoA("");
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

    const cantidadNum = Number(cantidad);
    if (!cantidad || Number.isNaN(cantidadNum) || cantidadNum === 0) {
      setError("Ingresa una cantidad válida.");
      return;
    }
    if (tipo !== "ajuste" && cantidadNum <= 0) {
      setError("La cantidad debe ser mayor que cero.");
      return;
    }

    setLoading(true);
    try {
      await registrarMovimientoEppAction({
        inventarioId,
        tipo,
        cantidad: cantidadNum,
        fecha,
        motivo: motivo.trim() || undefined,
        entregadoA: entregadoA.trim() || undefined,
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

  const Icono = ICONO[tipo];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <ArrowUpFromLine className="h-4 w-4" strokeWidth={1.5} />
          Movimiento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md rounded-actium border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg font-semibold">Movimiento de {itemNombre}</DialogTitle>
          <DialogDescription className="text-[--text-secondary]">
            Saldo actual: {saldoActual}. El saldo no puede quedar en negativo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as EppMovimientoTipo)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EPP_MOVIMIENTO_OPCIONES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mov-cantidad">
                Cantidad {tipo === "ajuste" ? "(usa negativo para restar)" : ""}
              </Label>
              <Input
                id="mov-cantidad"
                type="number"
                inputMode="numeric"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mov-fecha">Fecha</Label>
              <Input id="mov-fecha" type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
            </div>
          </div>

          {tipo === "salida" ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="mov-entregado">Entregado a (opcional)</Label>
              <Input id="mov-entregado" value={entregadoA} onChange={(e) => setEntregadoA(e.target.value)} />
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mov-motivo">Motivo (opcional)</Label>
            <Input id="mov-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icono className="h-4 w-4" strokeWidth={1.5} />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
