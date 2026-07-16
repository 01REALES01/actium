import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, puedeGestionarPresupuesto } from "@/lib/auth/roles";
import { getProyectoFinanzas, getRubrosPorProyecto, listMovimientos } from "@/lib/data/presupuesto";
import { getFlujoQuincenal } from "@/lib/data/flujo-caja";
import { FlujoCajaTable } from "@/components/finanzas/flujo-caja-table";
import { Badge } from "@/components/ui/badge";

export default async function FlujoCajaPage({ params }: { params: { proyectoId: string } }) {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);

  if (!perfil || !["super_admin", "admin", "financiero"].includes(perfil.rol)) {
    redirect("/proyectos");
  }

  const proyecto = await getProyectoFinanzas(supabase, params.proyectoId);
  if (!proyecto) notFound();

  const [flujo, rubros, movimientos] = await Promise.all([
    getFlujoQuincenal(supabase, params.proyectoId),
    getRubrosPorProyecto(supabase, params.proyectoId),
    listMovimientos(supabase, params.proyectoId),
  ]);

  const puedeEscribir = puedeGestionarPresupuesto(perfil.rol);

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

      <FlujoCajaTable
        data={flujo}
        movimientos={movimientos}
        proyectoId={params.proyectoId}
        rubros={rubros}
        puedeEscribir={puedeEscribir}
      />
    </div>
  );
}
