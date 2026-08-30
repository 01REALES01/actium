"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Trash2,
  Loader2,
  Download,
  History,
  Save,
  ChevronDown,
  CheckCircle2,
  UserPlus,
} from "lucide-react";
import { SignaturePad } from "./signature-pad";
import { FormularioFotos } from "./formulario-fotos";
import type { FotoFormularioConUrl } from "@/lib/data/formularios-fotos";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TIPOS_ACTIVIDAD,
  MODALIDADES,
  RESULTADOS_GENERALES,
  EVALUACIONES_ASISTENTE,
  METODOS_VERIFICACION,
  TIPOS_EVIDENCIA,
  NOTA_LEGAL_CHARLA,
  temaVacio,
  temasDiligenciados,
  asistenteVacio,
  asistenteDesdeEmpleado,
  asistentesValidos,
  asistentesSinFirma,
  calcularDuracionMinutos,
  etiquetaDuracion,
  type TemaCharla,
  type AsistenteCharla,
} from "@/constants/charla-seguridad";
import type { CharlaSeguridadPDFData } from "./charla-seguridad-pdf-document";
import type { EmpleadoOptEpp } from "./entrega-epp-form";
import { listarFaltantes } from "@/lib/sst/faltantes";
import { hoyLocal } from "@/lib/fecha";

const CARD = "rounded-xl border border-white/5 bg-[#1A1A1A] p-5 sm:p-6 shadow-2xl";
const SECTION_TITLE_INLINE = "flex items-center gap-2 text-sm font-bold tracking-widest text-[#F25C05] uppercase";
const NUM = "flex h-6 w-6 items-center justify-center rounded-full bg-[#F25C05]/10 text-xs";
const LABEL = "text-[10px] font-bold text-white/40 uppercase tracking-widest";
const FIELD = "h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20 [&>option]:bg-[#1A1A1A] [&>option]:text-white";
const TEXTAREA = "w-full min-h-[88px] bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm placeholder:text-white/20 focus:border-[#F25C05] focus:outline-none focus:ring-2 focus:ring-[#F25C05]/20 transition-all";

let temaSeq = 0;
let asistenteSeq = 0;

export function CharlaSeguridadForm({
  proyectos = [],
  empleados = [],
  puedeEliminarFotos = false,
}: {
  proyectos?: { id: string; nombre: string }[];
  empleados?: EmpleadoOptEpp[];
  puedeEliminarFotos?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const borradorParam = searchParams.get("borradorId");

  const [cargandoDatos, setCargandoDatos] = useState(Boolean(borradorParam));
  const [existingPdfPath, setExistingPdfPath] = useState<string | null>(null);
  const [borradorId, setBorradorId] = useState<string | null>(borradorParam);
  const [guardandoBorrador, setGuardandoBorrador] = useState(false);
  const [rellenando, setRellenando] = useState(false);
  const [avisoMsg, setAvisoMsg] = useState("");
  const [avisoPendiente, setAvisoPendiente] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [generando, setGenerando] = useState(false);

  // 1. Datos generales
  const [proyectoId, setProyectoId] = useState("");
  const [lugar, setLugar] = useState("");
  const [fecha, setFecha] = useState(hoyLocal());
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [tipoActividad, setTipoActividad] = useState("");
  const [modalidad, setModalidad] = useState("");
  const [tema, setTema] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [capacitadorNombre, setCapacitadorNombre] = useState("");
  const [capacitadorCargo, setCapacitadorCargo] = useState("");

  // 2. Temas tratados
  const [temas, setTemas] = useState<TemaCharla[]>(() => [temaVacio(++temaSeq), temaVacio(++temaSeq), temaVacio(++temaSeq)]);

  // 3. Asistentes
  const [asistentes, setAsistentes] = useState<AsistenteCharla[]>([]);
  const [expandidos, setExpandidos] = useState<Set<number>>(new Set());

  // 4. Verificación de comprensión
  const [metodosVerificacion, setMetodosVerificacion] = useState<string[]>([]);
  const [resultadoGeneral, setResultadoGeneral] = useState("");
  const [tiposEvidencia, setTiposEvidencia] = useState<string[]>([]);
  const [evidenciaOtra, setEvidenciaOtra] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // 5. Registro fotográfico
  const [fotos, setFotos] = useState<FotoFormularioConUrl[]>([]);

  // 6. Firmas de cierre
  const [capacitadorFirma, setCapacitadorFirma] = useState("");
  const [responsableSstNombre, setResponsableSstNombre] = useState("");
  const [responsableSstFirma, setResponsableSstFirma] = useState("");
  const [responsableAreaNombre, setResponsableAreaNombre] = useState("");
  const [responsableAreaFirma, setResponsableAreaFirma] = useState("");

  const duracionMinutos = calcularDuracionMinutos(horaInicio, horaFin);

  const asistentesDisponibles = proyectoId
    ? empleados.filter((e) => e.proyectoIds.includes(proyectoId) && !asistentes.some((a) => a.empleadoId === e.id))
    : [];

  // ─── Hidratación ────────────────────────────────────────────────────────────

  const aplicarPayload = (payload: Partial<CharlaSeguridadPDFData>, opciones?: { sinAsistentesNiFirmas?: boolean }) => {
    setLugar(payload.lugar || "");
    setFecha(payload.fecha || hoyLocal());
    setHoraInicio(payload.horaInicio || "");
    setHoraFin(payload.horaFin || "");
    setTipoActividad(payload.tipoActividad || "");
    setModalidad(payload.modalidad || "");
    setCapacitadorNombre(payload.capacitadorNombre || "");
    setCapacitadorCargo(payload.capacitadorCargo || "");

    if (opciones?.sinAsistentesNiFirmas) {
      // "Rellenar con el último" solo hereda el encabezado de la charla: el
      // tema, los temas tratados y los asistentes son de cada sesión.
      return;
    }

    setTema(payload.tema || "");
    setObjetivo(payload.objetivo || "");
    setTemas((payload.temas ?? []).map((t) => ({ ...t, id: ++temaSeq })));
    setAsistentes((payload.asistentes ?? []).map((a) => ({ ...a, id: ++asistenteSeq })));
    setMetodosVerificacion(payload.metodosVerificacion ?? []);
    setResultadoGeneral(payload.resultadoGeneral || "");
    setTiposEvidencia(payload.tiposEvidencia ?? []);
    setEvidenciaOtra(payload.evidenciaOtra || "");
    setObservaciones(payload.observaciones || "");
    setCapacitadorFirma(payload.capacitadorFirma || "");
    setResponsableSstNombre(payload.responsableSstNombre || "");
    setResponsableSstFirma(payload.responsableSstFirma || "");
    setResponsableAreaNombre(payload.responsableAreaNombre || "");
    setResponsableAreaFirma(payload.responsableAreaFirma || "");
  };

  // Retomar un borrador guardado.
  useEffect(() => {
    if (!borradorParam) return;
    setCargandoDatos(true);
    (async () => {
      try {
        const { obtenerDatosCierreAction } = await import("@/lib/actions/permisos-sst");
        const res = await obtenerDatosCierreAction(borradorParam);

        if (res.pdfPath) setExistingPdfPath(res.pdfPath);
        if (res.proyectoId) setProyectoId(res.proyectoId);

        try {
          const { listarFotosFormularioAction } = await import("@/lib/actions/formulario-fotos");
          setFotos(await listarFotosFormularioAction(borradorParam));
        } catch (e) {
          console.error("Error al cargar las fotos del borrador:", e);
        }

        if (res.payload) {
          aplicarPayload(res.payload as CharlaSeguridadPDFData);
        } else if (res.fallback) {
          setLugar(res.fallback.ubicacion || "");
          setFecha(res.fallback.fechaInicio || hoyLocal());
          setTema(res.fallback.area || "");
        }
      } catch (e) {
        console.error("Error al cargar el borrador de la charla:", e);
      } finally {
        setCargandoDatos(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borradorParam]);

  // ─── Temas tratados ─────────────────────────────────────────────────────────

  const agregarTema = () => setTemas((prev) => [...prev, temaVacio(++temaSeq)]);
  const eliminarTema = (id: number) => setTemas((prev) => prev.filter((t) => t.id !== id));
  const actualizarTema = (id: number, texto: string) =>
    setTemas((prev) => prev.map((t) => (t.id === id ? { ...t, texto } : t)));

  // ─── Asistentes ─────────────────────────────────────────────────────────────

  const agregarAsistenteDeEmpleado = (empleado: EmpleadoOptEpp) => {
    const nuevo = asistenteDesdeEmpleado(empleado, ++asistenteSeq);
    setAsistentes((prev) => [...prev, nuevo]);
    setExpandidos((prev) => new Set(prev).add(nuevo.id));
  };

  const agregarAsistenteExterno = () => {
    const nuevo = asistenteVacio(++asistenteSeq);
    setAsistentes((prev) => [...prev, nuevo]);
    setExpandidos((prev) => new Set(prev).add(nuevo.id));
  };

  const eliminarAsistente = (id: number) => {
    setAsistentes((prev) => prev.filter((a) => a.id !== id));
    setExpandidos((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const actualizarAsistente = (id: number, cambio: Partial<AsistenteCharla>) =>
    setAsistentes((prev) => prev.map((a) => (a.id === id ? { ...a, ...cambio } : a)));

  const toggleExpandido = (id: number) =>
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // ─── Métodos / evidencia (multiselección) ──────────────────────────────────

  const toggleEnLista = (lista: string[], id: string): string[] =>
    lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id];

  // ─── Payload ────────────────────────────────────────────────────────────────

  const obra = proyectos.find((p) => p.id === proyectoId)?.nombre || "";

  const construirPayload = (): CharlaSeguridadPDFData => ({
    proyecto: obra,
    lugar: lugar.trim(),
    fecha: fecha || hoyLocal(),
    horaInicio,
    horaFin,
    duracionMinutos,
    tipoActividad,
    modalidad,
    tema: tema.trim(),
    objetivo: objetivo.trim(),
    capacitadorNombre: capacitadorNombre.trim(),
    capacitadorCargo: capacitadorCargo.trim(),
    temas,
    asistentes,
    metodosVerificacion,
    resultadoGeneral,
    tiposEvidencia,
    evidenciaOtra: evidenciaOtra.trim(),
    observaciones: observaciones.trim(),
    capacitadorFirma,
    responsableSstNombre: responsableSstNombre.trim(),
    responsableSstFirma,
    responsableAreaNombre: responsableAreaNombre.trim(),
    responsableAreaFirma,
  });

  // ─── Faltantes ──────────────────────────────────────────────────────────────

  const faltantesParaGuardar = (): string[] => {
    const faltan: string[] = [];
    if (!proyectoId) {
      faltan.push(
        proyectos.length === 0
          ? "un proyecto disponible al cual asociar el registro"
          : "seleccionar el proyecto asociado",
      );
    }
    return faltan;
  };

  const pendientesPorDiligenciar = (): string[] => {
    const faltan: string[] = [];
    if (!tema.trim()) faltan.push("tema de la charla");
    if (!fecha) faltan.push("fecha");
    if (!capacitadorNombre.trim()) faltan.push("nombre del capacitador");

    if (temasDiligenciados(temas).length === 0) faltan.push("al menos un tema tratado");

    const validos = asistentesValidos(asistentes);
    if (validos.length === 0) faltan.push("al menos un asistente");
    const sinFirma = asistentesSinFirma(asistentes);
    if (sinFirma.length > 0) faltan.push(`firma de: ${sinFirma.join(", ")}`);

    if (!resultadoGeneral) faltan.push("resultado general de la verificación");
    if (!capacitadorFirma) faltan.push("firma del capacitador");

    return faltan;
  };

  // ─── Rellenar con el último ─────────────────────────────────────────────────

  const handleRellenarUltimo = async () => {
    setErrorMsg("");
    setAvisoMsg("");
    setAvisoPendiente(false);
    setRellenando(true);
    try {
      const { obtenerUltimoFormularioAction } = await import("@/lib/actions/permisos-sst");
      const res = await obtenerUltimoFormularioAction("charla_seguridad", proyectoId || undefined);

      if (!res.encontrado || !res.payload) {
        setErrorMsg(res.motivo || "Aún no hay un registro de charla anterior para copiar.");
        return;
      }

      aplicarPayload(res.payload as CharlaSeguridadPDFData, { sinAsistentesNiFirmas: true });
      const ref = res.referencia;
      setAvisoMsg(
        `Se copiaron el tipo de actividad, la modalidad, el lugar y el capacitador del registro del ${
          ref?.fecha || "último registro"
        }${ref?.proyecto ? ` — ${ref.proyecto}` : ""}. El tema, los temas tratados, los asistentes y las firmas se diligencian de nuevo cada vez.`,
      );
    } catch (err: any) {
      setErrorMsg(err?.message || "No fue posible recuperar el último registro.");
    } finally {
      setRellenando(false);
    }
  };

  // ─── Guardar borrador ───────────────────────────────────────────────────────

  const guardarBorrador = async (): Promise<string> => {
    const data = construirPayload();

    const formData = new FormData();
    formData.append("payload", JSON.stringify(data));
    formData.append("tipo", "charla_seguridad");
    formData.append("proyectoId", proyectoId);
    if (borradorId) formData.append("borradorId", borradorId);
    if (existingPdfPath) formData.append("existingPdfPath", existingPdfPath);
    formData.append("area", data.tema || "Charla de seguridad");
    formData.append("ubicacion", data.lugar || "N/A");
    formData.append("fechaInicio", data.fecha);

    const { guardarBorradorAction } = await import("@/lib/actions/permisos-sst");
    const res = await guardarBorradorAction(formData);

    setBorradorId(res.id);
    setExistingPdfPath(res.pdfPath);
    return res.id;
  };

  const asegurarBorrador = async (): Promise<string> => {
    if (borradorId) return borradorId;

    const bloqueantes = faltantesParaGuardar();
    if (bloqueantes.length > 0) {
      throw new Error(`Para adjuntar fotos falta ${listarFaltantes(bloqueantes)}.`);
    }

    const id = await guardarBorrador();
    setAvisoPendiente(false);
    setAvisoMsg("Se guardó el borrador para poder adjuntar las fotos.");
    return id;
  };

  const handleGuardarBorrador = async () => {
    setErrorMsg("");
    setAvisoMsg("");
    setAvisoPendiente(false);

    const bloqueantes = faltantesParaGuardar();
    if (bloqueantes.length > 0) {
      setErrorMsg(`Para guardar el borrador falta ${listarFaltantes(bloqueantes)}.`);
      return;
    }

    setGuardandoBorrador(true);
    try {
      await guardarBorrador();

      const pendientes = pendientesPorDiligenciar();
      setAvisoPendiente(pendientes.length > 0);
      setAvisoMsg(
        pendientes.length === 0
          ? "Borrador guardado. El registro está completo: puede emitirlo cuando lo requiera."
          : `Borrador guardado. Queda pendiente por diligenciar: ${listarFaltantes(pendientes)}.`,
      );
    } catch (err: any) {
      setErrorMsg(err?.message || "No fue posible guardar el borrador. Intenta de nuevo.");
    } finally {
      setGuardandoBorrador(false);
    }
  };

  // ─── Generar PDF ────────────────────────────────────────────────────────────

  const handleGenerar = async () => {
    setErrorMsg("");
    setAvisoMsg("");
    setAvisoPendiente(false);

    const faltan: string[] = [];
    if (!proyectoId) faltan.push("proyecto asociado");
    if (!fecha) faltan.push("fecha");
    if (!tema.trim()) faltan.push("tema de la charla");
    if (!capacitadorNombre.trim()) faltan.push("nombre del capacitador");
    if (temasDiligenciados(temas).length === 0) faltan.push("al menos un tema tratado");

    const validos = asistentesValidos(asistentes);
    if (validos.length === 0) faltan.push("al menos un asistente");
    const sinFirma = asistentesSinFirma(asistentes);
    if (sinFirma.length > 0) faltan.push(`firma de: ${sinFirma.join(", ")}`);

    if (!capacitadorFirma) faltan.push("firma del capacitador");

    if (faltan.length > 0) {
      setErrorMsg(`No fue posible emitir el registro. Falta diligenciar: ${listarFaltantes(faltan)}.`);
      return;
    }

    setGenerando(true);
    try {
      const data = construirPayload();

      const { buildCharlaSeguridadPDFBlob } = await import("./charla-seguridad-pdf-document");
      const blob = await buildCharlaSeguridadPDFBlob(data);

      const formData = new FormData();
      formData.append("pdfFile", blob, "registro-capacitacion-charla-seguridad.pdf");
      formData.append("payload", JSON.stringify(data));
      formData.append("tipo", "charla_seguridad");
      if (borradorId) formData.append("formularioId", borradorId);
      if (existingPdfPath) formData.append("existingPdfPath", existingPdfPath);
      if (proyectoId) formData.append("proyectoId", proyectoId);
      formData.append("area", data.tema || "Charla de seguridad");
      formData.append("ubicacion", data.lugar || "N/A");
      formData.append("fechaInicio", data.fecha);

      const { guardarPdfYDatosFormularioAction } = await import("@/lib/actions/permisos-sst");
      const res = await guardarPdfYDatosFormularioAction(formData);

      if (res.id) {
        router.push(`/sst/${res.id}`);
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `charla-seguridad-${data.fecha}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMsg(err?.message || "No fue posible generar el PDF. Intenta de nuevo.");
    } finally {
      setGenerando(false);
    }
  };

  if (cargandoDatos) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#F25C05]" />
        <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Cargando el registro...</p>
      </div>
    );
  }

  const asistentesFirmados = asistentes.filter((a) => a.firma).length;

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl">
      {/* 1. Datos generales */}
      <div className={CARD}>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className={SECTION_TITLE_INLINE}>
            <span className={NUM}>1</span> Datos generales
          </h2>
          <button
            type="button"
            onClick={handleRellenarUltimo}
            disabled={rellenando}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#F25C05]/40 bg-[#F25C05]/10 px-4 text-[10px] font-bold uppercase tracking-widest text-[#F25C05] transition-all hover:bg-[#F25C05]/20 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
          >
            {rellenando ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
            Rellenar con el último
          </button>
        </div>
        <p className="mb-5 text-[10px] leading-relaxed text-white/30">
          Copia el tipo de actividad, la modalidad, el lugar y el capacitador del último registro de esta
          obra. El tema, los temas tratados, los asistentes y las firmas se diligencian de nuevo cada vez.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {proyectos.length > 0 && (
            <CampoForm label="Proyecto asociado (Obra)">
              <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)} className={FIELD + " w-full px-3"}>
                <option value="">Seleccione un proyecto...</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </CampoForm>
          )}
          <CampoForm label="Lugar / frente de trabajo">
            <Input value={lugar} onChange={(e) => setLugar(e.target.value)} className={FIELD} />
          </CampoForm>
          <CampoForm label="Fecha">
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={FIELD} />
          </CampoForm>
          <div className="grid grid-cols-2 gap-3">
            <CampoForm label="Hora de inicio" small>
              <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className={FIELD} />
            </CampoForm>
            <CampoForm label="Hora de fin" small>
              <Input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className={FIELD} />
            </CampoForm>
          </div>
          <CampoForm label="Duración">
            <div className="flex h-12 items-center rounded-xl border border-white/10 bg-white/[0.02] px-4 text-sm text-white/60">
              {etiquetaDuracion(duracionMinutos)}
            </div>
          </CampoForm>
          <CampoForm label="Tipo de actividad">
            <select value={tipoActividad} onChange={(e) => setTipoActividad(e.target.value)} className={FIELD + " w-full px-3"}>
              <option value="">Seleccione...</option>
              {TIPOS_ACTIVIDAD.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </CampoForm>
          <CampoForm label="Modalidad">
            <select value={modalidad} onChange={(e) => setModalidad(e.target.value)} className={FIELD + " w-full px-3"}>
              <option value="">Seleccione...</option>
              {MODALIDADES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </CampoForm>
          <CampoForm label="Capacitador / relator">
            <Input value={capacitadorNombre} onChange={(e) => setCapacitadorNombre(e.target.value)} className={FIELD} />
          </CampoForm>
          <CampoForm label="Cargo del capacitador">
            <Input value={capacitadorCargo} onChange={(e) => setCapacitadorCargo(e.target.value)} className={FIELD} />
          </CampoForm>
          <CampoForm label="Tema" full>
            <Input value={tema} onChange={(e) => setTema(e.target.value)} className={FIELD} placeholder="Tema de la charla" />
          </CampoForm>
          <CampoForm label="Objetivo" full>
            <textarea value={objetivo} onChange={(e) => setObjetivo(e.target.value)} className={TEXTAREA} />
          </CampoForm>
        </div>
      </div>

      {/* 2. Contenido / temas tratados */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE_INLINE + " mb-6"}>
          <span className={NUM}>2</span> Contenido / temas tratados
        </h2>
        <div className="space-y-3">
          {temas.map((t, i) => (
            <div key={t.id} className="flex items-center gap-3">
              <span className="flex h-11 w-8 shrink-0 items-center justify-center text-xs font-bold text-white/40">{i + 1}.</span>
              <Input
                value={t.texto}
                onChange={(e) => actualizarTema(t.id, e.target.value)}
                className={FIELD + " flex-1"}
                placeholder="Tema tratado"
              />
              <button
                type="button"
                onClick={() => eliminarTema(t.id)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-red-400 transition-colors hover:bg-red-400/10"
                aria-label="Eliminar tema"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={agregarTema}
          className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl border border-[#F25C05]/40 bg-[#F25C05]/10 px-4 text-[10px] font-bold uppercase tracking-widest text-[#F25C05] transition-all hover:bg-[#F25C05]/20"
        >
          <Plus className="h-4 w-4" /> Agregar tema
        </button>
      </div>

      {/* 3. Asistentes */}
      <div className={CARD}>
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className={SECTION_TITLE_INLINE}>
            <span className={NUM}>3</span> Asistentes
          </h2>
          {asistentes.length > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              {asistentesFirmados} de {asistentes.length} firmados
            </span>
          )}
        </div>

        {!proyectoId ? (
          <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-xs text-white/40">
            Seleccione un proyecto para agregar asistentes del roster.
          </p>
        ) : (
          <>
            {asistentesDisponibles.length > 0 && (
              <div className="mb-4 space-y-2">
                <Label className={LABEL}>Agregar del proyecto</Label>
                <select
                  value=""
                  onChange={(e) => {
                    const empleado = asistentesDisponibles.find((emp) => emp.id === e.target.value);
                    if (empleado) agregarAsistenteDeEmpleado(empleado);
                  }}
                  className={FIELD + " w-full px-3"}
                >
                  <option value="">Seleccione un trabajador del proyecto...</option>
                  {asistentesDisponibles.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-3">
              {asistentes.map((asistente, i) => (
                <AsistenteCard
                  key={asistente.id}
                  numero={i + 1}
                  asistente={asistente}
                  expandido={expandidos.has(asistente.id)}
                  onToggleExpand={() => toggleExpandido(asistente.id)}
                  onCambiar={(cambio) => actualizarAsistente(asistente.id, cambio)}
                  onEliminar={() => eliminarAsistente(asistente.id)}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={agregarAsistenteExterno}
              className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-white/10"
            >
              <UserPlus className="h-4 w-4" /> Agregar asistente externo
            </button>
          </>
        )}
      </div>

      {/* 4. Verificación de comprensión */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE_INLINE + " mb-6"}>
          <span className={NUM}>4</span> Verificación de comprensión
        </h2>

        <Label className={LABEL}>Métodos de verificación</Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {METODOS_VERIFICACION.map((m) => (
            <ChipToggle
              key={m.id}
              label={m.label}
              activo={metodosVerificacion.includes(m.id)}
              onClick={() => setMetodosVerificacion((prev) => toggleEnLista(prev, m.id))}
            />
          ))}
        </div>

        <Label className={LABEL + " mt-6 block"}>Resultado general</Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {RESULTADOS_GENERALES.map((r) => (
            <ChipToggle
              key={r.id}
              label={r.label}
              activo={resultadoGeneral === r.id}
              onClick={() => setResultadoGeneral(r.id)}
            />
          ))}
        </div>

        <Label className={LABEL + " mt-6 block"}>Evidencia anexa</Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {TIPOS_EVIDENCIA.map((ev) => (
            <ChipToggle
              key={ev.id}
              label={ev.label}
              activo={tiposEvidencia.includes(ev.id)}
              onClick={() => setTiposEvidencia((prev) => toggleEnLista(prev, ev.id))}
            />
          ))}
        </div>
        {tiposEvidencia.includes("otra") && (
          <Input
            value={evidenciaOtra}
            onChange={(e) => setEvidenciaOtra(e.target.value)}
            className={FIELD + " mt-3"}
            placeholder="Describa la evidencia adicional"
          />
        )}

        <Label className={LABEL + " mt-6 block"}>Observaciones / compromisos</Label>
        <textarea
          value={observaciones}
          onChange={(e) => setObservaciones(e.target.value)}
          className={TEXTAREA + " mt-3"}
          placeholder="Novedades de la actividad (opcional)."
        />
      </div>

      {/* 5. Registro fotográfico */}
      <FormularioFotos
        numero={5}
        formularioId={borradorId}
        fotosIniciales={fotos}
        puedeSubir
        puedeEliminar={puedeEliminarFotos}
        asegurarFormulario={asegurarBorrador}
      />

      {/* 6. Firmas de cierre */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE_INLINE + " mb-6"}>
          <span className={NUM}>6</span> Firmas de cierre
        </h2>

        <SignaturePad onSave={setCapacitadorFirma} initialValue={capacitadorFirma} label="Firma capacitador" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8 mb-4">
          <CampoForm label="Responsable SST / verificación">
            <Input value={responsableSstNombre} onChange={(e) => setResponsableSstNombre(e.target.value)} className={FIELD} />
          </CampoForm>
        </div>
        <SignaturePad onSave={setResponsableSstFirma} initialValue={responsableSstFirma} label="Firma responsable SST / verificación" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8 mb-4">
          <CampoForm label="Responsable del área">
            <Input value={responsableAreaNombre} onChange={(e) => setResponsableAreaNombre(e.target.value)} className={FIELD} />
          </CampoForm>
        </div>
        <SignaturePad onSave={setResponsableAreaFirma} initialValue={responsableAreaFirma} label="Firma responsable del área" />

        <p className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-[11px] leading-relaxed text-white/60">
          {NOTA_LEGAL_CHARLA}
        </p>
        <p className="mt-3 text-[10px] text-white/30 leading-relaxed italic">
          Estas firmas tienen carácter informativo y NO constituyen firma electrónica certificada según la Ley 527 de 1999.
        </p>

        {errorMsg && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium leading-relaxed">
            {errorMsg}
          </div>
        )}

        {avisoMsg && (
          <div
            className={`mt-6 p-4 rounded-xl border text-sm font-medium leading-relaxed ${
              avisoPendiente
                ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }`}
          >
            {avisoMsg}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={handleGuardarBorrador}
            disabled={guardandoBorrador || generando}
            className="flex h-14 w-full sm:w-auto items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/5 px-8 text-sm font-bold text-white transition-all hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {guardandoBorrador ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Guardando...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" /> Guardar borrador
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleGenerar}
            disabled={generando || guardandoBorrador}
            className="flex h-14 w-full sm:w-auto items-center justify-center gap-3 rounded-xl bg-[#F25C05] px-10 text-sm font-bold text-white transition-all hover:bg-[#F25C05]/90 shadow-lg shadow-[#F25C05]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generando ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Generando...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" /> Generar registro en PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponentes ──────────────────────────────────────────────────────────

function CampoForm({ label, children, full, small }: { label: string; children: React.ReactNode; full?: boolean; small?: boolean }) {
  return (
    <div className={`space-y-2 ${full ? "md:col-span-2" : ""}`}>
      <Label className={small ? "text-[10px] text-white/60" : LABEL}>{label}</Label>
      {children}
    </div>
  );
}

function ChipToggle({ label, activo, onClick }: { label: string; activo: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[44px] items-center rounded-xl border px-4 text-xs font-semibold transition-all ${
        activo
          ? "border-[#F25C05] bg-[#F25C05]/15 text-[#F25C05]"
          : "border-white/10 bg-white/[0.02] text-white/50 hover:bg-white/5"
      }`}
    >
      {label}
    </button>
  );
}

function AsistenteCard({
  numero,
  asistente,
  expandido,
  onToggleExpand,
  onCambiar,
  onEliminar,
}: {
  numero: number;
  asistente: AsistenteCharla;
  expandido: boolean;
  onToggleExpand: () => void;
  onCambiar: (cambio: Partial<AsistenteCharla>) => void;
  onEliminar: () => void;
}) {
  const firmado = Boolean(asistente.firma);

  return (
    <div
      className={`rounded-xl border transition-colors ${
        firmado ? "border-emerald-500/25 bg-emerald-500/[0.03]" : "border-white/5 bg-white/[0.02]"
      }`}
    >
      <button
        type="button"
        onClick={onToggleExpand}
        className="flex w-full min-h-[64px] items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs font-bold text-white/60">
            {numero}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{asistente.nombre || "Sin nombre"}</p>
            <p className="truncate text-[10px] uppercase tracking-widest text-white/30">
              {asistente.cargo || "Sin cargo"} {asistente.empleadoId ? "· Del proyecto" : "· Externo"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
              firmado
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-white/10 bg-white/5 text-white/40"
            }`}
          >
            {firmado && <CheckCircle2 className="h-3 w-3" />}
            {firmado ? "Firmado" : "Sin firmar"}
          </span>
          <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${expandido ? "rotate-180" : ""}`} />
        </div>
      </button>

      {expandido && (
        <div className="border-t border-white/5 p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <CampoForm label="Nombre completo">
              <Input value={asistente.nombre} onChange={(e) => onCambiar({ nombre: e.target.value })} className={FIELD} />
            </CampoForm>
            <CampoForm label="Identificación">
              <Input
                value={asistente.identificacion}
                onChange={(e) => onCambiar({ identificacion: e.target.value })}
                inputMode="numeric"
                className={FIELD}
              />
            </CampoForm>
            <CampoForm label="Cargo">
              <Input value={asistente.cargo} onChange={(e) => onCambiar({ cargo: e.target.value })} className={FIELD} />
            </CampoForm>
            <CampoForm label="Empresa">
              <Input value={asistente.empresa} onChange={(e) => onCambiar({ empresa: e.target.value })} className={FIELD} />
            </CampoForm>
          </div>

          <Label className={LABEL}>Evaluación / comprensión</Label>
          <div className="mt-3 flex flex-wrap gap-2">
            {EVALUACIONES_ASISTENTE.map((ev) => (
              <ChipToggle
                key={ev.id}
                label={ev.label}
                activo={asistente.evaluacion === ev.id}
                onClick={() => onCambiar({ evaluacion: ev.id })}
              />
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-white/5">
            <SignaturePad
              onSave={(firma) => onCambiar({ firma })}
              initialValue={asistente.firma}
              label="Firma del asistente"
            />
          </div>

          <button
            type="button"
            onClick={onEliminar}
            className="mt-5 flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-[10px] font-bold uppercase tracking-widest text-red-400 transition-colors hover:bg-red-400/10"
          >
            <Trash2 className="h-4 w-4" /> Quitar asistente
          </button>
        </div>
      )}
    </div>
  );
}
