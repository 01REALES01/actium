import { redirect } from "next/navigation";

// El detalle del parte ahora vive en el contexto del proyecto (cockpit diario).
// Se conserva esta ruta como redirección para enlaces antiguos.
export default function ParteBitacoraRedirect({
  params,
}: {
  params: { proyectoId: string; fecha: string };
}) {
  redirect(`/proyectos/${params.proyectoId}/parte/${params.fecha}`);
}
