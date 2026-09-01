import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, puedeGestionarInventario } from "@/lib/auth/roles";
import {
  getProyectoNombre,
  listEppProyecto,
  getEppResumen,
  listEntregasEppNoConciliadas,
} from "@/lib/data/inventario";
import { EppStockTable } from "@/components/inventario/epp-stock-table";
import { EppItemFormDialog } from "@/components/inventario/epp-item-form-dialog";
import { EppNoConciliadasTable } from "@/components/inventario/epp-no-conciliadas-table";

export default async function EppProyectoPage({
  params,
}: {
  params: { proyectoId: string };
}) {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  const puedeEscribir = puedeGestionarInventario(perfil?.rol);

  const proyecto = await getProyectoNombre(supabase, params.proyectoId);
  if (!proyecto) notFound();

  const [items, resumen, noConciliadas] = await Promise.all([
    listEppProyecto(supabase, params.proyectoId),
    getEppResumen(supabase, params.proyectoId),
    listEntregasEppNoConciliadas(supabase, params.proyectoId),
  ]);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/inventario/epp"
            className="inline-flex items-center gap-1.5 text-sm text-[--text-secondary] hover:text-[--text-primary]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            EPP por proyecto
          </Link>
          <h1 className="mt-2 font-display text-3xl text-[--text-primary]">{proyecto.nombre}</h1>
          <p className="mt-2 text-sm text-[--text-secondary]">{proyecto.empresas?.nombre ?? "Sin empresa"}</p>
        </div>
        {puedeEscribir ? <EppItemFormDialog modo="crear" proyectoId={proyecto.id} /> : null}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="font-sans text-xs font-medium uppercase tracking-wider text-[--text-secondary]">
              Elementos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl text-actium-orange">{resumen.totalItems}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="font-sans text-xs font-medium uppercase tracking-wider text-[--text-secondary]">
              Bajo mínimo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`font-display text-2xl ${resumen.bajoMinimo > 0 ? "text-danger" : "text-success"}`}>
              {resumen.bajoMinimo}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="font-sans text-xs font-medium uppercase tracking-wider text-[--text-secondary]">
              Saldo total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-2xl text-[--text-primary]">{resumen.saldoTotal}</p>
          </CardContent>
        </Card>
      </div>

      <EppStockTable proyectoId={proyecto.id} items={items} puedeEscribir={puedeEscribir} />

      <EppNoConciliadasTable entregas={noConciliadas} />
    </div>
  );
}
