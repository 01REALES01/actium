import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listProyectosConEpp } from "@/lib/data/inventario";
import { EppProyectosTable } from "@/components/inventario/epp-proyectos-table";

export default async function EppPage() {
  const supabase = createClient();
  const proyectos = await listProyectosConEpp(supabase);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <Link
          href="/inventario"
          className="inline-flex items-center gap-1.5 text-sm text-[--text-secondary] hover:text-[--text-primary]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Inventario
        </Link>
        <h1 className="mt-2 font-display text-3xl text-[--text-primary]">Elementos de protección personal</h1>
        <p className="mt-2 text-sm text-[--text-secondary]">
          Selecciona un proyecto para ver o alimentar su stock de EPP.
        </p>
      </div>

      <EppProyectosTable proyectos={proyectos} />
    </div>
  );
}
