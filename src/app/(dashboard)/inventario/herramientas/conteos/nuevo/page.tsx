import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listAmbitosConteo } from "@/lib/data/inventario";
import { NuevoConteoSelector } from "@/components/inventario/nuevo-conteo-selector";

export default async function NuevoConteoPage() {
  const supabase = createClient();
  const ambitos = await listAmbitosConteo(supabase);

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <Link
          href="/inventario/herramientas/conteos"
          className="inline-flex items-center gap-1.5 text-sm text-[--text-secondary] hover:text-[--text-primary]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Conteos
        </Link>
        <h1 className="mt-2 font-display text-3xl text-[--text-primary]">Hacer inventario</h1>
        <p className="mt-2 text-sm text-[--text-secondary]">
          Selecciona el proyecto o la bodega que vas a verificar en este momento.
        </p>
      </div>

      <NuevoConteoSelector ambitos={ambitos} />
    </div>
  );
}
