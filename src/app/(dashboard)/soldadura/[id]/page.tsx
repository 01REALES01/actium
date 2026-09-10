import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ChevronLeft,
  FileText,
  CalendarDays,
  User,
  Link2,
  FileEdit,
  Download,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, esSuperAdmin } from "@/lib/auth/roles";
import { obtenerDocumentoSoldadura } from "@/lib/data/soldadura";
import { EliminarDocumentoSoldadura } from "@/components/soldadura/eliminar-documento-soldadura";
import {
  obtenerEspec,
  SIGLA_TIPO_SOLDADURA,
  NOMBRE_TIPO_SOLDADURA,
  NOMBRE_VARIANTE,
  NORMA_VARIANTE,
} from "@/constants/soldadura";

export default async function DocumentoSoldaduraDetallePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!esSuperAdmin(perfil?.rol)) redirect("/proyectos");

  const doc = await obtenerDocumentoSoldadura(supabase, params.id);
  if (!doc) notFound();

  const espec = obtenerEspec(doc.tipo, doc.variante);
  const esBorrador = doc.estado === "borrador";

  // Un borrador reserva la ruta del PDF pero todavía no lo ha generado.
  let pdfUrl: string | null = null;
  if (doc.pdf_generado_path && !esBorrador) {
    const { data } = await supabase.storage
      .from("pdfs-formularios")
      .createSignedUrl(doc.pdf_generado_path, 3600);
    pdfUrl = data?.signedUrl ?? null;
  }

  const creador = doc.creado_por
    ? (
        await supabase.from("usuarios").select("nombre").eq("id", doc.creado_por).single()
      ).data as { nombre: string } | null
    : null;

  const datos = [
    { icono: <FileText className="h-4 w-4" strokeWidth={1.5} />, rotulo: "Número del documento", valor: doc.numero },
    { icono: <CalendarDays className="h-4 w-4" strokeWidth={1.5} />, rotulo: "Fecha", valor: doc.fecha },
    { icono: <FileText className="h-4 w-4" strokeWidth={1.5} />, rotulo: "Proceso(s)", valor: doc.proceso },
    { icono: <FileEdit className="h-4 w-4" strokeWidth={1.5} />, rotulo: "Revisión", valor: doc.revision },
    { icono: <Link2 className="h-4 w-4" strokeWidth={1.5} />, rotulo: "WPS de referencia", valor: doc.wps_ref },
    { icono: <Link2 className="h-4 w-4" strokeWidth={1.5} />, rotulo: "PQR de referencia", valor: doc.pqr_ref },
    { icono: <User className="h-4 w-4" strokeWidth={1.5} />, rotulo: "Registrado por", valor: creador?.nombre ?? null },
  ].filter((d) => d.valor);

  return (
    <div className="flex flex-col gap-6 pb-12 md:gap-8">
      <Link
        href="/soldadura"
        className="flex w-fit items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-secondary transition-colors hover:text-text-primary"
      >
        <ChevronLeft className="h-4 w-4" /> Volver a documentos de soldadura
      </Link>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-[28px] uppercase tracking-tight text-text-primary md:text-[32px]">
              {SIGLA_TIPO_SOLDADURA[doc.tipo]} {doc.numero || ""}
            </h1>
            <span
              className={`rounded-full border px-3 py-0.5 text-xs font-semibold ${
                esBorrador
                  ? "border-warning/20 bg-warning/15 text-warning"
                  : "border-success/20 bg-success/15 text-success"
              }`}
            >
              {esBorrador ? "Borrador" : "Emitido"}
            </span>
          </div>
          <p className="mt-2 text-sm text-text-secondary">{NOMBRE_TIPO_SOLDADURA[doc.tipo]}</p>
          <p className="mt-1 text-xs uppercase tracking-widest text-text-muted">
            {doc.codigo_consecutivo} · {espec.formulario} · {NOMBRE_VARIANTE[doc.variante]} ·{" "}
            {NORMA_VARIANTE[doc.variante]}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {esBorrador && (
            <Link
              href={`/soldadura/nuevo/${doc.tipo}?borradorId=${doc.id}`}
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-actium-orange px-6 py-2.5 font-semibold text-white shadow-actium transition-all duration-200 hover:bg-actium-orange-hover hover:shadow-actium-lg"
            >
              <FileEdit className="h-4 w-4" /> Continuar diligenciando
            </Link>
          )}
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-actium-orange px-6 py-2.5 font-semibold text-actium-orange transition-all duration-200 hover:bg-actium-orange/10"
            >
              <Download className="h-4 w-4" /> Ver PDF
            </a>
          )}
          <EliminarDocumentoSoldadura id={doc.id} rotulo={`${SIGLA_TIPO_SOLDADURA[doc.tipo]} ${doc.numero || doc.codigo_consecutivo || ""}`} />
        </div>
      </div>

      <div className="rounded-actium border border-border-subtle bg-bg-elevated p-6 shadow-actium">
        <h2 className="font-subtitle text-lg font-semibold text-text-primary">Datos del documento</h2>
        {datos.length === 0 ? (
          <p className="mt-4 text-sm text-text-secondary">
            Este borrador todavía no tiene datos de identificación diligenciados.
          </p>
        ) : (
          <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {datos.map((d) => (
              <div key={d.rotulo} className="flex items-start gap-3">
                <span className="mt-0.5 text-actium-orange">{d.icono}</span>
                <div className="min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                    {d.rotulo}
                  </dt>
                  <dd className="mt-0.5 truncate text-sm font-medium text-text-primary">{d.valor}</dd>
                </div>
              </div>
            ))}
          </dl>
        )}
        <p className="mt-6 text-xs leading-relaxed text-text-muted">
          El contenido completo del formato —variables, ensayos, croquis y firmas— está en el PDF.
          Aquí solo se muestran los datos por los que se busca en el archivo.
        </p>
      </div>

      {pdfUrl && (
        <div className="overflow-hidden rounded-actium border border-border-subtle bg-bg-elevated shadow-actium">
          <iframe src={pdfUrl} title={`${espec.formulario} ${doc.codigo_consecutivo}`} className="h-[70vh] w-full" />
        </div>
      )}
    </div>
  );
}
