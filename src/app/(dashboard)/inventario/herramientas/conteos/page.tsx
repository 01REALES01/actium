import Link from "next/link";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listConteos, listProyectosAsignables } from "@/lib/data/inventario";
import { ConteosTable } from "@/components/inventario/conteos-table";

export default async function ConteosPage() {
  const supabase = createClient();

  const [conteos, proyectos] = await Promise.all([
    listConteos(supabase),
    listProyectosAsignables(supabase),
  ]);

  const nombresPorProyecto = Object.fromEntries(proyectos.map((p) => [p.id, p.nombre]));

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
          <h1 className="mt-2 font-display text-3xl text-[--text-primary]">Conteos de inventario</h1>
          <p className="mt-2 text-sm text-[--text-secondary]">
            Verificación física de las herramientas asignadas a cada proyecto y de la bodega.
          </p>
        </div>
        <Link href="/inventario/herramientas/conteos/nuevo">
          <Button className="min-h-[44px] gap-1.5">
            <ClipboardCheck className="h-4 w-4" strokeWidth={1.5} />
            Hacer inventario
          </Button>
        </Link>
      </div>

      <ConteosTable conteos={conteos} nombresPorProyecto={nombresPorProyecto} />
    </div>
  );
}
