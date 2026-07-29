"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCOP } from "@/lib/format";
import { hoyLocal } from "@/lib/fecha";
import type { CuotaPeriodicidad } from "@/types/database.types";

export type CuotaCalculada = { monto: number; fecha: string };

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function fromISO(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function fechaCuota(primera: string, indice: number, periodicidad: CuotaPeriodicidad): string {
  const base = fromISO(primera);
  if (periodicidad === "quincenal") {
    base.setDate(base.getDate() + indice * 15);
  } else {
    base.setMonth(base.getMonth() + indice);
  }
  return toISO(base);
}

/** Genera N cuotas equivalentes: la última absorbe el remanente del redondeo. */
function generarCuotas(
  total: number,
  n: number,
  periodicidad: CuotaPeriodicidad,
  primera: string,
): { monto: string; fecha: string }[] {
  const base = Math.floor(total / n);
  const filas: { monto: string; fecha: string }[] = [];
  let acumulado = 0;
  for (let i = 0; i < n; i++) {
    const monto = i === n - 1 ? total - acumulado : base;
    acumulado += base;
    filas.push({ monto: monto > 0 ? String(monto) : "", fecha: fechaCuota(primera, i, periodicidad) });
  }
  return filas;
}

/**
 * Editor de plan de pagos. El usuario indica monto total, número de cuotas,
 * periodicidad y fecha de la primera; se generan cuotas equivalentes con sus
 * fechas y luego puede editar el monto o la fecha de cada una antes de guardar.
 * Notifica al padre con el arreglo de cuotas ya parseado.
 */
export function PlanCuotasEditor({
  onChange,
}: {
  onChange: (cuotas: CuotaCalculada[]) => void;
}) {
  const [montoTotal, setMontoTotal] = useState("");
  const [numeroCuotas, setNumeroCuotas] = useState("1");
  const [periodicidad, setPeriodicidad] = useState<CuotaPeriodicidad>("mensual");
  const [fechaPrimera, setFechaPrimera] = useState(hoyLocal());
  const [filas, setFilas] = useState<{ monto: string; fecha: string }[]>([
    { monto: "", fecha: hoyLocal() },
  ]);

  function emitir(nuevas: { monto: string; fecha: string }[]) {
    onChange(
      nuevas
        .map((f) => ({ monto: Number(f.monto), fecha: f.fecha }))
        .filter((c) => Number.isFinite(c.monto) && c.monto > 0 && !!c.fecha),
    );
  }

  function regenerar(total: string, n: string, per: CuotaPeriodicidad, primera: string) {
    const totalNum = Number(total);
    const nNum = Math.max(1, Math.min(60, Math.floor(Number(n) || 1)));
    if (!Number.isFinite(totalNum) || totalNum <= 0) {
      const vacias = Array.from({ length: nNum }, (_, i) => ({
        monto: "",
        fecha: fechaCuota(primera, i, per),
      }));
      setFilas(vacias);
      emitir(vacias);
      return;
    }
    const nuevas = generarCuotas(totalNum, nNum, per, primera);
    setFilas(nuevas);
    emitir(nuevas);
  }

  function editarFila(indice: number, campo: "monto" | "fecha", valor: string) {
    const nuevas = filas.map((f, i) => (i === indice ? { ...f, [campo]: valor } : f));
    setFilas(nuevas);
    emitir(nuevas);
  }

  const suma = filas.reduce((s, f) => s + (Number(f.monto) || 0), 0);

  return (
    <div className="rounded-lg border border-[--border-subtle] p-3">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-[--text-secondary]">
        Plan de pagos
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="plan-total">Monto total (COP)</Label>
          <Input
            id="plan-total"
            type="number"
            min={0}
            step="any"
            value={montoTotal}
            onChange={(e) => {
              setMontoTotal(e.target.value);
              regenerar(e.target.value, numeroCuotas, periodicidad, fechaPrimera);
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="plan-num">Número de cuotas</Label>
          <Input
            id="plan-num"
            type="number"
            min={1}
            max={60}
            step="1"
            value={numeroCuotas}
            onChange={(e) => {
              setNumeroCuotas(e.target.value);
              regenerar(montoTotal, e.target.value, periodicidad, fechaPrimera);
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Periodicidad</Label>
          <Select
            value={periodicidad}
            onValueChange={(v) => {
              const per = v as CuotaPeriodicidad;
              setPeriodicidad(per);
              regenerar(montoTotal, numeroCuotas, per, fechaPrimera);
            }}
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="plan-primera">Fecha de la primera cuota</Label>
          <Input
            id="plan-primera"
            type="date"
            value={fechaPrimera}
            onChange={(e) => {
              setFechaPrimera(e.target.value);
              regenerar(montoTotal, numeroCuotas, periodicidad, e.target.value);
            }}
          />
        </div>
      </div>

      {filas.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          <p className="text-xs text-[--text-muted]">
            Puede ajustar el monto y la fecha de cada cuota antes de guardar.
          </p>
          {filas.map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-8 shrink-0 text-xs text-[--text-secondary]">#{i + 1}</span>
              <Input
                type="number"
                min={0}
                step="any"
                value={f.monto}
                onChange={(e) => editarFila(i, "monto", e.target.value)}
                placeholder="Monto"
                className="flex-1"
              />
              <Input
                type="date"
                value={f.fecha}
                onChange={(e) => editarFila(i, "fecha", e.target.value)}
                className="flex-1"
              />
            </div>
          ))}
          <div className="mt-1 flex justify-between text-xs">
            <span className="text-[--text-secondary]">Suma de cuotas</span>
            <span className="font-semibold text-[--text-primary]">{formatCOP(suma)}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
