import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, puedeGestionarProyectos } from "@/lib/auth/roles";
import { getProyecto } from "@/lib/data/proyectos";
import { listEmpresas, listSubempresas } from "@/lib/data/organizacion";
import { ProyectoForm } from "@/components/projects/proyecto-form";

type EditarProyectoPageProps = {
  params: { id: string };
};

export default async function EditarProyectoPage({ params }: EditarProyectoPageProps) {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);

  if (!puedeGestionarProyectos(perfil?.rol)) {
    redirect(`/proyectos/${params.id}`);
  }

  const [proyecto, empresas, subempresas] = await Promise.all([
    getProyecto(supabase, params.id),
    listEmpresas(supabase),
    listSubempresas(supabase),
  ]);

  if (!proyecto) notFound();

  return (
    <ProyectoForm
      modo="editar"
      proyecto={proyecto}
      empresas={empresas.map((e) => ({ id: e.id, nombre: e.nombre }))}
      subempresas={subempresas.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        empresa_id: s.empresa_id,
      }))}
    />
  );
}
