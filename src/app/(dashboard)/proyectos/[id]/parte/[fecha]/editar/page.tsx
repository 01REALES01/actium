import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProyecto } from "@/lib/data/proyectos";
import { getParteDelDia } from "@/lib/data/partes-sst";
import { getPerfilActual, puedeCrearFormularioSST } from "@/lib/auth/roles";
import { ParteCheckinForm } from "@/components/sst/parte-checkin-form";

type Estado = { presente: boolean; tipo: "medico" | "personal" | "vacaciones" | "incapacidad" | "otro"; razon: string };

export default async function EditarParteDiaPage({
  params,
}: {
  params: { id: string; fecha: string };
}) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(params.fecha)) notFound();

  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!puedeCrearFormularioSST(perfil?.rol)) {
    redirect(`/proyectos/${params.id}/parte/${params.fecha}`);
  }

  const db = createAdminClient();
  const [proyecto, base] = await Promise.all([
    getProyecto(db, params.id),
    getParteDelDia(db, params.id, params.fecha),
  ]);
  if (!proyecto || !base) notFound();

  // Personal asignado a la obra, en el shape que espera el formulario.
  const empleados = base.roster.map((e) => ({
    id: e.id,
    nombre: e.nombre,
    cedula: null,
    cargo: e.cargo,
    proyecto_id: params.id,
  }));

  // Prefill: marca ausentes a quienes ya tienen inasistencia ese día.
  const estadoInicial: Record<string, Estado> = {};
  for (const a of base.inasistencias) {
    estadoInicial[a.empleado_id] = {
      presente: false,
      tipo: a.tipo as Estado["tipo"],
      razon: a.razon,
    };
  }

  const fechaLarga = new Date(`${params.fecha}T12:00:00`).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="flex flex-col gap-6">
        <Link
          href={`/proyectos/${params.id}/parte/${params.fecha}`}
          className="flex w-fit items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al parte del día
        </Link>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#F25C05]">
            {proyecto.nombre}
          </p>
          <h1 className="mt-1 text-2xl font-bold capitalize tracking-tight text-white md:text-4xl">
            {base.parte ? "Editar parte" : "Registrar parte"} · {fechaLarga}
          </h1>
        </div>
      </div>

      <ParteCheckinForm
        proyectos={[{ id: proyecto.id, nombre: proyecto.nombre }]}
        empleados={empleados}
        fechaInicial={params.fecha}
        proyectoInicial={proyecto.id}
        proyectoFijo
        estadoInicial={estadoInicial}
        observacionInicial={base.parte?.observaciones ?? ""}
        destino="proyecto"
      />
    </div>
  );
}
