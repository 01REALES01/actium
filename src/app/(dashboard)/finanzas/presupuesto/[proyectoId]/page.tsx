import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, LineChart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, puedeGestionarPresupuesto } from "@/lib/auth/roles";
import {
  getRubrosBalance,
  getRubrosPorProyecto,
  getProyectoFinanzas,
  listMovimientos,
} from "@/lib/data/presupuesto";
import { listCxC } from "@/lib/data/cxc";
import { listCxP } from "@/lib/data/cxp";
import { RubrosTable } from "@/components/finanzas/rubros-table";
import { RubrosDonutChart } from "@/components/finanzas/rubros-donut-chart";
import { CrearRubroDialog } from "@/components/finanzas/crear-rubro-dialog";
import { TransferirPresupuestoDialog } from "@/components/finanzas/transferir-presupuesto-dialog";
import { FijarPresupuestoDialog } from "@/components/finanzas/fijar-presupuesto-dialog";
import { MovimientoDialog } from "@/components/finanzas/movimiento-dialog";
import { MovimientosTable } from "@/components/finanzas/movimientos-table";
import { CxCTable } from "@/components/finanzas/cxc-table";
import { CxCFormDialog } from "@/components/finanzas/cxc-form-dialog";
import { CxPTable } from "@/components/finanzas/cxp-table";
import { CxPFormDialog } from "@/components/finanzas/cxp-form-dialog";
import { Badge } from "@/components/ui/badge";
import { formatCOP } from "@/lib/format";

export default async function PresupuestoDetallePage({
  params,
}: {
  params: { proyectoId: string };
}) {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);

  if (!perfil || !["super_admin", "admin", "financiero"].includes(perfil.rol)) {
    redirect("/proyectos");
  }

  const proyecto = await getProyectoFinanzas(supabase, params.proyectoId);
  if (!proyecto) notFound();

  const [balance, rubros, movimientos, cxc, cxp] = await Promise.all([
    getRubrosBalance(supabase, params.proyectoId),
    getRubrosPorProyecto(supabase, params.proyectoId),
    listMovimientos(supabase, params.proyectoId),
    listCxC(supabase, { proyectoId: params.proyectoId }),
    listCxP(supabase, { proyectoId: params.proyectoId }),
  ]);

  const rubrosIngreso = rubros.filter((r) => r.categoria === "ingresos");
  const rubrosEgreso = rubros.filter((r) => r.categoria !== "ingresos");

  const puedeEscribir = puedeGestionarPresupuesto(perfil.rol);

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div>
        <Link
          href="/finanzas/presupuesto"
          className="inline-flex items-center gap-1.5 text-sm text-[--text-secondary] hover:text-[--text-primary]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Presupuesto
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl text-[--text-primary]">{proyecto.proyecto_nombre}</h1>
          {proyecto.es_interno ? <Badge variant="secondary">Interno</Badge> : null}
          <Link
            href={`/finanzas/flujo-caja/${params.proyectoId}`}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl border border-actium-orange text-actium-orange px-4 py-2 text-sm font-semibold transition-all hover:bg-actium-orange/10"
          >
            <LineChart className="h-4 w-4" strokeWidth={1.5} />
            Ver flujo de caja
          </Link>
        </div>

        {/* Barra de utilización global — ancho completo */}
        {(() => {
          const ejecutado = proyecto.presupuesto_ejecutado ?? 0;
          const techo = proyecto.presupuesto_fijado ?? proyecto.presupuesto_total ?? 0;
          const pct = techo > 0 ? Math.min(100, (ejecutado / techo) * 100) : 0;
          const color = pct >= 90 ? "#EF4444" : pct >= 80 ? "#F59E0B" : "#F25C05";
          return (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-[--text-secondary]">Utilización del presupuesto</span>
                <span
                  className="font-semibold"
                  style={{ color: pct >= 80 ? color : "var(--text-primary)" }}
                >
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-[--bg-hover]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-xs text-[--text-muted]">
                <span>{formatCOP(ejecutado)} ejecutado</span>
                <span>
                  {proyecto.presupuesto_fijado
                    ? `${formatCOP(proyecto.presupuesto_fijado)} fijado`
                    : `${formatCOP(techo)} presupuestado`}
                </span>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-sans text-lg font-semibold text-[--text-primary]">Rubros</h2>
            {puedeEscribir ? (
              <div className="flex flex-wrap items-center gap-2">
                <FijarPresupuestoDialog
                  proyectoId={params.proyectoId}
                  sumaActual={balance
                    .filter((r) => r.categoria !== "ingresos")
                    .reduce((s, r) => s + (r.monto_maximo ?? 0), 0)}
                  presupuestoFijado={proyecto.presupuesto_fijado ?? null}
                />
                <TransferirPresupuestoDialog proyectoId={params.proyectoId} rubros={balance} />
                <CrearRubroDialog proyectoId={params.proyectoId} />
              </div>
            ) : null}
          </div>
          <RubrosTable rubros={balance} puedeEscribir={puedeEscribir} />
        </div>
        <RubrosDonutChart rubros={balance} />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-sans text-lg font-semibold text-[--text-primary]">Movimientos</h2>
          {puedeEscribir ? <MovimientoDialog proyectoId={params.proyectoId} rubros={rubros} /> : null}
        </div>
        <MovimientosTable movimientos={movimientos} puedeEscribir={puedeEscribir} />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-sans text-lg font-semibold text-[--text-primary]">Cuentas por cobrar</h2>
          {puedeEscribir ? (
            <CxCFormDialog proyectoId={params.proyectoId} rubrosIngreso={rubrosIngreso} />
          ) : null}
        </div>
        <CxCTable cuentas={cxc} puedeEscribir={puedeEscribir} />
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-sans text-lg font-semibold text-[--text-primary]">Cuentas por pagar</h2>
          {puedeEscribir ? (
            <CxPFormDialog proyectoId={params.proyectoId} rubrosEgreso={rubrosEgreso} />
          ) : null}
        </div>
        <CxPTable cuentas={cxp} puedeEscribir={puedeEscribir} />
      </div>
    </div>
  );
}
