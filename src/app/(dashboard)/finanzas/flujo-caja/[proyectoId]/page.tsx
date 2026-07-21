import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual } from "@/lib/auth/roles";
import { getProyectoFinanzas, listMovimientos } from "@/lib/data/presupuesto";
import { getFlujoQuincenal, derivarSeriesProyecto } from "@/lib/data/flujo-caja";
import { FlujoCajaTable } from "@/components/finanzas/flujo-caja-table";
import { FlujoCajaCharts } from "@/components/finanzas/flujo-caja-charts";
import { Badge } from "@/components/ui/badge";

export default async function FlujoCajaPage({ params }: { params: { proyectoId: string } }) {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);

  if (!perfil || !["super_admin", "admin", "financiero"].includes(perfil.rol)) {
    redirect("/proyectos");
  }

  const proyecto = await getProyectoFinanzas(supabase, params.proyectoId);
  if (!proyecto) notFound();

  const [flujo, movimientos] = await Promise.all([
    getFlujoQuincenal(supabase, params.proyectoId),
    listMovimientos(supabase, params.proyectoId),
  ]);

  const series = derivarSeriesProyecto(flujo);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <Link
          href={`/finanzas/presupuesto/${params.proyectoId}`}
          className="inline-flex items-center gap-1.5 text-sm text-[--text-secondary] hover:text-[--text-primary]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          {proyecto.proyecto_nombre}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-3xl text-[--text-primary]">Flujo de caja</h1>
          {proyecto.es_interno ? <Badge variant="secondary">Interno</Badge> : null}
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-sans text-lg font-semibold text-[--text-primary]">Detalle por rubro</h2>
          <span className="flex items-center gap-3 text-xs text-[--text-secondary]">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-sm bg-info/70" />
              Cobro proyectado
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-3 rounded-sm bg-warning/70" />
              Pago proyectado
            </span>
          </span>
        </div>
        <FlujoCajaTable data={flujo} movimientos={movimientos} />
      </div>

      <FlujoCajaCharts series={series} />
    </div>
  );
}
