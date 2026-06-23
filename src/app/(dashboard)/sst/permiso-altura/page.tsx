import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, puedeCrearFormularioSST } from "@/lib/auth/roles";
import { PermisoAlturaForm } from "@/components/sst/permiso-altura-form";
import { listProyectos } from "@/lib/data/proyectos";

export default async function PermisoAlturaPage() {
  const supabase = createClient();

  const perfil = await getPerfilActual(supabase);
  if (!puedeCrearFormularioSST(perfil?.rol)) {
    redirect("/sst");
  }

  const proyectosRaw = await listProyectos(supabase);
  const proyectos = proyectosRaw.map((p) => ({ id: p.id, nombre: p.nombre }));

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
          <Image
            src="/logo-actium.png"
            alt="Actium"
            width={140}
            height={38}
            priority
            className="h-9 w-auto brightness-0 invert mb-4"
          />
          <h1 className="text-3xl md:text-4xl font-display tracking-tight text-white uppercase">
            Permiso de Trabajo en Altura
          </h1>
          <p className="mt-2 text-[10px] md:text-sm font-medium text-white/40 uppercase tracking-widest">
            Resolución 1409 de 2012 — Diligencie el permiso y descárguelo en PDF
          </p>
        </div>
      </div>

      <PermisoAlturaForm proyectos={proyectos} />
    </div>
  );
}
