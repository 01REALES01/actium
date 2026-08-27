import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, puedeGestionarInventario } from "@/lib/auth/roles";
import { listCatalogoHerramientas } from "@/lib/data/inventario";
import { HerramientasTable } from "@/components/inventario/herramientas-table";
import { CatalogoFormDialog } from "@/components/inventario/catalogo-form-dialog";
import { InventarioFilters } from "@/components/inventario/inventario-filters";
import { parseEstadoHerramientaFiltro } from "@/constants/inventario";

export default async function HerramientasPage({
  searchParams,
}: {
  searchParams: { estado?: string; q?: string };
}) {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  const puedeEscribir = puedeGestionarInventario(perfil?.rol);

  const estado = parseEstadoHerramientaFiltro(searchParams.estado);
  const busqueda = (searchParams.q ?? "").trim();

  const catalogo = await listCatalogoHerramientas(supabase, { estado, busqueda: busqueda || undefined });

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/inventario"
            className="inline-flex items-center gap-1.5 text-sm text-[--text-secondary] hover:text-[--text-primary]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
            Inventario
          </Link>
          <h1 className="mt-2 font-display text-3xl text-[--text-primary]">Herramientas</h1>
          <p className="mt-2 text-sm text-[--text-secondary]">
            Catálogo maestro de Actium. Cada tipo agrupa las unidades físicas serializadas.
          </p>
        </div>
        {puedeEscribir ? <CatalogoFormDialog modo="crear" /> : null}
      </div>

      <InventarioFilters estado={estado} busqueda={busqueda} total={catalogo.length} />

      <HerramientasTable
        catalogo={catalogo}
        mensajeVacio={
          estado === "todas" && !busqueda
            ? "Aún no hay herramientas registradas. Crea la primera."
            : "Ninguna herramienta coincide con este filtro."
        }
      />
    </div>
  );
}
