"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { quincenaDe, TIPOS_EN_FLUJO } from "@/lib/data/flujo-caja";
import { formatCOP, formatMontoContable, formatFechaCorta } from "@/lib/format";
import type { CategoriaFlujo, Tables } from "@/types/database.types";
import type { FlujoCajaData } from "@/lib/data/flujo-caja";

const CATEGORIA_LABEL: Record<CategoriaFlujo, string> = {
  costos_operativos: "1. Costos operativos",
  gastos_administrativos: "2. Gastos administrativos",
  gastos_financieros: "3. Gastos financieros",
  ingresos: "4. Ingresos",
};

function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function colSpan(n: number) {
  return { gridTemplateColumns: `220px repeat(${n}, minmax(110px, 1fr))` };
}

/** Celda que muestra valor real y/o proyectado. */
function CeldaValor({
  real,
  proyectado,
  onClick,
}: {
  real: number;
  proyectado: number;
  onClick?: () => void;
}) {
  const tieneReal = real !== 0;
  const tieneProyectado = proyectado !== 0;

  if (!tieneReal && !tieneProyectado) {
    return (
      <button
        type="button"
        disabled
        className="px-3 py-2 text-right text-[--text-muted] disabled:cursor-default"
      >
        —
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-end px-3 py-1.5 text-right transition-colors hover:bg-actium-orange/10"
    >
      {tieneReal && (
        <span className={real < 0 ? "text-danger text-sm" : "text-success text-sm"}>
          {formatMontoContable(real)}
        </span>
      )}
      {tieneProyectado && (
        <span
          className={
            "text-xs italic opacity-90 " + (proyectado < 0 ? "text-warning" : "text-info")
          }
        >
          {formatMontoContable(proyectado)}
        </span>
      )}
    </button>
  );
}

export function FlujoCajaTable({
  data,
  movimientos,
}: {
  data: FlujoCajaData;
  movimientos: Tables<"movimientos">[];
}) {
  const [celda, setCelda] = useState<{ rubroId: string; rubroNombre: string; quincena: string } | null>(null);

  // Mismo criterio que vw_flujo_caja_quincenal (ejecutados, y solo los tipos que
  // mueven caja) para que el detalle cuadre con el total de la celda. Quedan
  // fuera los anulados por anulación de su factura y los ajustes de techo.
  const movimientosDeCelda = celda
    ? movimientos.filter(
        (m) =>
          m.estado === "ejecutado" &&
          TIPOS_EN_FLUJO.includes(m.tipo) &&
          m.rubro_destino_id === celda.rubroId &&
          quincenaDe(parseISODate(m.fecha_efectiva)) === celda.quincena,
      )
    : [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4 flex-wrap text-xs text-[--text-secondary]">
        <p>Mostrando {data.quincenas.length} quincenas. Las categorías inician colapsadas.</p>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm bg-info/70" />
          Cobro proyectado
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm bg-warning/70" />
          Pago proyectado
        </span>
      </div>

      <div className="overflow-x-auto rounded-actium border border-[--border-subtle]">
        <div className="min-w-max">
          {/* Encabezado */}
          <div
            className="grid border-b border-[--border-subtle] bg-actium-espresso text-xs font-semibold uppercase tracking-wider text-white"
            style={colSpan(data.quincenas.length)}
          >
            <div className="sticky left-0 z-10 bg-actium-espresso px-4 py-3">Rubro</div>
            {data.quincenas.map((q) => (
              <div key={q} className="px-3 py-3 text-right">
                {formatFechaCorta(q)}
              </div>
            ))}
          </div>

          {/* Categorías */}
          {data.categorias.map((cat) => (
            <details key={cat.categoria} className="group border-b border-[--border-subtle] last:border-b-0">
              <summary
                className="grid cursor-pointer list-none items-center bg-[--bg-hover] font-sans text-sm font-semibold text-[--text-primary] [&::-webkit-details-marker]:hidden"
                style={colSpan(data.quincenas.length)}
              >
                <div className="sticky left-0 z-10 flex items-center gap-2 bg-[--bg-hover] px-4 py-2.5">
                  <ChevronRight className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90" strokeWidth={1.5} />
                  {CATEGORIA_LABEL[cat.categoria]}
                </div>
                {cat.totalPorQuincena.map((real, i) => {
                  const q = data.quincenas[i];
                  const proyectado = cat.rubros.reduce(
                    (sum, r) => sum + (data.proyectado[`${r.id}|${q}`] ?? 0),
                    0,
                  );
                  const tieneProyectado = proyectado !== 0;
                  const total = real + (tieneProyectado ? proyectado : 0);
                  return (
                    <div
                      key={q}
                      className={
                        "px-3 py-2.5 text-right " +
                        (tieneProyectado
                          ? proyectado < 0
                            ? "text-warning"
                            : "text-info"
                          : total < 0
                          ? "text-danger"
                          : total > 0
                          ? "text-success"
                          : "text-[--text-muted]")
                      }
                    >
                      {formatMontoContable(total)}
                    </div>
                  );
                })}
              </summary>

              {cat.rubros.map((r) => (
                <div
                  key={r.id}
                  className="grid border-t border-[--border-subtle]/60 text-sm"
                  style={colSpan(data.quincenas.length)}
                >
                  <div className="sticky left-0 z-10 bg-[--bg-elevated] px-4 py-2 pl-9 text-[--text-secondary]">
                    {r.codigo ? `${r.codigo} · ` : ""}
                    {r.nombre}
                  </div>
                  {data.quincenas.map((q, i) => {
                    const real = r.valoresPorQuincena[i];
                    const proyectado = data.proyectado[`${r.id}|${q}`] ?? 0;
                    return (
                      <CeldaValor
                        key={q}
                        real={real}
                        proyectado={proyectado}
                        onClick={
                          real !== 0
                            ? () => setCelda({ rubroId: r.id, rubroNombre: r.nombre, quincena: q })
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </details>
          ))}

          {/* Totales */}
          {(() => {
            // Proyectado total por quincena (suma de todos los rubros)
            const proyectadoPorQuincena = data.quincenas.map((q) => {
              let suma = 0;
              for (const cat of data.categorias) {
                for (const r of cat.rubros) {
                  suma += data.proyectado[`${r.id}|${q}`] ?? 0;
                }
              }
              return suma;
            });

            // Saldo combinado (real + proyectado) y acumulado proyectado
            const saldoCombinado = data.quincenas.map(
              (_, i) => data.saldoPorQuincena[i] + proyectadoPorQuincena[i],
            );
            const acumuladoConProyectado: number[] = [];
            saldoCombinado.reduce((acc, s, i) => {
              acumuladoConProyectado[i] = acc + s;
              return acc + s;
            }, 0);

            return (
              <>
                <div className="grid border-t-2 border-[--border-default] text-sm" style={colSpan(data.quincenas.length)}>
                  <div className="sticky left-0 z-10 bg-[--bg-elevated] px-4 py-2 font-medium text-[--text-primary]">
                    Total egresos
                  </div>
                  {data.totalEgresosPorQuincena.map((v, i) => (
                    <div key={data.quincenas[i]} className="px-3 py-2 text-right text-danger">
                      {formatMontoContable(v)}
                    </div>
                  ))}
                </div>
                <div className="grid text-sm" style={colSpan(data.quincenas.length)}>
                  <div className="sticky left-0 z-10 bg-[--bg-elevated] px-4 py-2 font-medium text-[--text-primary]">
                    Ingresos
                  </div>
                  {data.ingresosPorQuincena.map((v, i) => (
                    <div key={data.quincenas[i]} className="px-3 py-2 text-right text-success">
                      {formatMontoContable(v)}
                    </div>
                  ))}
                </div>
                <div className="grid border-t border-[--border-subtle] text-sm font-semibold" style={colSpan(data.quincenas.length)}>
                  <div className="sticky left-0 z-10 bg-[--bg-elevated] px-4 py-2 text-[--text-primary]">
                    Saldo del periodo
                  </div>
                  {saldoCombinado.map((v, i) => {
                    const tieneProyectado = proyectadoPorQuincena[i] !== 0;
                    return (
                      <div
                        key={data.quincenas[i]}
                        className={
                          "px-3 py-2 text-right " +
                          (tieneProyectado ? "text-info" : v < 0 ? "text-danger" : "text-success")
                        }
                      >
                        {formatMontoContable(v)}
                      </div>
                    );
                  })}
                </div>
                <div
                  className="grid border-t-2 border-actium-amber bg-[--bg-elevated] py-1"
                  style={colSpan(data.quincenas.length)}
                >
                  <div className="sticky left-0 z-10 bg-[--bg-elevated] px-4 py-2 font-display text-base text-actium-amber">
                    Saldo en banco
                  </div>
                  {data.flujoAcumulado.map((v, i) => (
                    <div
                      key={data.quincenas[i]}
                      className={
                        "px-3 py-2 text-right font-display text-base " +
                        (v < 0 ? "text-danger" : "text-actium-amber")
                      }
                    >
                      {formatMontoContable(v)}
                    </div>
                  ))}
                </div>
                <div
                  className="sticky bottom-0 grid border-t-2 border-actium-orange bg-[--bg-elevated] py-1"
                  style={colSpan(data.quincenas.length)}
                >
                  <div className="sticky left-0 z-10 bg-[--bg-elevated] px-4 py-2 font-display text-base text-actium-orange">
                    Flujo de caja acumulado
                  </div>
                  {acumuladoConProyectado.map((v, i) => {
                    const tieneProyectado = proyectadoPorQuincena[i] !== 0 ||
                      (i > 0 && proyectadoPorQuincena.slice(0, i).some((p) => p !== 0));
                    return (
                      <div
                        key={data.quincenas[i]}
                        className={
                          "px-3 py-2 text-right font-display text-base " +
                          (v < 0 ? "text-danger" : tieneProyectado ? "text-info" : "text-actium-orange")
                        }
                      >
                        {formatMontoContable(v)}
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      <Sheet open={celda !== null} onOpenChange={(open) => !open && setCelda(null)}>
        <SheetContent className="border-[--border-subtle] bg-[--bg-elevated] text-[--text-primary]">
          <SheetHeader>
            <SheetTitle className="font-sans">{celda?.rubroNombre}</SheetTitle>
            <SheetDescription className="text-[--text-secondary]">
              Movimientos de la quincena {celda ? formatFechaCorta(celda.quincena) : ""}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 flex flex-col gap-2">
            {movimientosDeCelda.length === 0 ? (
              <p className="text-sm text-[--text-secondary]">Sin movimientos en este periodo.</p>
            ) : (
              movimientosDeCelda.map((m) => (
                <div key={m.id} className="rounded-lg border border-[--border-subtle] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[--text-primary]">{formatCOP(m.monto)}</span>
                    <span className="text-xs text-[--text-secondary]">{formatFechaCorta(m.fecha_efectiva)}</span>
                  </div>
                  <p className="mt-1 text-xs text-[--text-secondary]">{m.justificacion}</p>
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
