import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual } from "@/lib/auth/roles";
import { listProyectosFinanzas } from "@/lib/data/presupuesto";
import { listEmpresas } from "@/lib/data/organizacion";
import { formatCOP } from "@/lib/format";
import { CrearPresupuestoPropioDialog } from "@/components/finanzas/crear-presupuesto-propio-dialog";

export default async function PresupuestoListadoPage({
  searchParams,
}: {
  searchParams: { interno?: string };
}) {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);

  if (!perfil || !["super_admin", "admin", "financiero"].includes(perfil.rol)) {
    redirect("/proyectos");
  }

  const soloInternos = searchParams.interno === "1";
  if (soloInternos && perfil.rol !== "super_admin") {
    redirect("/finanzas/presupuesto");
  }

  const proyectos = await listProyectosFinanzas(supabase, { soloInternos });
  const empresas = soloInternos && proyectos.length === 0 ? await listEmpresas(supabase) : [];

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-[--text-primary]">Presupuesto</h1>
          <p className="mt-2 text-sm text-[--text-secondary]">
            Selecciona un proyecto para ver sus rubros, movimientos y flujo de caja.
          </p>
        </div>
        {perfil.rol === "super_admin" ? (
          <div className="flex gap-2">
            <Link
              href="/finanzas/presupuesto"
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                !soloInternos
                  ? "bg-actium-orange text-white"
                  : "border border-[--border-default] text-[--text-secondary] hover:bg-[--bg-hover]"
              }`}
            >
              Proyectos de clientes
            </Link>
            <Link
              href="/finanzas/presupuesto?interno=1"
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
                soloInternos
                  ? "bg-actium-orange text-white"
                  : "border border-[--border-default] text-[--text-secondary] hover:bg-[--bg-hover]"
              }`}
            >
              Presupuesto propio
            </Link>
          </div>
        ) : null}
      </div>

      {proyectos.length === 0 ? (
        soloInternos ? (
          <div className="flex flex-col items-center gap-4 rounded-actium border border-dashed border-[--border-subtle] p-8 text-center">
            <p className="text-sm text-[--text-secondary]">
              Aún no has configurado el presupuesto propio. Es para el manejo interno de la empresa — no
              necesitas crear un proyecto de cliente para esto.
            </p>
            <CrearPresupuestoPropioDialog empresas={empresas} />
          </div>
        ) : (
          <p className="rounded-actium border border-dashed border-[--border-subtle] p-8 text-center text-sm text-[--text-secondary]">
            Aún no hay proyectos con presupuesto registrado.
          </p>
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {proyectos.map((p) => (
            <Link key={p.proyecto_id} href={`/finanzas/presupuesto/${p.proyecto_id}`}>
              <Card className="h-full hover:border-actium-orange/30 hover:shadow-actium-glow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="font-sans text-base font-semibold">{p.proyecto_nombre}</CardTitle>
                    {p.es_interno ? <Badge variant="secondary">Interno</Badge> : null}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[--bg-hover]">
                    <div
                      className={`h-full rounded-full ${
                        (p.porcentaje_ejecutado ?? 0) >= 90
                          ? "bg-danger"
                          : (p.porcentaje_ejecutado ?? 0) >= 80
                            ? "bg-warning"
                            : "bg-actium-orange"
                      }`}
                      style={{ width: `${Math.min(100, p.porcentaje_ejecutado ?? 0)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-[--text-secondary]">
                    <span>{formatCOP(p.presupuesto_ejecutado ?? 0)} ejecutado</span>
                    <span>{(p.porcentaje_ejecutado ?? 0).toFixed(0)}%</span>
                  </div>
                  <p className="text-xs text-[--text-muted]">
                    Techo total: {formatCOP(p.presupuesto_total ?? 0)}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
