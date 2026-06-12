import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { listProyectos } from "@/lib/data/proyectos";
import { AtsForm } from "@/components/sst/ats-form";

export default async function NuevoATSPage() {
  const supabase = createClient();
  const proyectos = await listProyectos(supabase);
  
  // Obtener empleados con sus proyectos asignados (a través de empleado_proyectos)
  const { data: asignacionesData } = await supabase
    .from('empleado_proyectos')
    .select(`
      proyecto_id,
      empleados:empleado_id (id, nombre, cedula, cargo)
    `)
    .is('retirado_at', null);

  // Aplanar: cada asignación produce un empleado con su proyecto_id
  const empleados = (asignacionesData || [])
    .filter((a: any) => a.empleados)
    .map((a: any) => ({
      id: a.empleados.id,
      nombre: a.empleados.nombre,
      cedula: a.empleados.cedula,
      cargo: a.empleados.cargo,
      proyecto_id: a.proyecto_id,
    }));

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <Link 
          href="/sst"
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors w-fit"
        >
          <ChevronLeft className="h-4 w-4" /> Volver a SST
        </Link>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white uppercase">
            Nuevo ATS
          </h1>
          <p className="mt-2 text-[10px] md:text-sm font-medium text-white/40 uppercase tracking-widest">
            Análisis de Trabajo Seguro — Identificación de Peligros y Controles
          </p>
        </div>
      </div>

      <AtsForm proyectos={proyectos} empleados={empleados} />
    </div>
  );
}
