import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getConteo, getConteoResumen, listItemsConteo, getProyectoNombre } from "@/lib/data/inventario";
import { getSignedUrl } from "@/lib/storage";
import { ConteoChecklist } from "@/components/inventario/conteo-checklist";
import { ConteoResumen } from "@/components/inventario/conteo-resumen";

export default async function ConteoDetallePage({
  params,
}: {
  params: { conteoId: string };
}) {
  const supabase = createClient();

  const conteo = await getConteo(supabase, params.conteoId);
  if (!conteo) notFound();

  const [items, proyecto] = await Promise.all([
    listItemsConteo(supabase, conteo.id),
    conteo.proyecto_id ? getProyectoNombre(supabase, conteo.proyecto_id) : Promise.resolve(null),
  ]);

  const ambitoNombre = conteo.proyecto_id ? proyecto?.nombre ?? "Proyecto" : "Bodega";
  const empresaNombre = conteo.proyecto_id ? proyecto?.empresas?.nombre ?? null : null;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div>
        <Link
          href="/inventario/herramientas/conteos"
          className="inline-flex items-center gap-1.5 text-sm text-[--text-secondary] hover:text-[--text-primary]"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={1.5} />
          Conteos
        </Link>
        <h1 className="mt-2 font-display text-3xl text-[--text-primary]">{ambitoNombre}</h1>
        <p className="mt-2 text-sm text-[--text-secondary]">
          {empresaNombre ? `${empresaNombre} · ` : ""}
          {conteo.estado === "borrador" ? "Conteo en progreso" : "Conteo cerrado"}
        </p>
      </div>

      {conteo.estado === "borrador" ? (
        <ConteoChecklist
          conteoId={conteo.id}
          ambitoNombre={ambitoNombre}
          empresaNombre={empresaNombre}
          itemsIniciales={items}
        />
      ) : (
        <ConteoResumenSection conteoId={conteo.id} conteo={conteo} items={items} />
      )}
    </div>
  );
}

async function ConteoResumenSection({
  conteoId,
  conteo,
  items,
}: {
  conteoId: string;
  conteo: NonNullable<Awaited<ReturnType<typeof getConteo>>>;
  items: Awaited<ReturnType<typeof listItemsConteo>>;
}) {
  const supabase = createClient();
  const resumen = await getConteoResumen(supabase, conteoId);
  if (!resumen) notFound();

  const pdfUrl = conteo.pdf_path ? await getSignedUrl(supabase, "pdfs-inventario", conteo.pdf_path) : null;

  return <ConteoResumen conteo={conteo} resumen={resumen} items={items} pdfUrl={pdfUrl} />;
}
