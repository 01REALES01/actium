import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft, ShieldAlert, FileText, MapPin, User, CalendarDays, Pencil, PenLine, FileEdit } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPerfilActual, puedeCrearFormularioSST, puedeGestionarSST } from "@/lib/auth/roles";
import { PersonalEjecutor, type TrabajadorItem } from "@/components/sst/personal-ejecutor";
import { AtsAcciones } from "@/components/sst/ats-acciones";
import { BotonEliminarSST } from "@/components/sst/boton-eliminar-sst";
import { FormularioFotos } from "@/components/sst/formulario-fotos";
import { RegenerarPreoperacionalPdf } from "@/components/sst/regenerar-preoperacional-pdf";
import { getFotosFormulario } from "@/lib/data/formularios-fotos";
import type { Tables } from "@/types/database.types";
import { RUTA_FORMULARIO_SST, NOMBRE_TIPO_SST, tieneCierre } from "@/lib/sst/tipos";

type Props = {
  params: { id: string };
};

export default async function FormularioDetallePage({ params }: Props) {
  const supabase = createClient();

  // Obtener formulario
  const { data: formData, error } = await supabase
    .from("formularios")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !formData) notFound();
  const form = formData as Tables<"formularios">;

  // Un borrador reserva la ruta del PDF pero todavía no lo ha generado.
  let pdfSignedUrl: string | null = null;
  if (form.pdf_generado_path && form.estado !== "borrador") {
    const { data: signedData } = await supabase.storage
      .from("pdfs-formularios")
      .createSignedUrl(form.pdf_generado_path, 3600);
    pdfSignedUrl = signedData?.signedUrl ?? null;
  }

  const perfil = await getPerfilActual(supabase);
  const puedeGestionar = puedeCrearFormularioSST(perfil?.rol);
  const puedeEliminar = puedeGestionarSST(perfil?.rol);
  const formAbierto = form.estado !== "firmado" && form.estado !== "archivado";
  const puedeEditar = form.tipo === "ats" && formAbierto && puedeGestionar;

  const rutaFormulario = RUTA_FORMULARIO_SST[form.tipo] ?? null;
  const esBorrador = form.estado === "borrador";

  // Un borrador todavía no se emitió: se continúa diligenciando, no se cierra.
  // La inspección preoperacional tampoco tiene cierre: se firma una sola vez.
  const cierreUrl =
    rutaFormulario && !esBorrador && tieneCierre(form.tipo)
      ? `${rutaFormulario}?cierreId=${form.id}`
      : null;
  const borradorUrl = rutaFormulario && esBorrador ? `${rutaFormulario}?borradorId=${form.id}` : null;

  // Obtener proyecto asociado
  const { data: proyectoData } = await supabase
    .from("proyectos")
    .select("nombre, codigo")
    .eq("id", form.proyecto_id)
    .single();
  const proyecto = proyectoData as { nombre: string; codigo: string } | null;

  // Obtener creador
  const creadorResult = form.creado_por
    ? await supabase
        .from("usuarios")
        .select("nombre, email")
        .eq("id", form.creado_por)
        .single()
    : { data: null };
  const creador = creadorResult.data as { nombre: string; email: string } | null;

  // Registro fotográfico. La tabla es genérica por formulario_id; por ahora la
  // usan la inspección preoperacional y la charla de seguridad.
  const esPreoperacional = form.tipo === "preoperacional";
  const esCharlaSeguridad = form.tipo === "charla_seguridad";
  const conFotos = esPreoperacional || esCharlaSeguridad;
  const fotos = conFotos ? await getFotosFormulario(supabase, form.id) : [];
  // La galería suelta solo muestra fotos generales: las de equipo del
  // preoperacional ya salen bajo cada equipo en el PDF, mostrarlas también
  // aquí sin ese contexto sería redundante y confuso.
  const fotosGenerales = fotos.filter((f) => !f.herramienta_id);
  const puedeRegenerarPdf =
    esPreoperacional && form.estado === "firmado" && Boolean(form.pdf_generado_path) && puedeGestionar;

  // Charla de seguridad: cabecera y asistentes.
  let charla: Tables<"charla_seguridad"> | null = null;
  let charlaAsistentes: Tables<"charla_asistentes">[] = [];
  if (esCharlaSeguridad) {
    const [charlaRes, asistentesRes] = await Promise.all([
      supabase.from("charla_seguridad").select("*").eq("formulario_id", form.id).maybeSingle(),
      supabase.from("charla_asistentes").select("*").eq("formulario_id", form.id).order("orden"),
    ]);
    charla = charlaRes.data as Tables<"charla_seguridad"> | null;
    charlaAsistentes = (asistentesRes.data as Tables<"charla_asistentes">[]) ?? [];
  }

  // Si es ATS, obtener pasos y trabajadores
  let atsPasos: any[] = [];
  let atsTrabajadores: any[] = [];

  if (form.tipo === "ats") {
    const [pasosRes, trabajadoresRes] = await Promise.all([
      supabase.from("ats_pasos").select("*").eq("formulario_id", form.id).order("orden"),
      supabase
        .from("ats_trabajadores")
        .select(`*, empleados:empleado_id (nombre, cargo, cedula)`)
        .eq("formulario_id", form.id),
    ]);
    atsPasos = pasosRes.data ?? [];
    atsTrabajadores = trabajadoresRes.data ?? [];
  }

  // Personal ejecutor (excluye la fila del responsable: empleado_id null).
  const ejecutores: TrabajadorItem[] = atsTrabajadores
    .filter((t: any) => t.empleado_id)
    .map((t: any) => ({
      id: t.id,
      nombre: t.empleados?.nombre || t.nombre_libre || "—",
      cargo: t.empleados?.cargo || t.cargo || "Operario",
      cedula: t.empleados?.cedula ?? null,
      firmada: Boolean(t.firma_path),
    }));
  const hayFirmas = ejecutores.some((t) => t.firmada);

  const estadoColor: Record<string, string> = {
    borrador: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    completado: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    firmado: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    archivado: "border-white/10 bg-white/5 text-white/40",
  };

  const tipoLabel = NOMBRE_TIPO_SST;

  return (
    <div className="flex flex-col gap-8 pb-12 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <Link
          href="/sst"
          className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors w-fit"
        >
          <ChevronLeft className="h-4 w-4" /> Volver al Historial SST
        </Link>

        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F25C05]/10">
                {form.tipo === "ats" ? (
                  <ShieldAlert className="h-5 w-5 text-[#F25C05]" />
                ) : (
                  <FileText className="h-5 w-5 text-[#F25C05]" />
                )}
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white uppercase">
                  {tipoLabel[form.tipo] || form.tipo}
                </h1>
                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-1">
                  ID: {form.id.split("-")[0]} &bull; Consecutivo: {form.codigo_consecutivo || "N/A"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Badge
              variant="outline"
              className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase border w-fit ${estadoColor[form.estado] || estadoColor.archivado}`}
            >
              {form.estado}
            </Badge>
            {puedeGestionar && form.tipo === "entrega_epp" && !esBorrador && (
              <Link
                href={`/sst/entrega-epp?proyectoId=${form.proyecto_id}`}
                className="inline-flex h-11 min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[#F27405]/40 bg-[#F27405]/10 px-4 text-[10px] font-bold uppercase tracking-widest text-[#F27405] transition-all hover:bg-[#F27405]/20 sm:w-auto"
              >
                <User className="h-4 w-4" />
                Registrar entrega para otro trabajador
              </Link>
            )}
            {puedeGestionar && borradorUrl && (
              <Link
                href={borradorUrl}
                className="inline-flex h-11 min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-actium-orange px-4 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-actium-orange-hover sm:w-auto"
              >
                <FileEdit className="h-4 w-4" />
                Continuar diligenciamiento
              </Link>
            )}
            {puedeGestionar && cierreUrl && (
              <Link
                href={cierreUrl}
                className="inline-flex h-11 min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-actium-orange bg-actium-orange/10 px-4 text-[10px] font-bold uppercase tracking-widest text-actium-orange transition-all hover:bg-actium-orange/20 sm:w-auto"
              >
                <PenLine className="h-4 w-4" />
                Firmas de Cierre
              </Link>
            )}
            {pdfSignedUrl && (
              <a
                href={pdfSignedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 min-h-[44px] w-full items-center justify-center gap-2 rounded-xl bg-actium-orange px-4 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-actium-orange-hover sm:w-auto"
              >
                <FileText className="h-4 w-4" />
                Descargar PDF
              </a>
            )}
            {puedeEliminar && (
              <BotonEliminarSST formularioId={form.id} />
            )}
            {/* Editar removido temporalmente hasta integrar AtsFormatoForm */}
          </div>
        </div>

        {form.tipo === "ats" && (
          <AtsAcciones
            formularioId={form.id}
            estado={form.estado}
            puedeGestionar={puedeGestionar}
            hayFirmas={hayFirmas}
          />
        )}
      </div>

      {esBorrador && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
          <FileEdit className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
          <p className="text-xs leading-relaxed text-white/80">
            <strong className="text-amber-400">Borrador sin emitir.</strong> Este formulario aún no
            tiene PDF ni firmas. Continúe el diligenciamiento para emitirlo.
          </p>
        </div>
      )}

      {/* Info General */}
      <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
        <h2 className="text-xs font-bold tracking-widest text-white/50 uppercase mb-6">Información General</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
              <FileText className="h-4 w-4 text-white/40" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Proyecto</p>
              <p className="text-sm font-bold text-white mt-0.5">
                {proyecto?.nombre || "Desconocido"}
                {proyecto?.codigo && <span className="text-white/30 ml-1">#{proyecto.codigo}</span>}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
              <MapPin className="h-4 w-4 text-white/40" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Ubicación</p>
              <p className="text-sm font-medium text-white/80 mt-0.5">{form.ubicacion || form.ciudad || "—"}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
              <CalendarDays className="h-4 w-4 text-white/40" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Fecha</p>
              <p className="text-sm font-medium text-white/80 mt-0.5">
                {form.fecha_inicio
                  ? new Date(form.fecha_inicio + "T12:00:00").toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : new Date(form.created_at).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5">
              <User className="h-4 w-4 text-white/40" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Creado Por</p>
              <p className="text-sm font-medium text-white/80 mt-0.5">{creador?.nombre || "Sistema"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charla de seguridad: temas y asistentes */}
      {esCharlaSeguridad && charla && (
        <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
          <h2 className="text-xs font-bold tracking-widest text-white/50 uppercase mb-6">Charla de seguridad</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Tema</p>
              <p className="text-sm font-medium text-white/80 mt-0.5">{charla.tema}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Capacitador</p>
              <p className="text-sm font-medium text-white/80 mt-0.5">
                {charla.capacitador_nombre}
                {charla.capacitador_cargo && <span className="text-white/30"> · {charla.capacitador_cargo}</span>}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Duración</p>
              <p className="text-sm font-medium text-white/80 mt-0.5">
                {charla.duracion_minutos ? `${charla.duracion_minutos} min` : "—"}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Resultado general</p>
              <p className="text-sm font-medium text-white/80 mt-0.5">{charla.resultado_general || "—"}</p>
            </div>
          </div>

          <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">
            Asistentes ({charlaAsistentes.length})
          </h3>
          {charlaAsistentes.length === 0 ? (
            <p className="text-xs text-white/40">No se registraron asistentes.</p>
          ) : (
            <>
              {/* Móvil: tarjetas apiladas */}
              <div className="space-y-2 sm:hidden">
                {charlaAsistentes.map((a) => (
                  <div key={a.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                    <p className="text-sm font-bold text-white">{a.nombre}</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">
                      {a.cargo || "Sin cargo"} · {a.empresa || "—"}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-[10px] uppercase tracking-widest">
                      <span className={a.firmo ? "text-emerald-400" : "text-white/30"}>
                        {a.firmo ? "Firmó" : "Sin firmar"}
                      </span>
                      {a.evaluacion && <span className="text-white/30">· {a.evaluacion}</span>}
                    </div>
                  </div>
                ))}
              </div>
              {/* Escritorio: tabla */}
              <div className="hidden sm:block overflow-x-auto rounded-lg border border-white/5">
                <table className="w-full text-left text-xs">
                  <thead className="bg-actium-espresso text-white uppercase tracking-wider">
                    <tr>
                      <th className="px-3 py-2 font-semibold">N°</th>
                      <th className="px-3 py-2 font-semibold">Nombre</th>
                      <th className="px-3 py-2 font-semibold">Cargo</th>
                      <th className="px-3 py-2 font-semibold">Empresa</th>
                      <th className="px-3 py-2 font-semibold">Evaluación</th>
                      <th className="px-3 py-2 font-semibold">Firmó</th>
                    </tr>
                  </thead>
                  <tbody>
                    {charlaAsistentes.map((a) => (
                      <tr key={a.id} className="border-b border-white/5 text-white/70">
                        <td className="px-3 py-2">{a.orden}</td>
                        <td className="px-3 py-2 font-medium text-white">{a.nombre}</td>
                        <td className="px-3 py-2">{a.cargo || "—"}</td>
                        <td className="px-3 py-2">{a.empresa || "—"}</td>
                        <td className="px-3 py-2">{a.evaluacion || "—"}</td>
                        <td className="px-3 py-2">
                          {a.firmo ? (
                            <span className="text-emerald-400">Sí</span>
                          ) : (
                            <span className="text-white/30">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Regenerar PDF: solo aplica al preoperacional firmado, cuando se
          agregó una foto de equipo después de la emisión. */}
      {puedeRegenerarPdf && (
        <RegenerarPreoperacionalPdf
          formularioId={form.id}
          usuarioNombre={perfil?.nombre || "Actium"}
          ultimaRegeneracion={
            form.pdf_regenerado_at
              ? new Date(form.pdf_regenerado_at).toLocaleString("es-CO")
              : null
          }
        />
      )}

      {/* Registro fotográfico general (no atado a un equipo específico) */}
      {conFotos && (
        <FormularioFotos
          formularioId={form.id}
          fotosIniciales={fotosGenerales}
          puedeSubir={puedeGestionar}
          puedeEliminar={puedeEliminar}
        />
      )}

      {/* ATS: Secuencia de Pasos */}
      {form.tipo === "ats" && atsPasos.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
          <h2 className="flex items-center gap-2 text-xs font-bold tracking-widest text-[#F25C05] uppercase mb-6">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F25C05]/10 text-[10px]">
              {atsPasos.length}
            </span>
            Secuencia de Pasos
          </h2>
          <div className="space-y-4">
            {atsPasos.map((paso, idx) => (
              <div key={paso.id} className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Paso {idx + 1}</p>
                <p className="text-sm font-medium text-white mb-3">{paso.paso}</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-lg bg-amber-500/5 border border-amber-500/10 p-3">
                    <p className="text-[9px] font-bold text-amber-500/80 uppercase tracking-widest mb-1">
                      Peligros Identificados
                    </p>
                    <p className="text-xs text-white/70">{paso.peligros || "—"}</p>
                  </div>
                  <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3">
                    <p className="text-[9px] font-bold text-white/50 uppercase tracking-widest mb-1">
                      Consecuencias
                    </p>
                    <p className="text-xs text-white/70">{paso.consecuencias || "—"}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3">
                    <p className="text-[9px] font-bold text-emerald-500/80 uppercase tracking-widest mb-1">
                      Controles Propuestos
                    </p>
                    <p className="text-xs text-white/70">{paso.controles || "—"}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ATS: Personal Ejecutor */}
      {form.tipo === "ats" && ejecutores.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
          <h2 className="flex items-center gap-2 text-xs font-bold tracking-widest text-[#F25C05] uppercase mb-6">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F25C05]/10 text-[10px]">
              {ejecutores.length}
            </span>
            Personal Ejecutor
          </h2>
          <PersonalEjecutor
            trabajadores={ejecutores}
            empresaId={form.empresa_id}
            subempresaId={form.subempresa_id}
            editable={puedeEditar}
          />
        </div>
      )}

      {/* Vista Previa del PDF */}
      {pdfSignedUrl && !esBorrador && (
        <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
          <h2 className="text-xs font-bold tracking-widest text-white/50 uppercase mb-4">Vista Previa del Permiso</h2>
          <div className="relative w-full aspect-[1/1.4] max-h-[850px] rounded-lg overflow-hidden border border-white/10 bg-black">
            <iframe
              src={`${pdfSignedUrl}#toolbar=0`}
              className="w-full h-full border-none min-h-[500px]"
              title="Vista previa del permiso"
            />
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
        <h2 className="text-xs font-bold tracking-widest text-white/50 uppercase mb-4">Registro</h2>
        <div className="flex flex-wrap gap-6 text-[10px] text-white/30 uppercase tracking-widest">
          <span>Creado: {new Date(form.created_at).toLocaleString("es-CO")}</span>
          <span>Actualizado: {new Date(form.updated_at).toLocaleString("es-CO")}</span>
          {form.firmado_at && <span>Firmado: {new Date(form.firmado_at).toLocaleString("es-CO")}</span>}
        </div>
      </div>
    </div>
  );
}
