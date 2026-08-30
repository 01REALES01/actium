import { Suspense } from "react";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, puedeCrearFormularioSST, puedeGestionarSST } from "@/lib/auth/roles";
import { CharlaSeguridadForm } from "@/components/sst/charla-seguridad-form";
import type { EmpleadoOptEpp } from "@/components/sst/entrega-epp-form";
import { listProyectos } from "@/lib/data/proyectos";
import { listEmpleados } from "@/lib/data/sst";

export default async function CharlaSeguridadPage() {
  const supabase = createClient();

  const perfil = await getPerfilActual(supabase);
  if (!puedeCrearFormularioSST(perfil?.rol)) {
    redirect("/sst");
  }

  const [proyectosRaw, empleadosRaw] = await Promise.all([
    listProyectos(supabase),
    listEmpleados(supabase),
  ]);

  const proyectos = proyectosRaw.map((p) => ({ id: p.id, nombre: p.nombre }));
  const empleados: EmpleadoOptEpp[] = empleadosRaw
    .filter((e) => e.activo)
    .map((e) => ({
      id: e.id,
      nombre: e.nombre,
      cedula: e.cedula,
      cargo: e.cargo,
      proyectoIds: e.proyectos.map((p) => p.id),
    }));

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
            Charla de Seguridad
          </h1>
          <p className="mt-2 text-[10px] md:text-sm font-medium text-white/40 uppercase tracking-widest">
            Registro de capacitación / charla de seguridad
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="text-white/50 text-xs py-8">Cargando formulario...</div>}>
        <CharlaSeguridadForm proyectos={proyectos} empleados={empleados} puedeEliminarFotos={puedeGestionarSST(perfil?.rol)} />
      </Suspense>
    </div>
  );
}
