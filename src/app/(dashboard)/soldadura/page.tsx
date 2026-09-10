import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText, FlaskConical, UserCheck, Plus, FileWarning } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, esSuperAdmin } from "@/lib/auth/roles";
import { listarDocumentosSoldadura, contarDocumentosPorTipo } from "@/lib/data/soldadura";
import { SoldaduraFiltros } from "@/components/soldadura/soldadura-filtros";
import {
  SIGLA_TIPO_SOLDADURA,
  NOMBRE_TIPO_SOLDADURA,
  DESCRIPCION_TIPO_SOLDADURA,
  NOMBRE_VARIANTE,
  TIPOS_SOLDADURA,
  esTipoSoldadura,
  esVarianteSoldadura,
  type DocumentoTipo,
} from "@/constants/soldadura";

const ICONO_TIPO: Record<DocumentoTipo, React.ReactNode> = {
  wps: <FileText className="h-6 w-6" strokeWidth={1.5} />,
  pqr: <FlaskConical className="h-6 w-6" strokeWidth={1.5} />,
  wpq: <UserCheck className="h-6 w-6" strokeWidth={1.5} />,
};

const COLOR_TIPO: Record<DocumentoTipo, { caja: string; texto: string }> = {
  wps: { caja: "bg-actium-orange/10 border-actium-orange/20 text-actium-orange", texto: "text-actium-orange" },
  pqr: { caja: "bg-actium-amber/10 border-actium-amber/20 text-actium-amber", texto: "text-actium-amber" },
  wpq: { caja: "bg-actium-sandy/10 border-actium-sandy/20 text-actium-sandy", texto: "text-actium-sandy" },
};

export default async function SoldaduraPage({
  searchParams,
}: {
  searchParams: { tipo?: string; variante?: string; q?: string };
}) {
  const supabase = createClient();
  const perfil = await getPerfilActual(supabase);
  if (!esSuperAdmin(perfil?.rol)) redirect("/proyectos");

  const tipo = searchParams.tipo && esTipoSoldadura(searchParams.tipo) ? searchParams.tipo : undefined;
  const variante =
    searchParams.variante && esVarianteSoldadura(searchParams.variante) ? searchParams.variante : undefined;
  const q = searchParams.q || "";

  const [documentos, conteo] = await Promise.all([
    listarDocumentosSoldadura(supabase, { tipo, variante, q }),
    contarDocumentosPorTipo(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6 pb-12 md:gap-8">
      <div>
        <h1 className="font-display text-[28px] uppercase tracking-tight text-text-primary md:text-[32px]">
          Documentos de soldadura
        </h1>
        <p className="mt-2 max-w-2xl text-sm font-normal text-text-secondary">
          Archivo de procedimientos y calificaciones: especificación del procedimiento (WPS),
          registro de calificación (PQR) y calificación del soldador (WPQ), bajo ASME IX o AWS D1.2.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TIPOS_SOLDADURA.map((t) => (
          <Link
            key={t}
            href={`/soldadura/nuevo/${t}`}
            className="group flex flex-col gap-4 rounded-actium border border-border-subtle bg-bg-elevated p-6 shadow-actium transition-all duration-200 hover:border-actium-orange/30 hover:shadow-actium-glow"
          >
            <div className="flex items-start justify-between gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl border ${COLOR_TIPO[t].caja}`}>
                {ICONO_TIPO[t]}
              </div>
              <span className="font-display text-2xl text-text-primary">{conteo[t]}</span>
            </div>
            <div>
              <p className="font-subtitle text-lg font-semibold text-text-primary">
                {SIGLA_TIPO_SOLDADURA[t]}
              </p>
              <p className="mt-0.5 text-xs text-text-secondary">{NOMBRE_TIPO_SOLDADURA[t]}</p>
              <p className="mt-2 text-xs leading-relaxed text-text-muted">
                {DESCRIPCION_TIPO_SOLDADURA[t]}
              </p>
            </div>
            <span className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-widest ${COLOR_TIPO[t].texto}`}>
              <Plus className="h-4 w-4" /> Crear {SIGLA_TIPO_SOLDADURA[t]}
            </span>
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <SoldaduraFiltros tipo={tipo ?? "todos"} variante={variante ?? "todos"} q={q} />

        {documentos.length === 0 ? (
          <div className="rounded-actium border border-dashed border-border-subtle bg-bg-elevated p-10 text-center">
            <FileWarning className="mx-auto h-8 w-8 text-text-muted" strokeWidth={1.5} />
            <p className="mt-4 text-sm text-text-secondary">
              {q || tipo || variante
                ? "Ningún documento coincide con la búsqueda. Ajuste los filtros."
                : "Aún no hay documentos de soldadura registrados. Cree el primero."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-actium border border-border-subtle bg-bg-elevated">
            {/* Escritorio: tabla. Móvil: la misma información apilada. */}
            <table className="hidden w-full md:table">
              <thead>
                <tr className="bg-actium-espresso text-left text-sm font-semibold uppercase tracking-wider text-white">
                  <th className="px-4 py-3 text-xs">Consecutivo</th>
                  <th className="px-4 py-3 text-xs">Número</th>
                  <th className="px-4 py-3 text-xs">Formato</th>
                  <th className="px-4 py-3 text-xs">Proceso</th>
                  <th className="px-4 py-3 text-xs">Referencias</th>
                  <th className="px-4 py-3 text-xs">Fecha</th>
                  <th className="px-4 py-3 text-xs">Estado</th>
                </tr>
              </thead>
              <tbody>
                {documentos.map((d) => (
                  <tr key={d.id} className="border-b border-border-subtle transition-colors hover:bg-bg-hover">
                    <td className="px-4 py-3">
                      <Link href={`/soldadura/${d.id}`} className="text-sm font-semibold text-actium-orange">
                        {d.codigo_consecutivo || "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary">{d.numero || "—"}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {SIGLA_TIPO_SOLDADURA[d.tipo]} · {NOMBRE_VARIANTE[d.variante]}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{d.proceso || "—"}</td>
                    <td className="px-4 py-3 text-xs text-text-muted">
                      {[d.wps_ref && `WPS ${d.wps_ref}`, d.pqr_ref && `PQR ${d.pqr_ref}`]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{d.fecha || "—"}</td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={d.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="divide-y divide-border-subtle md:hidden">
              {documentos.map((d) => (
                <Link key={d.id} href={`/soldadura/${d.id}`} className="flex min-h-[44px] flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-actium-orange">{d.codigo_consecutivo || "—"}</p>
                      <p className="truncate text-sm text-text-primary">{d.numero || d.titulo || "Sin número"}</p>
                    </div>
                    <EstadoBadge estado={d.estado} />
                  </div>
                  <p className="text-xs text-text-secondary">
                    {SIGLA_TIPO_SOLDADURA[d.tipo]} · {NOMBRE_VARIANTE[d.variante]}
                    {d.proceso ? ` · ${d.proceso}` : ""}
                    {d.fecha ? ` · ${d.fecha}` : ""}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const esBorrador = estado === "borrador";
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-3 py-0.5 text-xs font-semibold ${
        esBorrador
          ? "border-warning/20 bg-warning/15 text-warning"
          : "border-success/20 bg-success/15 text-success"
      }`}
    >
      {esBorrador ? "Borrador" : "Emitido"}
    </span>
  );
}
