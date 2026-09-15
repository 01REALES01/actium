"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Play, Loader2, Paperclip, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditarFacturaMovimientoDialog } from "@/components/finanzas/editar-factura-movimiento-dialog";
import {
  aprobarMovimientoAction,
  rechazarMovimientoAction,
  ejecutarMovimientoAction,
  getComprobanteUrlAction,
} from "@/lib/actions/presupuesto";
import { formatCOP, formatFechaCorta } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CategoriaFlujo, MovimientoEstado } from "@/types/database.types";
import type { MovimientoConUsuarios } from "@/lib/data/presupuesto";

const ESTADO_VARIANT: Record<
  MovimientoEstado,
  "info" | "success" | "warning" | "destructive" | "secondary"
> = {
  solicitado: "warning",
  aprobado: "info",
  ejecutado: "success",
  rechazado: "destructive",
  anulado: "secondary",
};

const ESTADO_LABEL: Record<MovimientoEstado, string> = {
  solicitado: "Solicitado",
  aprobado: "Aprobado",
  ejecutado: "Ejecutado",
  rechazado: "Rechazado",
  anulado: "Anulado",
};

const CATEGORIA_LABEL: Record<CategoriaFlujo, string> = {
  costos_operativos: "Costos operativos",
  gastos_administrativos: "Gastos administrativos",
  gastos_financieros: "Gastos financieros",
  ingresos: "Ingresos",
};

const CATEGORIA_VARIANT: Record<CategoriaFlujo, "success" | "info" | "warning" | "secondary"> = {
  ingresos: "success",
  costos_operativos: "info",
  gastos_administrativos: "warning",
  gastos_financieros: "secondary",
};

function RubroCell({ movimiento }: { movimiento: MovimientoConUsuarios }) {
  const esTransferencia = Boolean(movimiento.rubro_origen_id) && movimiento.rubro_origen;
  const rubro = movimiento.rubro_destino;

  if (esTransferencia && movimiento.rubro_origen) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-[--text-secondary]">Transferencia</span>
        <span className="text-[--text-primary]">
          {movimiento.rubro_origen.nombre} → {rubro?.nombre ?? "—"}
        </span>
        {rubro?.categoria ? (
          <Badge variant={CATEGORIA_VARIANT[rubro.categoria]} className="w-fit">
            {CATEGORIA_LABEL[rubro.categoria]}
          </Badge>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[--text-primary]">{rubro?.nombre ?? "—"}</span>
      {rubro?.categoria ? (
        <Badge variant={CATEGORIA_VARIANT[rubro.categoria]} className="w-fit">
          {CATEGORIA_LABEL[rubro.categoria]}
        </Badge>
      ) : null}
    </div>
  );
}

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
  const [comprobanteId, setComprobanteId] = useState<string | null>(null);
  const [filtroFactura, setFiltroFactura] = useState("");

  const movimientosFiltrados = useMemo(() => {
    const filtro = filtroFactura.trim().toLowerCase();
    if (!filtro) return movimientos;
    return movimientos.filter((m) => {
      if (m.factura_pendiente && "pendiente".includes(filtro)) return true;
      return (m.numero_factura ?? "").toLowerCase().includes(filtro);
    });
  }, [movimientos, filtroFactura]);

  async function verComprobante(id: string) {
    setComprobanteId(id);
    setError(null);
    try {
      const url = await getComprobanteUrlAction(id);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible abrir el comprobante.");
    } finally {
      setComprobanteId(null);
    }
  }

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
      <div className="relative w-full sm:max-w-xs">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--text-muted]"
          strokeWidth={1.5}
        />
        <Input
          value={filtroFactura}
          onChange={(e) => setFiltroFactura(e.target.value)}
          placeholder="Filtrar por factura"
          className="pl-9"
        />
      </div>

      {error ? (
        <p className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
      ) : null}

      {movimientosFiltrados.length === 0 ? (
        <p className="rounded-actium border border-dashed border-[--border-subtle] p-8 text-center text-sm text-[--text-secondary]">
          No se encontraron movimientos con esa factura.
        </p>
      ) : (
      <div className="overflow-x-auto rounded-actium border border-[--border-subtle]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-actium-espresso text-xs font-semibold uppercase tracking-wider text-white">
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Rubro</th>
              <th className="px-4 py-3 text-right">Monto</th>
              <th className="px-4 py-3 text-left">Notas</th>
              <th className="px-4 py-3 text-left">Solicitó</th>
              <th className="px-4 py-3">Factura</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {movimientosFiltrados.map((m) => {
              const cargando = isPending && activoId === m.id;
              // Un movimiento anulado ya no cuenta en el flujo ni en el techo:
              // se atenúa y se tacha el monto para que se lea de un vistazo.
              const anulado = m.estado === "anulado";
              return (
                <tr
                  key={m.id}
                  className={cn(
                    "border-b border-[--border-subtle] hover:bg-[--bg-hover]",
                    anulado && "opacity-60",
                  )}
                >
                  <td className="whitespace-nowrap px-4 py-3 text-[--text-secondary]">
                    {formatFechaCorta(m.fecha_efectiva)}
                  </td>
                  <td className="px-4 py-3">
                    <RubroCell movimiento={m} />
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-right font-medium text-[--text-primary]",
                      anulado && "line-through",
                    )}
                  >
                    {formatCOP(m.monto)}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-[--text-secondary]" title={m.justificacion}>
                    {m.justificacion}
                  </td>
                  <td className="px-4 py-3 text-[--text-secondary]">{m.solicitante?.nombre ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-center gap-1">
                      {m.factura_pendiente ? (
                        <Badge variant="warning">Pendiente</Badge>
                      ) : m.numero_factura ? (
                        <span className="text-[--text-primary]">{m.numero_factura}</span>
                      ) : (
                        <span className="text-[--text-muted]">—</span>
                      )}
                      <div className="flex items-center gap-1">
                        {puedeEscribir ? (
                          <EditarFacturaMovimientoDialog
                            movimientoId={m.id}
                            numeroFacturaActual={m.numero_factura}
                            facturaPendienteActual={m.factura_pendiente}
                          />
                        ) : null}
                        {m.comprobante_path ? (
                          <button
                            type="button"
                            onClick={() => verComprobante(m.id)}
                            disabled={comprobanteId === m.id}
                            className="inline-flex h-11 w-11 items-center justify-center text-actium-orange transition-colors hover:text-actium-orange-hover disabled:opacity-60"
                            title={m.comprobante_nombre ?? "Ver comprobante"}
                          >
                            {comprobanteId === m.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Paperclip className="h-4 w-4" strokeWidth={1.5} />
                            )}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </td>
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
      )}
    </div>
  );
}
