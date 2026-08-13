import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual } from "@/lib/auth/roles";
import { getFlujoAgregado, derivarSeriesAgregado, resolverRango } from "@/lib/data/flujo-caja";
import { FlujoCajaCharts } from "@/components/finanzas/flujo-caja-charts";
import { FlujoCajaGlobalTable } from "@/components/finanzas/flujo-caja-global-table";
import { QuincenaRangoSelector } from "@/components/finanzas/quincena-rango-selector";

export default async function FlujoCajaGlobalPage({
  searchParams,
}: {
  searchParams: { desde?: string; hasta?: string };
}) {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);

  if (!perfil || !["super_admin", "admin", "financiero"].includes(perfil.rol)) {
    redirect("/proyectos");
  }

  const { rango, desdeQuincena, hastaQuincena, opciones } = resolverRango(searchParams);

  const flujoAgregado = await getFlujoAgregado(supabase, rango);
  const series = derivarSeriesAgregado(flujoAgregado);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <Link
          href="/finanzas"
          className="inline-flex items-center gap-1.5 text-sm text-[--text-secondary] hover:text-[--text-primary]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Finanzas
        </Link>
        <h1 className="mt-2 font-display text-3xl text-[--text-primary]">
          Flujo de caja — todos los proyectos
        </h1>
        <p className="mt-2 text-sm text-[--text-secondary]">
          Ingresos, egresos y saldo acumulado consolidados por quincena.
        </p>
        <div className="mt-4">
          <QuincenaRangoSelector
            opciones={opciones}
            desde={desdeQuincena}
            hasta={hastaQuincena}
            basePath="/finanzas/flujo-caja"
          />
        </div>
      </div>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-sans text-lg font-semibold text-[--text-primary]">Detalle por categoría</h2>
          <span className="flex items-center gap-1.5 text-xs text-[--text-secondary]">
            <span className="inline-block h-2 w-3 rounded-sm bg-info/70" />
            Proyectado (pendiente)
          </span>
        </div>
        <FlujoCajaGlobalTable data={flujoAgregado} />
      </div>

      <FlujoCajaCharts series={series} />
    </div>
  );
}
