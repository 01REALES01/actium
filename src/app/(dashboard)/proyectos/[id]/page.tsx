import { notFound } from "next/navigation";
import { Activity, AlertTriangle, Banknote, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectProgressChart } from "@/components/projects/project-progress-chart";
import { createClient } from "@/lib/supabase/server";

type ProjectPageProps = {
  params: {
    id: string;
  };
};

function money(value?: number | null) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(value ?? 0);
}

export default async function ProyectoDashboardPage({ params }: ProjectPageProps) {
  const supabase = createClient();

  const [{ data: proyecto, error: proyectoError }, { data: avances }, { data: balances }, { data: incidentes }] =
    await Promise.all([
      supabase
        .from("proyectos")
        .select("id,nombre,estado,presupuesto_total")
        .eq("id", params.id)
        .single(),
      supabase
        .from("proyecto_avances")
        .select("fecha,avance_real,avance_proyectado")
        .eq("proyecto_id", params.id)
        .order("fecha", { ascending: true }),
      supabase.from("vw_rubro_balance").select("ejecutado").eq("proyecto_id", params.id),
      supabase
        .from("incidentes")
        .select("id", { count: "exact", head: true })
        .eq("proyecto_id", params.id)
        .gte("fecha", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)),
    ]);

  if (proyectoError || !proyecto) notFound();

  const presupuestoTotal = proyecto.presupuesto_total ?? 0;
  const presupuestoEjecutado = (balances ?? []).reduce((sum, r) => sum + (r.ejecutado ?? 0), 0);
  const ejecucion = presupuestoTotal > 0 ? Math.round((presupuestoEjecutado / presupuestoTotal) * 100) : 0;

  const avanceActual = avances?.at(-1)?.avance_real ?? 0;
  const avanceProyectado = avances?.at(-1)?.avance_proyectado ?? 0;

  const chartData = (avances ?? []).map((a) => ({
    fecha: new Date(a.fecha).toLocaleDateString("es-CO", { day: "2-digit", month: "short" }),
    avance: a.avance_real,
    proyectado: a.avance_proyectado,
  }));

  const kpis = [
    {
      label: "Avance real",
      value: `${avanceActual}%`,
      detail: `vs ${avanceProyectado}% proyectado`,
      icon: TrendingUp,
    },
    {
      label: "Presupuesto ejecutado",
      value: `${ejecucion}%`,
      detail: `${money(presupuestoEjecutado)} ejecutados`,
      icon: Banknote,
    },
    {
      label: "Incidentes SST",
      value: String((incidentes as unknown as { count: number } | null)?.count ?? 0),
      detail: "Últimos 30 días",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Badge>{proyecto.estado ?? "activo"}</Badge>
            <span className="text-sm text-slate-500">ID {proyecto.id.slice(0, 8)}</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-normal">{proyecto.nombre}</h2>
          <p className="mt-1 text-sm text-slate-500">Indicadores ejecutivos del proyecto.</p>
        </div>
      </div>

      <Tabs defaultValue="resumen">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="sst">SST</TabsTrigger>
          <TabsTrigger value="presupuesto">Presupuesto</TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">{kpi.label}</CardTitle>
                    <Icon className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-semibold">{kpi.value}</div>
                    <p className="mt-1 text-sm text-slate-500">{kpi.detail}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="h-5 w-5 text-blue-500" />
                Avance del proyecto
              </CardTitle>
              <CardDescription>Avance real contra avance proyectado.</CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectProgressChart data={chartData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sst">
          <Card>
            <CardHeader>
              <CardTitle>SST</CardTitle>
              <CardDescription>Indicadores de seguridad y salud en el trabajo.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-500">Módulo listo para conectar formularios e incidentes.</CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="presupuesto">
          <Card>
            <CardHeader>
              <CardTitle>Presupuesto</CardTitle>
              <CardDescription>Ejecución presupuestal del proyecto.</CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-slate-500">
              {money(presupuestoEjecutado)} ejecutados de {money(presupuestoTotal)}.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
