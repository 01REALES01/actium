import { redirect } from "next/navigation";

// La edición del parte (check-in de asistencia) se consolidó en la vista del
// parte mediante el modal "Pasar asistencia". Esta ruta se conserva solo para
// no romper enlaces guardados y redirige al parte del día.
export default function EditarParteDiaPage({
  params,
}: {
  params: { id: string; fecha: string };
}) {
  redirect(`/proyectos/${params.id}/parte/${params.fecha}`);
}
