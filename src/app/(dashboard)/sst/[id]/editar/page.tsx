import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listProyectos } from "@/lib/data/proyectos";
import { getPerfilActual, puedeCrearFormularioSST } from "@/lib/auth/roles";
import { AtsForm } from "@/components/sst/ats-form";
import type { Tables } from "@/types/database.types";

type Props = { params: { id: string } };

export default async function EditarATSPage({ params }: Props) {
  const supabase = createClient();

  const perfil = await getPerfilActual(supabase);
  if (!puedeCrearFormularioSST(perfil?.rol)) {
    redirect("/sst");
  }

  const { data: formData, error } = await supabase
    .from("formularios")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !formData) notFound();
  const form = formData as Tables<"formularios">;

  // Solo ATS editable, y no si está firmado o archivado.
  if (form.tipo !== "ats") redirect(`/sst/${form.id}`);
  if (form.estado === "firmado" || form.estado === "archivado") {
    redirect(`/sst/${form.id}`);
  }

  const [proyectos, pasosRes, trabajadoresRes, asignacionesRes] = await Promise.all([
    listProyectos(supabase),
    supabase.from("ats_pasos").select("*").eq("formulario_id", form.id).order("orden"),
    supabase.from("ats_trabajadores").select("*").eq("formulario_id", form.id),
    supabase
      .from("empleado_proyectos")
      .select(`proyecto_id, empleados:empleado_id (id, nombre, cedula, cargo)`)
      .is("retirado_at", null),
  ]);

  const pasos = (pasosRes.data ?? []).map((p: any) => ({
    paso: p.paso ?? "",
    peligros: p.peligros ?? "",
    consecuencias: p.consecuencias ?? "",
    controles: p.controles ?? "",
  }));

  const trabajadores = trabajadoresRes.data ?? [];
  const trabajadoresIds = trabajadores
    .filter((t: any) => t.empleado_id)
    .map((t: any) => t.empleado_id as string);
  const tieneFirma = trabajadores.some((t: any) => t.firma_path);

  const empleados = (asignacionesRes.data || [])
    .filter((a: any) => a.empleados)
    .map((a: any) => ({
      id: a.empleados.id,
      nombre: a.empleados.nombre,
      cedula: a.empleados.cedula,
      cargo: a.empleados.cargo,
      proyecto_id: a.proyecto_id,
    }));

  const proyectosOpt = proyectos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    empresa_id: p.empresa_id,
    subempresa_id: p.subempresa_id,
  }));

  return (
    <div className="flex flex-col gap-8 pb-12">
      <div className="flex flex-col gap-6">
        <Link
          href={`/sst/${form.id}`}
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors w-fit"
        >
          <ChevronLeft className="h-4 w-4" /> Volver al detalle
        </Link>
        <div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white uppercase">
            Editar ATS
          </h1>
          <p className="mt-2 text-[10px] md:text-sm font-medium text-white/40 uppercase tracking-widest">
            {form.codigo_consecutivo || form.id.split("-")[0]}
          </p>
        </div>
      </div>

      <AtsForm
        modo="editar"
        proyectos={proyectosOpt}
        empleados={empleados}
        responsableNombre={perfil?.nombre ?? "Responsable"}
        formulario={{
          id: form.id,
          proyecto_id: form.proyecto_id,
          ubicacion: form.ubicacion ?? "",
          area: form.area ?? "",
          pasos,
          trabajadoresIds,
          tieneFirma,
        }}
      />
    </div>
  );
}
