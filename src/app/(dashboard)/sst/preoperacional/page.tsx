import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, puedeCrearFormularioSST, puedeGestionarSST } from "@/lib/auth/roles";
import { PreoperacionalForm } from "@/components/sst/preoperacional-form";
import { listProyectos } from "@/lib/data/proyectos";

export default async function PreoperacionalPage() {
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
            Inspecciones Preoperacionales
          </h1>
          <p className="mt-2 text-[10px] md:text-sm font-medium text-white/40 uppercase tracking-widest">
            Inspección de herramientas y equipos antes de iniciar la labor
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="text-white/50 text-xs py-8">Cargando formulario...</div>}>
        <PreoperacionalForm
          proyectos={proyectos}
          puedeEliminarFotos={puedeGestionarSST(perfil?.rol)}
        />
      </Suspense>
    </div>
  );
}
