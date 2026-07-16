"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Play, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  aprobarMovimientoAction,
  rechazarMovimientoAction,
  ejecutarMovimientoAction,
} from "@/lib/actions/presupuesto";
import { formatCOP, formatFechaCorta } from "@/lib/format";
import type { MovimientoEstado, MovimientoTipo } from "@/types/database.types";
import type { MovimientoConUsuarios } from "@/lib/data/presupuesto";

const ESTADO_VARIANT: Record<MovimientoEstado, "info" | "success" | "warning" | "destructive"> = {
  solicitado: "warning",
  aprobado: "info",
  ejecutado: "success",
  rechazado: "destructive",
};

const ESTADO_LABEL: Record<MovimientoEstado, string> = {
  solicitado: "Solicitado",
  aprobado: "Aprobado",
  ejecutado: "Ejecutado",
  rechazado: "Rechazado",
};

const TIPO_LABEL: Record<MovimientoTipo, string> = {
  gasto: "Gasto",
  traslado_entre_rubros: "Traslado",
  ajuste: "Ajuste",
};

export function MovimientosTable({
  movimientos,
  puedeEscribir = false,
}: {
  movimientos: MovimientoConUsuarios[];
  puedeEscribir?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activoId, setActivoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function ejecutarAccion(id: string, accion: (id: string) => Promise<void>) {
    setActivoId(id);
    setError(null);
    startTransition(async () => {
      try {
        await accion(id);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No fue posible completar la acción.");
      } finally {
        setActivoId(null);
      }
    });
  }

  if (movimientos.length === 0) {
    return (
      <p className="rounded-actium border border-dashed border-[--border-subtle] p-8 text-center text-sm text-[--text-secondary]">
        Aún no hay movimientos registrados.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
      ) : null}

      <div className="overflow-x-auto rounded-actium border border-[--border-subtle]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-actium-espresso text-xs font-semibold uppercase tracking-wider text-white">
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3 text-left">Justificación</th>
              <th className="px-4 py-3 text-left">Solicitó</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {movimientos.map((m) => {
              const cargando = isPending && activoId === m.id;
              return (
                <tr key={m.id} className="border-b border-[--border-subtle] hover:bg-[--bg-hover]">
                  <td className="whitespace-nowrap px-4 py-3 text-[--text-secondary]">
                    {formatFechaCorta(m.fecha_efectiva)}
                  </td>
                  <td className="px-4 py-3 text-[--text-primary]">{TIPO_LABEL[m.tipo]}</td>
                  <td className="px-4 py-3 text-right font-medium text-[--text-primary]">
                    {formatCOP(m.monto)}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-[--text-secondary]" title={m.justificacion}>
                    {m.justificacion}
                  </td>
                  <td className="px-4 py-3 text-[--text-secondary]">{m.solicitante?.nombre ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={ESTADO_VARIANT[m.estado]}>{ESTADO_LABEL[m.estado]}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1.5">
                      {puedeEscribir && m.estado === "solicitado" ? (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => ejecutarAccion(m.id, aprobarMovimientoAction)}
                            title="Aprobar"
                          >
                            {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" strokeWidth={1.5} />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isPending}
                            onClick={() => ejecutarAccion(m.id, rechazarMovimientoAction)}
                            title="Rechazar"
                          >
                            <X className="h-4 w-4" strokeWidth={1.5} />
                          </Button>
                        </>
                      ) : null}
                      {puedeEscribir && m.estado === "aprobado" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isPending}
                          onClick={() => ejecutarAccion(m.id, ejecutarMovimientoAction)}
                          title="Ejecutar"
                        >
                          {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" strokeWidth={1.5} />}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
