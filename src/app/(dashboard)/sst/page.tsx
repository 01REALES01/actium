import Link from "next/link";
import {
  ShieldAlert,
  CheckCircle2,
  FileText,
  AlertTriangle,
  FileSignature,
  List,
  UserMinus,
  Flame,
  ArrowUpFromLine,
  ClipboardList,
  ClipboardCheck,
  HardHat,
  ChevronRight,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getPerfilActual, puedeCrearFormularioSST, puedeGestionarSST } from "@/lib/auth/roles";
import { listFormularios } from "@/lib/data/sst";
import { hoyLocal } from "@/lib/fecha";
import { listProyectos } from "@/lib/data/proyectos";
import { Badge } from "@/components/ui/badge";
import { SSTFilters } from "@/components/sst/sst-filters";
import { BotonEliminarSST } from "@/components/sst/boton-eliminar-sst";
import { ETIQUETA_TIPO_SST } from "@/lib/sst/tipos";

function claseEstado(estado: string) {
  if (estado === "completado") return "border-success/20 bg-success/15 text-success";
  if (estado === "firmado") return "border-info/20 bg-info/15 text-info";
  if (estado === "borrador") return "border-warning/20 bg-warning/15 text-warning";
  return "border-border-subtle bg-bg-hover text-text-muted";
}

export default async function SstDashboardPage({
  searchParams,
}: {
  searchParams?: { tipo?: string; estado?: string };
}) {
  const supabase = createAdminClient();
  const perfil = await getPerfilActual(createClient());
  const puedeCrearPermiso = puedeCrearFormularioSST(perfil?.rol);
  const puedeEliminar = puedeGestionarSST(perfil?.rol);

  const filtros: { tipo?: any; estado?: any } = {};
  if (searchParams?.tipo && searchParams.tipo !== "todos") filtros.tipo = searchParams.tipo;
  if (searchParams?.estado && searchParams.estado !== "todos") filtros.estado = searchParams.estado;

  const [formularios, proyectos] = await Promise.all([
    listFormularios(supabase, filtros),
    listProyectos(supabase),
  ]);

  const [
    { count: totalIncidentes },
    { count: totalAccidentesGraves },
    { count: totalAusentismosActivos },
  ] = await Promise.all([
    supabase.from("incidentes").select("*", { count: "exact", head: true }).is("deleted_at", null),
    supabase
      .from("incidentes")
      .select("*", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("tipo", "accidente")
      .in("severidad", ["grave", "critico"]),
    supabase
      .from("ausentismos")
      .select("*", { count: "exact", head: true })
      .lte("fecha_inicio", hoyLocal())
      .gte("fecha_fin", hoyLocal()),
  ]);

  const proyectosMap = new Map(proyectos.map((p) => [p.id, p.nombre]));

  const tipoIcon: Record<string, React.ReactNode> = {
    ats: <ShieldAlert className="h-4 w-4 text-actium-orange" />,
    permiso_altura: <AlertTriangle className="h-4 w-4 text-warning" />,
    permiso_caliente: <Flame className="h-4 w-4 text-danger" />,
    preoperacional: <ClipboardCheck className="h-4 w-4 text-actium-sandy" />,
    entrega_epp: <HardHat className="h-4 w-4 text-actium-amber" />,
  };

  const tipoLabel = ETIQUETA_TIPO_SST;

  const tarjetas = [
    {
      href: "/sst/nuevo-ats",
      titulo: "Análisis de Trabajo Seguro",
      subtitulo: "Crear ATS Oficial",
      icono: <ShieldAlert className="h-6 w-6" strokeWidth={1.5} />,
      iconoBg: "bg-actium-orange/10 border-actium-orange/20 text-actium-orange",
      subtituloColor: "text-actium-orange",
    },
    {
      href: "/sst/permiso-altura",
      titulo: "Permiso en Alturas",
      subtitulo: "Nuevo Permiso",
      icono: <ArrowUpFromLine className="h-6 w-6" strokeWidth={1.5} />,
      iconoBg: "bg-warning/10 border-warning/20 text-warning",
      subtituloColor: "text-warning",
    },
    {
      href: "/sst/permiso-caliente",
      titulo: "Permiso en Caliente",
      subtitulo: "Nuevo Permiso",
      icono: <Flame className="h-6 w-6" strokeWidth={1.5} />,
      iconoBg: "bg-danger/10 border-danger/20 text-danger",
      subtituloColor: "text-danger",
    },
    {
      href: "/sst/preoperacional",
      titulo: "Inspecciones Preoperacionales",
      subtitulo: "Inspección de Equipos",
      icono: <ClipboardCheck className="h-6 w-6" strokeWidth={1.5} />,
      iconoBg: "bg-actium-sandy/10 border-actium-sandy/20 text-actium-sandy",
      subtituloColor: "text-actium-sandy",
    },
    {
      href: "/sst/entrega-epp",
      titulo: "Formato Entrega EPP",
      subtitulo: "Constancia por Trabajador",
      icono: <HardHat className="h-6 w-6" strokeWidth={1.5} />,
      iconoBg: "bg-actium-amber/10 border-actium-amber/20 text-actium-amber",
      subtituloColor: "text-actium-amber",
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-12 md:gap-8">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-display text-[28px] tracking-tight text-text-primary uppercase md:text-[32px]">
            Gestión de Permisos
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-normal text-text-secondary">
            Control de permisos de trabajo, análisis de seguridad y registros digitales en campo.
          </p>
        </div>

        <div className="flex w-full rounded-xl border border-border-subtle bg-bg-secondary p-1">
          <div className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-actium-orange/10 px-3 text-xs font-semibold uppercase tracking-widest text-actium-orange">
            <List className="h-4 w-4" />
            Permisos
          </div>
          <Link
            href="/sst/bitacora"
            className="flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-3 text-xs font-semibold uppercase tracking-widest text-text-secondary transition-all duration-200 hover:bg-bg-hover hover:text-text-primary"
          >
            <ClipboardList className="h-4 w-4" />
            Bitácora
          </Link>
        </div>
      </div>

      {puedeCrearPermiso && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tarjetas.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="group flex min-h-[44px] items-center gap-4 rounded-actium border border-border-subtle bg-bg-elevated p-4 shadow-actium transition-all duration-200 hover:border-actium-orange/30 hover:shadow-actium-glow"
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border ${t.iconoBg}`}
              >
                {t.icono}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-subtitle text-base font-semibold text-text-primary">{t.titulo}</h3>
                <p className={`mt-0.5 text-xs font-medium ${t.subtituloColor}`}>{t.subtitulo}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-text-muted" />
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <div className="flex items-center gap-3 rounded-actium border border-border-subtle bg-bg-elevated p-4 shadow-actium">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-actium-orange/10">
            <FileSignature className="h-5 w-5 text-actium-orange" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">Formularios</p>
            <p className="font-display text-2xl text-text-primary">{formularios.length}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-actium border border-border-subtle bg-bg-elevated p-4 shadow-actium">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success/10">
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">Completados</p>
            <p className="font-display text-2xl text-text-primary">
              {formularios.filter((f) => f.estado === "completado" || f.estado === "firmado").length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-actium border border-border-subtle bg-bg-elevated p-4 shadow-actium">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-warning/10">
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">Incidentes</p>
            <p className="font-display text-2xl text-text-primary">{totalIncidentes ?? 0}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-actium border border-border-subtle bg-bg-elevated p-4 shadow-actium">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-danger/10">
            <ShieldAlert className="h-5 w-5 text-danger" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">Acc. graves</p>
            <p className="font-display text-2xl text-text-primary">{totalAccidentesGraves ?? 0}</p>
          </div>
        </div>
        <div className="col-span-2 flex items-center gap-3 rounded-actium border border-border-subtle bg-bg-elevated p-4 shadow-actium md:col-span-1">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-actium-amber/10">
            <UserMinus className="h-5 w-5 text-actium-amber" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-text-muted">Ausentes hoy</p>
            <p className="font-display text-2xl text-text-primary">{totalAusentismosActivos ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-actium border border-border-subtle bg-bg-elevated p-4 shadow-actium md:p-6">
        <div className="flex flex-col gap-4">
          <h2 className="font-subtitle text-lg font-semibold uppercase tracking-wide text-text-secondary">
            Historial de registros
          </h2>
          <SSTFilters
            currentTipo={searchParams?.tipo || "todos"}
            currentEstado={searchParams?.estado || "todos"}
          />
        </div>

        {formularios.length === 0 ? (
          <div className="border-t border-border-subtle py-12 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-text-muted" />
            <p className="text-sm font-medium text-text-secondary">
              {searchParams?.tipo || searchParams?.estado
                ? "No hay formularios que coincidan con los filtros."
                : "Aún no hay formularios registrados. Crea el primero."}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 lg:hidden">
              {formularios.map((form) => (
                <article
                  key={form.id}
                  className="rounded-actium border border-border-subtle bg-bg-secondary p-4"
                >
                  <Link href={`/sst/${form.id}`} className="block min-h-[44px]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        {tipoIcon[form.tipo] || <FileText className="h-4 w-4 text-text-muted" />}
                        <span className="truncate text-sm font-semibold uppercase tracking-wide text-text-primary">
                          {tipoLabel[form.tipo] || form.tipo}
                        </span>
                      </div>
                      <Badge variant="outline" className={`shrink-0 ${claseEstado(form.estado)}`}>
                        {form.estado}
                      </Badge>
                    </div>
                    <p className="mt-3 truncate text-sm text-text-secondary">
                      {proyectosMap.get(form.proyecto_id) || "Proyecto desconocido"}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {new Date(form.created_at).toLocaleDateString("es-CO", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {" · "}
                      {form.ubicacion || form.ciudad || "Sin ubicación"}
                    </p>
                  </Link>
                  <div className="mt-4 flex items-stretch gap-2">
                    <Link
                      href={`/sst/${form.id}`}
                      className="inline-flex h-11 min-h-[44px] flex-1 items-center justify-center rounded-xl border border-actium-orange px-4 text-xs font-semibold uppercase tracking-widest text-actium-orange transition-all duration-200 hover:bg-actium-orange/10"
                    >
                      Ver permiso
                    </Link>
                    {puedeEliminar && (
                      <BotonEliminarSST formularioId={form.id} variante="completo" className="flex-1" />
                    )}
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-actium-espresso text-white">
                    <th className="px-4 py-3 text-sm font-semibold uppercase tracking-wider">Fecha</th>
                    <th className="px-4 py-3 text-sm font-semibold uppercase tracking-wider">Tipo</th>
                    <th className="px-4 py-3 text-sm font-semibold uppercase tracking-wider">Proyecto</th>
                    <th className="px-4 py-3 text-sm font-semibold uppercase tracking-wider">Ubicación</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {formularios.map((form) => (
                    <tr key={form.id} className="border-b border-border-subtle transition-colors hover:bg-bg-hover">
                      <td className="px-4 py-3">
                        <Link href={`/sst/${form.id}`} className="block min-h-[44px] py-2">
                          <p className="text-sm font-medium text-text-primary">
                            {new Date(form.created_at).toLocaleDateString("es-CO", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </p>
                          <p className="mt-0.5 text-xs text-text-muted">{form.id.split("-")[0]}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/sst/${form.id}`} className="flex min-h-[44px] items-center gap-2">
                          {tipoIcon[form.tipo] || <FileText className="h-4 w-4 text-text-muted" />}
                          <span className="text-sm font-medium uppercase tracking-wide text-text-primary">
                            {tipoLabel[form.tipo] || form.tipo}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/sst/${form.id}`} className="block min-h-[44px] py-2">
                          <p className="max-w-[220px] truncate text-sm text-text-secondary">
                            {proyectosMap.get(form.proyecto_id) || "Desconocido"}
                          </p>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/sst/${form.id}`} className="block min-h-[44px] py-2 text-sm text-text-secondary">
                          {form.ubicacion || form.ciudad || "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline" className={claseEstado(form.estado)}>
                          {form.estado}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/sst/${form.id}`}
                            className="inline-flex h-11 min-h-[44px] items-center rounded-xl px-3 text-xs font-semibold uppercase tracking-widest text-actium-orange transition-all duration-200 hover:bg-actium-orange/10"
                          >
                            Ver
                          </Link>
                          {puedeEliminar && <BotonEliminarSST formularioId={form.id} variante="icono" />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
