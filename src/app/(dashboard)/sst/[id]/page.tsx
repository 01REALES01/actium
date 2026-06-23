import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChevronLeft, ShieldAlert, FileText, MapPin, User, CalendarDays, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getPerfilActual, puedeCrearFormularioSST, puedeGestionarSST } from "@/lib/auth/roles";
import { PersonalEjecutor, type TrabajadorItem } from "@/components/sst/personal-ejecutor";
import { AtsAcciones } from "@/components/sst/ats-acciones";
import { BotonEliminarSST } from "@/components/sst/boton-eliminar-sst";
import type { Tables } from "@/types/database.types";

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

  let pdfSignedUrl: string | null = null;
  if (form.pdf_generado_path) {
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

  const tipoLabel: Record<string, string> = {
    ats: "Análisis de Trabajo Seguro",
    permiso_altura: "Permiso de Trabajo en Alturas",
    permiso_caliente: "Permiso de Trabajo en Caliente",
  };

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

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
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
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`px-3 py-1.5 text-[10px] font-bold tracking-widest uppercase border w-fit ${estadoColor[form.estado] || estadoColor.archivado}`}
            >
              {form.estado}
            </Badge>
            {pdfSignedUrl && (
              <a
                href={pdfSignedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 items-center gap-2 rounded-lg bg-[#F25C05] px-4 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-[#F25C05]/90"
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
      {pdfSignedUrl && (
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
