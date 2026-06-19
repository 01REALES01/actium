import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, puedeCrearFormularioSST } from "@/lib/auth/roles";
import { PermisoCalienteForm } from "@/components/sst/permiso-caliente-form";

export default async function PermisoCalientePage() {
  const supabase = createClient();

  const perfil = await getPerfilActual(supabase);
  if (!puedeCrearFormularioSST(perfil?.rol)) {
    redirect("/sst");
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="flex flex-col gap-6">
        <Link
          href="/sst"
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors w-fit"
        >
          <ChevronLeft className="h-4 w-4" /> Volver a SST
        </Link>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white uppercase">
            Permiso para Trabajos en Caliente
          </h1>
          <p className="mt-2 text-[10px] md:text-sm font-medium text-white/40 uppercase tracking-widest">
            Soldadura, corte y fuentes de ignición — Diligencie el permiso y descárguelo en PDF
          </p>
        </div>
      </div>

      <PermisoCalienteForm />
    </div>
  );
}
