import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listProyectos } from "@/lib/data/proyectos";
import { getPerfilActual, puedeCrearFormularioSST } from "@/lib/auth/roles";
import { ParteCheckinForm } from "@/components/sst/parte-checkin-form";

export default async function NuevoPartePage({
  searchParams,
}: {
  searchParams?: { proyecto?: string; fecha?: string };
}) {
  const supabase = createClient();

  const perfil = await getPerfilActual(supabase);
  if (!puedeCrearFormularioSST(perfil?.rol)) {
    redirect("/sst");
  }

  const proyectos = await listProyectos(supabase);

  // Personal asignado a cada obra (vía empleado_proyectos), igual que en el ATS.
  const { data: asignacionesData } = await supabase
    .from("empleado_proyectos")
    .select(`proyecto_id, empleados:empleado_id (id, nombre, cedula, cargo, activo)`)
    .is("retirado_at", null);

  const empleados = (asignacionesData || [])
    .filter((a: any) => a.empleados && a.empleados.activo)
    .map((a: any) => ({
      id: a.empleados.id,
      nombre: a.empleados.nombre,
      cedula: a.empleados.cedula,
      cargo: a.empleados.cargo,
      proyecto_id: a.proyecto_id,
    }));

  const proyectosOpt = proyectos.map((p) => ({ id: p.id, nombre: p.nombre }));
  const hoy = new Date().toISOString().split("T")[0];
  const fechaInicial = /^\d{4}-\d{2}-\d{2}$/.test(searchParams?.fecha ?? "")
    ? (searchParams!.fecha as string)
    : hoy;

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="flex flex-col gap-6">
        <Link
          href="/sst/bitacora"
          className="flex w-fit items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 transition-colors hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" /> Volver a la bitácora
        </Link>
        <div>
          <h1 className="text-3xl font-bold uppercase tracking-tight text-white md:text-4xl">
            Parte diario SST
          </h1>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-widest text-white/40 md:text-sm">
            Registro de asistencia a operación e inasistencias del día
          </p>
        </div>
      </div>

      <ParteCheckinForm
        proyectos={proyectosOpt}
        empleados={empleados}
        fechaInicial={fechaInicial}
        proyectoInicial={searchParams?.proyecto}
      />
    </div>
  );
}
