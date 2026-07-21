"use client";

import { formatFechaCorta, formatMontoContable } from "@/lib/format";
import type { FlujoCajaAgregado } from "@/lib/data/flujo-caja";
import type { CategoriaFlujo } from "@/types/database.types";

const CATEGORIA_LABEL: Record<CategoriaFlujo, string> = {
  costos_operativos: "1. Costos operativos",
  gastos_administrativos: "2. Gastos administrativos",
  gastos_financieros: "3. Gastos financieros",
  ingresos: "4. Ingresos",
};

function colSpan(n: number) {
  return { gridTemplateColumns: `200px repeat(${n}, minmax(110px, 1fr))` };
}

export function FlujoCajaGlobalTable({ data }: { data: FlujoCajaAgregado }) {
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
              return (
                <div key={data.quincenas[i]} className="flex flex-col items-end px-3 py-2">
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
          {data.totalEgresosPorQuincena.map((v, i) => (
            <div key={data.quincenas[i]} className="px-3 py-2 text-right text-danger">
              {formatMontoContable(v)}
            </div>
          ))}
        </div>

        {/* Ingresos */}
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
            return (
              <div
                key={data.quincenas[i]}
                className={
                  "px-3 py-2 text-right " +
                  (tieneProyectado ? "text-info" : vMostrar < 0 ? "text-danger" : "text-success")
                }
              >
                {formatMontoContable(vMostrar)}
              </div>
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
            const tieneProyectado =
              data.totalProyectadoPorQuincena[i] !== 0 ||
              (i > 0 && data.totalProyectadoPorQuincena.slice(0, i).some((p) => p !== 0));
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
      </div>
    </div>
  );
}
