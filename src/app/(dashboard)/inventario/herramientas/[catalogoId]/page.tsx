import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, puedeGestionarInventario } from "@/lib/auth/roles";
import {
  getCatalogo,
  listUnidadesCatalogo,
  listMovimientosUnidad,
  listProyectosAsignables,
} from "@/lib/data/inventario";
import { UnidadesTable } from "@/components/inventario/unidades-table";
import { UnidadFormDialog } from "@/components/inventario/unidad-form-dialog";
import { CatalogoFormDialog } from "@/components/inventario/catalogo-form-dialog";
import { EliminarCatalogoButton } from "@/components/inventario/eliminar-catalogo-button";
import type { MovimientoConRelaciones } from "@/lib/data/inventario";

export default async function CatalogoDetallePage({
  params,
}: {
  params: { catalogoId: string };
}) {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  const puedeEscribir = puedeGestionarInventario(perfil?.rol);

  const catalogo = await getCatalogo(supabase, params.catalogoId);
  if (!catalogo) notFound();

  const [unidades, proyectos] = await Promise.all([
    listUnidadesCatalogo(supabase, params.catalogoId),
    puedeEscribir ? listProyectosAsignables(supabase) : Promise.resolve([]),
  ]);

  const movimientosPorUnidadEntries = await Promise.all(
    unidades.map(async (u) => [u.id, await listMovimientosUnidad(supabase, u.id)] as [string, MovimientoConRelaciones[]]),
  );
  const movimientosPorUnidad = Object.fromEntries(movimientosPorUnidadEntries);

  const disponibles = unidades.filter((u) => u.estado === "disponible").length;
  const asignadas = unidades.filter((u) => u.estado === "asignada").length;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/inventario/herramientas"
            className="inline-flex items-center gap-1.5 text-sm text-[--text-secondary] hover:text-[--text-primary]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Herramientas
          </Link>
          <h1 className="mt-2 font-display text-3xl text-[--text-primary]">{catalogo.nombre}</h1>
          <p className="mt-2 text-sm text-[--text-secondary]">
            {catalogo.marca ? `${catalogo.marca} · ` : ""}
            {catalogo.categoria ?? "Sin categoría"}
          </p>
        </div>
        {puedeEscribir ? (
          <div className="flex flex-wrap gap-2">
            <CatalogoFormDialog modo="editar" catalogo={catalogo} />
            <UnidadFormDialog modo="crear" catalogoId={catalogo.id} />
            <EliminarCatalogoButton catalogoId={catalogo.id} catalogoNombre={catalogo.nombre} />
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="font-sans text-xs font-medium uppercase tracking-wider text-[--text-secondary]">
              Total unidades
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl text-actium-orange">{unidades.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="font-sans text-xs font-medium uppercase tracking-wider text-[--text-secondary]">
              Disponibles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl text-success">{disponibles}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="font-sans text-xs font-medium uppercase tracking-wider text-[--text-secondary]">
              Asignadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl text-info">{asignadas}</p>
          </CardContent>
        </Card>
      </div>

      <UnidadesTable
        unidades={unidades}
        movimientosPorUnidad={movimientosPorUnidad}
        proyectos={proyectos}
        puedeEscribir={puedeEscribir}
      />
    </div>
  );
}
