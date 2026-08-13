"use client";

import { formatFechaCorta, formatFechaLarga, formatMontoContable } from "@/lib/format";
import type { FlujoCajaAgregado, RubroDesglose } from "@/lib/data/flujo-caja";
import type { CategoriaFlujo } from "@/types/database.types";
import { HoverTooltip } from "@/components/ui/hover-tooltip";

const CATEGORIA_LABEL: Record<CategoriaFlujo, string> = {
  costos_operativos: "1. Costos operativos",
  gastos_administrativos: "2. Gastos administrativos",
  gastos_financieros: "3. Gastos financieros",
  ingresos: "4. Ingresos",
};

const MAX_RUBROS_TOOLTIP = 5;

function colSpan(n: number) {
  return { gridTemplateColumns: `200px repeat(${n}, minmax(110px, 1fr))` };
}

/** Contenido del cuadrito de desglose por rubro para una celda categoría x quincena. */
function DesgloseTooltip({
  etiqueta,
  quincena,
  rubros,
}: {
  etiqueta: string;
  quincena: string;
  rubros: RubroDesglose[];
}) {
  const visibles = rubros.slice(0, MAX_RUBROS_TOOLTIP);
  const restantes = rubros.length - visibles.length;

  return (
    <div>
      <p className="font-subtitle font-semibold text-[--text-primary]">{etiqueta}</p>
      <p className="text-[--text-muted]">{formatFechaLarga(quincena)}</p>
      {visibles.length > 0 ? (
        <div className="mt-2 space-y-2 border-t border-[--border-subtle] pt-2">
          {visibles.map((r, idx) => (
            <div key={`${r.proyectoNombre}-${r.nombre}-${idx}`}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[--text-secondary]">{r.nombre}</span>
                <span className="text-[--text-muted]">{r.proyectoNombre}</span>
              </div>
              {r.real !== 0 && (
                <div className="flex items-baseline justify-between gap-3 pl-2">
                  <span className="text-[--text-muted]">Real (ejecutado)</span>
                  <span className={r.real < 0 ? "text-danger" : "text-success"}>
                    {formatMontoContable(r.real)}
                  </span>
                </div>
              )}
              {r.proyectado !== 0 && (
                <div className="flex items-baseline justify-between gap-3 pl-2">
                  <span className="text-[--text-muted]">Proyectado (pendiente)</span>
                  <span className={"italic " + (r.proyectado < 0 ? "text-warning" : "text-info")}>
                    {formatMontoContable(r.proyectado)}
                  </span>
                </div>
              )}
            </div>
          ))}
          {restantes > 0 && (
            <p className="pt-0.5 text-[--text-muted]">+ {restantes} rubro{restantes > 1 ? "s" : ""} más</p>
          )}
        </div>
      ) : (
        <p className="mt-2 border-t border-[--border-subtle] pt-2 text-[--text-muted]">
          Sin movimientos registrados.
        </p>
      )}
    </div>
  );
}

/** Celda simple (fila calculada) con tooltip de contexto, sin desglose por rubro. */
function InfoTooltip({ etiqueta, quincena, detalle }: { etiqueta: string; quincena: string; detalle: React.ReactNode }) {
  return (
    <div>
      <p className="font-subtitle font-semibold text-[--text-primary]">{etiqueta}</p>
      <p className="text-[--text-muted]">{formatFechaLarga(quincena)}</p>
      <div className="mt-2 space-y-1 border-t border-[--border-subtle] pt-2">{detalle}</div>
    </div>
  );
}

function DetalleRow({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[--text-secondary]">{label}</span>
      <span className={className}>{formatMontoContable(value)}</span>
    </div>
  );
}

export function FlujoCajaGlobalTable({ data }: { data: FlujoCajaAgregado }) {
  const ingresosCat = data.categorias.find((c) => c.categoria === "ingresos");
  const egresoCategorias = data.categorias.filter((c) => c.categoria !== "ingresos");

  return (
    <div className="overflow-x-auto rounded-actium border border-[--border-subtle]">
      <div className="min-w-max">
        {/* Encabezado */}
        <div
          className="grid border-b border-[--border-subtle] bg-actium-espresso text-xs font-semibold uppercase tracking-wider text-white"
          style={colSpan(data.quincenas.length)}
        >
          <div className="sticky left-0 z-10 bg-actium-espresso px-4 py-3">Categoría</div>
          {data.quincenas.map((q) => (
            <div key={q} className="px-3 py-3 text-right">
              {formatFechaCorta(q)}
            </div>
          ))}
        </div>

        {/* Filas por categoría */}
        {data.categorias.map((cat) => (
          <div
            key={cat.categoria}
            className="grid border-b border-[--border-subtle] bg-[--bg-hover] text-sm font-semibold last:border-b-0"
            style={colSpan(data.quincenas.length)}
          >
            <div className="sticky left-0 z-10 bg-[--bg-hover] px-4 py-2.5 text-[--text-primary]">
              {CATEGORIA_LABEL[cat.categoria]}
            </div>
            {cat.totalPorQuincena.map((real, i) => {
              const proyectado = cat.proyectadoPorQuincena[i];
              const tieneProyectado = proyectado !== 0;
              const quincena = data.quincenas[i];
              return (
                <HoverTooltip
                  key={quincena}
                  content={
                    <DesgloseTooltip
                      etiqueta={CATEGORIA_LABEL[cat.categoria]}
                      quincena={quincena}
                      rubros={cat.rubrosPorQuincena[i]}
                    />
                  }
                >
                  <div className="flex flex-col items-end justify-center px-3 py-2">
                    {real !== 0 && (
                      <span className={real < 0 ? "text-danger" : "text-success"}>
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
                    {real === 0 && !tieneProyectado && (
                      <span className="text-[--text-muted]">—</span>
                    )}
                  </div>
                </HoverTooltip>
              );
            })}
          </div>
        ))}

        {/* Total egresos */}
        <div
          className="grid border-t-2 border-[--border-default] text-sm"
          style={colSpan(data.quincenas.length)}
        >
          <div className="sticky left-0 z-10 bg-[--bg-elevated] px-4 py-2 font-medium text-[--text-primary]">
            Total egresos
          </div>
          {data.totalEgresosPorQuincena.map((v, i) => {
            const quincena = data.quincenas[i];
            const rubrosEgreso = egresoCategorias
              .flatMap((c) => c.rubrosPorQuincena[i])
              .sort((a, b) => Math.abs(b.real + b.proyectado) - Math.abs(a.real + a.proyectado));
            return (
              <HoverTooltip
                key={quincena}
                content={
                  <div>
                    <DesgloseTooltip etiqueta="Total egresos" quincena={quincena} rubros={rubrosEgreso} />
                    <div className="mt-2 space-y-1 border-t border-[--border-subtle] pt-2">
                      {egresoCategorias.map((c) => (
                        <DetalleRow
                          key={c.categoria}
                          label={CATEGORIA_LABEL[c.categoria]}
                          value={c.totalPorQuincena[i]}
                          className="text-danger"
                        />
                      ))}
                    </div>
                  </div>
                }
              >
                <div className="flex items-center justify-end px-3 py-2 text-danger">
                  {formatMontoContable(v)}
                </div>
              </HoverTooltip>
            );
          })}
        </div>

        {/* Ingresos */}
        <div className="grid text-sm" style={colSpan(data.quincenas.length)}>
          <div className="sticky left-0 z-10 bg-[--bg-elevated] px-4 py-2 font-medium text-[--text-primary]">
            Ingresos
          </div>
          {data.ingresosPorQuincena.map((v, i) => {
            const quincena = data.quincenas[i];
            return (
              <HoverTooltip
                key={quincena}
                content={
                  <DesgloseTooltip
                    etiqueta="Ingresos"
                    quincena={quincena}
                    rubros={ingresosCat?.rubrosPorQuincena[i] ?? []}
                  />
                }
              >
                <div className="flex items-center justify-end px-3 py-2 text-success">
                  {formatMontoContable(v)}
                </div>
              </HoverTooltip>
            );
          })}
        </div>

        {/* Saldo del periodo */}
        <div
          className="grid border-t border-[--border-subtle] text-sm font-semibold"
          style={colSpan(data.quincenas.length)}
        >
          <div className="sticky left-0 z-10 bg-[--bg-elevated] px-4 py-2 text-[--text-primary]">
            Saldo del periodo
          </div>
          {data.saldoPorQuincena.map((v, i) => {
            const proy = data.totalProyectadoPorQuincena[i];
            const tieneProyectado = proy !== 0;
            const vMostrar = tieneProyectado ? v + proy : v;
            const quincena = data.quincenas[i];
            return (
              <HoverTooltip
                key={quincena}
                content={
                  <InfoTooltip
                    etiqueta="Saldo del periodo"
                    quincena={quincena}
                    detalle={
                      <>
                        <DetalleRow label="Ingresos" value={data.ingresosPorQuincena[i]} className="text-success" />
                        <DetalleRow label="Total egresos" value={data.totalEgresosPorQuincena[i]} className="text-danger" />
                        {tieneProyectado && (
                          <DetalleRow label="Proyectado" value={proy} className="text-info" />
                        )}
                      </>
                    }
                  />
                }
              >
                <div
                  className={
                    "flex items-center justify-end px-3 py-2 " +
                    (tieneProyectado ? "text-info" : vMostrar < 0 ? "text-danger" : "text-success")
                  }
                >
                  {formatMontoContable(vMostrar)}
                </div>
              </HoverTooltip>
            );
          })}
        </div>

        {/* Saldo en banco (sin proyectados) */}
        <div
          className="grid border-t-2 border-actium-amber bg-[--bg-elevated] py-1"
          style={colSpan(data.quincenas.length)}
        >
          <div className="sticky left-0 z-10 bg-[--bg-elevated] px-4 py-2 font-display text-base text-actium-amber">
            Saldo en banco
          </div>
          {data.flujoAcumulado.map((v, i) => {
            const quincena = data.quincenas[i];
            return (
              <HoverTooltip
                key={quincena}
                content={
                  <InfoTooltip
                    etiqueta="Saldo en banco"
                    quincena={quincena}
                    detalle={
                      <>
                        <p className="text-[--text-muted]">
                          Acumulado de saldos reales (sin proyectados) hasta esta quincena.
                        </p>
                        <DetalleRow label="Saldo del periodo" value={data.saldoPorQuincena[i]} />
                      </>
                    }
                  />
                }
              >
                <div
                  className={
                    "flex items-center justify-end px-3 py-2 font-display text-base " +
                    (v < 0 ? "text-danger" : "text-actium-amber")
                  }
                >
                  {formatMontoContable(v)}
                </div>
              </HoverTooltip>
            );
          })}
        </div>

        {/* Flujo acumulado */}
        <div
          className="sticky bottom-0 grid border-t-2 border-actium-orange bg-[--bg-elevated] py-1"
          style={colSpan(data.quincenas.length)}
        >
          <div className="sticky left-0 z-10 bg-[--bg-elevated] px-4 py-2 font-display text-base text-actium-orange">
            Flujo de caja acumulado
          </div>
          {data.acumuladoConProyectado.map((v, i) => {
            const tieneProyectado = data.totalProyectadoPorQuincena.slice(0, i + 1).some((p) => p !== 0);
            const quincena = data.quincenas[i];
            return (
              <HoverTooltip
                key={quincena}
                content={
                  <InfoTooltip
                    etiqueta="Flujo de caja acumulado"
                    quincena={quincena}
                    detalle={
                      <>
                        <p className="text-[--text-muted]">
                          Acumulado incluyendo saldos proyectados (CxC/CxP pendientes).
                        </p>
                        <DetalleRow label="Saldo del periodo" value={data.saldoPorQuincena[i]} />
                        <DetalleRow
                          label="Proyectado"
                          value={data.totalProyectadoPorQuincena[i]}
                          className="text-info"
                        />
                      </>
                    }
                  />
                }
              >
                <div
                  className={
                    "flex items-center justify-end px-3 py-2 font-display text-base " +
                    (v < 0 ? "text-danger" : tieneProyectado ? "text-info" : "text-actium-orange")
                  }
                >
                  {formatMontoContable(v)}
                </div>
              </HoverTooltip>
            );
          })}
        </div>
      </div>
    </div>
  );
}
