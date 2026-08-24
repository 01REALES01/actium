"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2, Loader2, Download, Check, AlertTriangle, ShieldCheck, PenLine, History, Save } from "lucide-react";
import { SignaturePad } from "./signature-pad";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PERMISOS_REQUERIDOS,
  CATEGORIAS_HERRAMIENTAS,
  PREGUNTAS_ANALISIS,
  EVALUACION_RIESGO,
  type ProbabilidadIncidente,
} from "@/constants/ats-formato";
import type {
  EjecutorAts,
  PasoAts,
  AtsFormatoPDFData,
} from "./ats-formato-pdf-document";
import type { FallbackFormularioSST } from "@/lib/sst/prefill";
import { listarFaltantes, contar } from "@/lib/sst/faltantes";
import { hoyLocal } from "@/lib/fecha";

const CARD = "rounded-actium border border-white/5 bg-[#1A1A1A] p-5 sm:p-6 shadow-2xl";
const SECTION_TITLE = "flex items-center gap-2 text-sm font-semibold tracking-widest text-actium-orange uppercase mb-6";
const SECTION_TITLE_INLINE = "flex items-center gap-2 text-sm font-semibold tracking-widest text-actium-orange uppercase";
const NUM = "flex h-6 w-6 items-center justify-center rounded-full bg-actium-orange/10 text-xs";
const LABEL = "text-[10px] font-semibold text-white/40 uppercase tracking-widest";
const FIELD = "h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20 [&>option]:bg-[#1A1A1A] [&>option]:text-white";
const TEXTAREA = "w-full min-h-[80px] bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm placeholder:text-white/20 focus:border-actium-orange focus:outline-none focus:ring-2 focus:ring-actium-orange/20 transition-all";

type EjecutorState = EjecutorAts & { id: number };
type PasoState = PasoAts & { id: number };
let ejSeq = 1;
let pasoSeq = 1;
const nuevoEjecutor = (): EjecutorState => ({ id: ejSeq++, cedula: "", nombre: "", firma: "", firmaCierre: "" });
const nuevoPaso = (): PasoState => ({ id: pasoSeq++, paso: "", peligros: "", consecuencias: "", controles: "" });

export function AtsFormatoForm({ proyectos = [] }: { proyectos?: { id: string; nombre: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cierreId = searchParams.get("cierreId");
  const borradorParam = searchParams.get("borradorId");

  const [esModoCierre, setEsModoCierre] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [existingPdfPath, setExistingPdfPath] = useState<string | null>(null);
  // Fila en estado borrador que se está diligenciando (recién guardada o retomada).
  const [borradorId, setBorradorId] = useState<string | null>(borradorParam);
  const [guardandoBorrador, setGuardandoBorrador] = useState(false);
  const [rellenando, setRellenando] = useState(false);
  const [avisoMsg, setAvisoMsg] = useState("");
  // El aviso se pinta en ámbar cuando enumera lo que aún falta por diligenciar.
  const [avisoPendiente, setAvisoPendiente] = useState(false);

  // 1. Datos básicos
  const [proyectoId, setProyectoId] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [areaProceso, setAreaProceso] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [lugarTrabajo, setLugarTrabajo] = useState("");
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [descripcionTarea, setDescripcionTarea] = useState("");

  // 2. Permisos requeridos
  const [permisos, setPermisos] = useState<string[]>([]);
  const [permisoOtroCual, setPermisoOtroCual] = useState("");

  // 3. Herramientas
  const [herramientas, setHerramientas] = useState<Record<string, string>>({});

  // 4. Análisis de la tarea
  const [analisis, setAnalisis] = useState<Record<string, string>>({});

  // 5. Pasos
  const [pasos, setPasos] = useState<PasoState[]>([nuevoPaso()]);

  // 6. Evaluación del riesgo
  const [probabilidadIncidente, setProbabilidadIncidente] = useState<ProbabilidadIncidente>("");
  const [seguroProceder, setSeguroProceder] = useState<ProbabilidadIncidente>("");

  // Firmas
  const [ejecutores, setEjecutores] = useState<EjecutorState[]>([nuevoEjecutor()]);
  const [emisorNombre, setEmisorNombre] = useState("");
  const [emisorCedula, setEmisorCedula] = useState("");
  const [firmaData, setFirmaData] = useState("");
  const [emisorFirmaCierre, setEmisorFirmaCierre] = useState("");

  const [sinDatosPrevios, setSinDatosPrevios] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Vuelca en el formulario un payload guardado (cierre, borrador o ATS
  // anterior). Con `sinFirmas` se heredan el personal ejecutor y sus cédulas
  // pero no las firmas: la cuadrilla se repite, el trazo de la firma nunca.
  const aplicarPayload = (
    payload: Partial<AtsFormatoPDFData>,
    opciones?: { fallback?: FallbackFormularioSST; sinFirmas?: boolean },
  ) => {
    const fb = opciones?.fallback;
    setEmpresa(payload.empresa || fb?.empresa || "");
    setCiudad(payload.ciudad || "");
    setAreaProceso(payload.areaProceso || fb?.area || "");
    setUbicacion(payload.ubicacion || fb?.ubicacion || "");
    setLugarTrabajo(payload.lugarTrabajo || "");
    setFecha(payload.fecha || fb?.fechaInicio || hoyLocal());
    setHoraInicio(payload.horaInicio || "");
    setHoraFin(payload.horaFin || "");
    setDescripcionTarea(payload.descripcionTarea || "");
    setPermisos(payload.permisos ?? []);
    setPermisoOtroCual(payload.permisoOtroCual || "");
    setHerramientas(payload.herramientas ?? {});
    setAnalisis(payload.analisis ?? {});
    setPasos(
      payload.pasos?.length
        ? payload.pasos.map((paso, idx) => ({ ...paso, id: idx + 1 }))
        : [nuevoPaso()],
    );
    setProbabilidadIncidente(payload.probabilidadIncidente || "");
    setSeguroProceder(payload.seguroProceder || "");

    setEjecutores(
      payload.ejecutores?.length
        ? payload.ejecutores.map((e, idx) => ({ ...e, id: idx + 1 }))
        : [nuevoEjecutor()],
    );
    setEmisorNombre(payload.emisorNombre || "");
    setEmisorCedula(payload.emisorCedula || "");

    if (opciones?.sinFirmas) return;

    setFirmaData(payload.firmaDataUrl || "");
    setEmisorFirmaCierre(payload.emisorFirmaCierre || "");
  };

  // Cargar datos previos: firmas de cierre o borrador retomado.
  useEffect(() => {
    const formularioId = cierreId || borradorParam;
    if (!formularioId) return;
    if (cierreId) setEsModoCierre(true);
    setCargandoDatos(true);
    async function cargar() {
      try {
        const { obtenerDatosCierreAction } = await import("@/lib/actions/permisos-sst");
        const res = await obtenerDatosCierreAction(formularioId!);

        if (res.pdfPath) setExistingPdfPath(res.pdfPath);
        if (res.proyectoId) setProyectoId(res.proyectoId);

        if (res.payload) {
          aplicarPayload(res.payload as AtsFormatoPDFData, { fallback: res.fallback });
        } else {
          setEmpresa(res.fallback.empresa);
          setAreaProceso(res.fallback.area);
          setUbicacion(res.fallback.ubicacion);
          setFecha(res.fallback.fechaInicio || hoyLocal());
          if (cierreId) setSinDatosPrevios(true);
        }
      } catch (e) {
        console.error("Error al cargar datos previos de ATS:", e);
      } finally {
        setCargandoDatos(false);
      }
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cierreId, borradorParam]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const togglePermiso = (id: string) =>
    setPermisos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const updateEjecutor = (id: number, field: keyof EjecutorAts, value: string) =>
    setEjecutores((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  const addEjecutor = () => setEjecutores((prev) => [...prev, nuevoEjecutor()]);
  const removeEjecutor = (id: number) =>
    setEjecutores((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));

  const updatePaso = (id: number, field: keyof PasoAts, value: string) =>
    setPasos((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  const addPaso = () => setPasos((prev) => [...prev, nuevoPaso()]);
  const removePaso = (id: number) =>
    setPasos((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));

  // Instantánea del formulario, común al PDF final y al borrador.
  const construirPayload = (): AtsFormatoPDFData => ({
    empresa: (empresa || "ACTIUM").trim(),
    ciudad: ciudad.trim(),
    areaProceso: areaProceso.trim(),
    ubicacion: ubicacion.trim(),
    lugarTrabajo: lugarTrabajo.trim(),
    fecha: fecha || hoyLocal(),
    horaInicio,
    horaFin,
    descripcionTarea: descripcionTarea.trim(),
    permisos,
    permisoOtroCual: permisoOtroCual.trim(),
    herramientas,
    analisis,
    pasos: pasos.map(({ id: _id, ...rest }) => rest),
    probabilidadIncidente,
    seguroProceder,
    ejecutores: ejecutores.map(({ id: _id, ...rest }) => rest),
    emisorNombre: emisorNombre.trim(),
    emisorCedula: emisorCedula.trim(),
    firmaDataUrl: firmaData,
    emisorFirmaCierre,
  });

  // ─── Rellenar con el último ATS ─────────────────────────────────────────────
  const handleRellenarUltimo = async () => {
    setErrorMsg("");
    setAvisoMsg("");
    setAvisoPendiente(false);
    setRellenando(true);
    try {
      const { obtenerUltimoFormularioAction } = await import("@/lib/actions/permisos-sst");
      const res = await obtenerUltimoFormularioAction("ats", proyectoId || undefined);

      if (!res.encontrado || !res.payload) {
        setErrorMsg(res.motivo || "Aún no hay un ATS anterior para copiar.");
        return;
      }

      aplicarPayload(res.payload as AtsFormatoPDFData, { sinFirmas: true });
      const ref = res.referencia;
      setAvisoMsg(
        `Se copió el ATS del ${ref?.fecha || "último registro"}${ref?.proyecto ? ` — ${ref.proyecto}` : ""}. Registre las firmas: son lo único que no se hereda.`,
      );
    } catch (err: any) {
      setErrorMsg(err?.message || "No fue posible recuperar el último ATS.");
    } finally {
      setRellenando(false);
    }
  };

  // Lo único que impide guardar un borrador: la fila necesita un proyecto para
  // saber a qué empresa y subempresa pertenece.
  const faltantesParaGuardar = (): string[] => {
    const faltan: string[] = [];
    if (!proyectoId) {
      faltan.push(
        proyectos.length === 0
          ? "un proyecto disponible al cual asociar el análisis"
          : "seleccionar el proyecto asociado",
      );
    }
    return faltan;
  };

  // Lo que queda por diligenciar antes de poder emitir el ATS. No bloquea el
  // borrador: se informa para que el usuario sepa por dónde retomarlo.
  const pendientesPorDiligenciar = (): string[] => {
    const faltan: string[] = [];

    if (!empresa.trim()) faltan.push("empresa");
    if (!fecha) faltan.push("fecha de realización");
    if (!ubicacion.trim()) faltan.push("ubicación");
    if (!descripcionTarea.trim()) faltan.push("descripción de la tarea");

    if (!Object.values(herramientas).some((valor) => valor.trim())) {
      faltan.push("equipos y herramientas");
    }

    const sinAnalisis = PREGUNTAS_ANALISIS.filter((p) => !(analisis[p.id] || "").trim()).length;
    if (sinAnalisis > 0) {
      faltan.push(`${contar(sinAnalisis, "pregunta", "preguntas")} del análisis de la tarea`);
    }

    if (!pasos.some((paso) => paso.paso.trim())) faltan.push("pasos de la tarea");
    if (!probabilidadIncidente || !seguroProceder) faltan.push("evaluación del riesgo");

    const conNombre = ejecutores.filter((e) => e.nombre.trim());
    if (conNombre.length === 0) {
      faltan.push("personal ejecutor");
    } else {
      const sinFirma = conNombre.filter((e) => !e.firma).length;
      if (sinFirma > 0) {
        faltan.push(`${contar(sinFirma, "firma", "firmas")} del personal ejecutor`);
      }
    }

    if (!emisorNombre.trim()) faltan.push("nombre de quien autoriza");
    if (!firmaData) faltan.push("firma de quien autoriza");

    return faltan;
  };

  // ─── Guardar borrador ───────────────────────────────────────────────────────
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
      // El borrador guarda lo que hay en pantalla, sin los valores por defecto
      // que solo aplican al emitir (empresa "ACTIUM", fecha de hoy). Así lo que
      // se reporta como pendiente sigue pendiente al retomarlo.
      const data: AtsFormatoPDFData = {
        ...construirPayload(),
        empresa: empresa.trim(),
        fecha,
      };

      const formData = new FormData();
      formData.append("payload", JSON.stringify(data));
      formData.append("tipo", "ats");
      formData.append("proyectoId", proyectoId);
      if (borradorId) formData.append("borradorId", borradorId);
      if (existingPdfPath) formData.append("existingPdfPath", existingPdfPath);
      formData.append("area", data.areaProceso);
      formData.append("ubicacion", data.ubicacion || "N/A");
      formData.append("fechaInicio", data.fecha);

      const { guardarBorradorAction } = await import("@/lib/actions/permisos-sst");
      const res = await guardarBorradorAction(formData);

      setBorradorId(res.id);
      setExistingPdfPath(res.pdfPath);

      const pendientes = pendientesPorDiligenciar();
      setAvisoPendiente(pendientes.length > 0);
      setAvisoMsg(
        pendientes.length === 0
          ? "Borrador guardado. El análisis está completo: puede emitirlo cuando lo requiera."
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
    const finalEmpresa = (empresa || "ACTIUM").trim();
    const finalFecha = fecha || hoyLocal();

    if (!esModoCierre) {
      const faltan: string[] = [];
      if (!finalEmpresa) faltan.push("empresa");
      if (!finalFecha) faltan.push("fecha de realización");
      if (!firmaData) faltan.push("firma de quien autoriza el análisis");

      if (faltan.length > 0) {
        setErrorMsg(
          `No fue posible emitir el ATS. Falta diligenciar: ${listarFaltantes(faltan)}.`,
        );
        return;
      }
    }

    setGenerando(true);
    try {
      const data = construirPayload();

      const { buildAtsFormatoPDFBlob } = await import("./ats-formato-pdf-document");
      const blob = await buildAtsFormatoPDFBlob(data);

      const formData = new FormData();
      formData.append("pdfFile", blob, "ats.pdf");
      formData.append("payload", JSON.stringify(data));
      formData.append("tipo", "ats");
      if (cierreId) formData.append("cierreId", cierreId);
      else if (borradorId) formData.append("formularioId", borradorId);
      if (existingPdfPath) formData.append("existingPdfPath", existingPdfPath);
      if (proyectoId) formData.append("proyectoId", proyectoId);
      formData.append("area", areaProceso.trim());
      formData.append("ubicacion", ubicacion.trim() || "N/A");
      formData.append("fechaInicio", finalFecha);

      const { guardarPdfYDatosFormularioAction } = await import("@/lib/actions/permisos-sst");
      const res = await guardarPdfYDatosFormularioAction(formData);

      if (res.id) {
        router.push(`/sst/${res.id}`);
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ats-${(empresa || "actium").replace(/\s+/g, "-").toLowerCase()}-${fecha}.pdf`;
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
        <p className="text-xs font-bold text-white/50 uppercase tracking-widest">
          Cargando información del ATS...
        </p>
      </div>
    );
  }

  if (cargandoDatos) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#F25C05]" />
        <p className="text-xs font-bold text-white/50 uppercase tracking-widest">
          Cargando información del ATS...
        </p>
      </div>
    );
  }

  // ─── VISTA DEDICADA DE CIERRE ─────────────────────────────────────────────
  if (esModoCierre) {
    return (
      <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl">
        {/* Banner de Modo Cierre */}
        <div className="rounded-xl border border-[#F25C05]/30 bg-[#F25C05]/10 p-5 flex items-start gap-4 shadow-lg shadow-[#F25C05]/5">
          <PenLine className="h-6 w-6 text-[#F25C05] shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-[#F25C05] uppercase tracking-wider">
              Registro de Firmas de Cierre — Análisis de Trabajo Seguro (ATS)
            </h3>
            <p className="text-xs text-white/70 mt-1 leading-relaxed">
              Diligencie las firmas de finalización de labores de cada ejecutor y del emisor responsable para cerrar formalmente el ATS y regenerar el PDF oficial.
            </p>
          </div>
        </div>

        {sinDatosPrevios && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-white/80 leading-relaxed">
              <strong className="text-amber-400">Nota:</strong> Este ATS fue emitido antes de la integración de firmas digitales duales. Puede verificar los nombres de los ejecutores a continuación y registrar sus firmas de cierre.
            </p>
          </div>
        )}

        {/* Resumen del ATS */}
        <div className={CARD}>
          <h2 className="text-xs font-bold tracking-widest text-white/50 uppercase mb-4">
            Resumen del ATS Emitido
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-[10px] text-white/40 block uppercase font-bold">Empresa</span>
              <span className="text-white font-medium">{empresa || "ACTIUM"}</span>
            </div>
            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-[10px] text-white/40 block uppercase font-bold">Área / Proceso</span>
              <span className="text-white font-medium">{areaProceso || lugarTrabajo || "—"}</span>
            </div>
            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-[10px] text-white/40 block uppercase font-bold">Fecha / Horario</span>
              <span className="text-white font-medium">{fecha ? `${fecha} (${horaInicio || ""}-${horaFin || ""})` : "—"}</span>
            </div>
            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-[10px] text-white/40 block uppercase font-bold">Ubicación</span>
              <span className="text-white font-medium">{ubicacion || "—"}</span>
            </div>
          </div>
          {descripcionTarea && (
            <div className="mt-3 bg-white/5 p-3 rounded-lg border border-white/5 text-xs">
              <span className="text-[10px] text-white/40 block uppercase font-bold mb-1">Descripción de la tarea</span>
              <span className="text-white/80">{descripcionTarea}</span>
            </div>
          )}
        </div>

        {/* Firmas de Cierre de los Ejecutores */}
        <div className={CARD}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={SECTION_TITLE + " mb-0"}>
              <span className={NUM}>1</span> Firmas de Cierre de Personal Ejecutor
            </h2>
            <button
              type="button"
              onClick={addEjecutor}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/10 transition-colors"
            >
              <Plus className="h-3 w-3" /> Agregar Ejecutor
            </button>
          </div>
          <div className="space-y-6">
            {ejecutores.map((ej, index) => (
              <div key={ej.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                  <div>
                    {sinDatosPrevios ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                        <Input
                          value={ej.nombre}
                          onChange={(e) => updateEjecutor(ej.id, "nombre", e.target.value)}
                          placeholder="Nombre del ejecutor"
                          className="h-9 bg-white/5 border-white/10 text-white rounded-lg text-xs"
                        />
                        <Input
                          value={ej.cedula}
                          onChange={(e) => updateEjecutor(ej.id, "cedula", e.target.value)}
                          placeholder="Cédula"
                          inputMode="numeric"
                          className="h-9 bg-white/5 border-white/10 text-white rounded-lg text-xs"
                        />
                      </div>
                    ) : (
                      <>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                          {ej.nombre || `Ejecutor ${index + 1}`}
                        </h3>
                        <p className="text-[11px] text-white/40 font-mono">
                          C.C. {ej.cedula || "No registrada"}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 w-fit">
                      <Check className="h-3 w-3" /> Firma de Apertura Registrada
                    </span>
                    {ejecutores.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeEjecutor(ej.id)}
                        className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md"
                        title="Eliminar ejecutor"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <SignaturePad
                  onSave={(firma) => updateEjecutor(ej.id, "firmaCierre", firma)}
                  label={`Firma de Cierre (Fin de Labores) de ${ej.nombre.trim() || `Ejecutor ${index + 1}`}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Firma de Cierre del Emisor */}
        <div className={CARD}>
          <h2 className={SECTION_TITLE}>
            <span className={NUM}>2</span> Firma de Cierre de Autorización (Emisor / Responsable)
          </h2>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {emisorNombre || "Emisor / Responsable"}
                </h3>
                <p className="text-[11px] text-white/40 uppercase tracking-widest">
                  Emisor / Responsable {emisorCedula ? `• C.C. ${emisorCedula}` : ""}
                </p>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 w-fit">
                <Check className="h-3 w-3" /> Firma de Apertura Registrada
              </span>
            </div>
            <SignaturePad
              onSave={setEmisorFirmaCierre}
              label="Firma de Cierre del Emisor (Fin de Labores)"
            />
          </div>

          <p className="mt-4 text-[10px] text-white/30 leading-relaxed italic">
            Esta firma tiene carácter informativo y NO constituye firma electrónica certificada según la Ley 527 de 1999.
          </p>

          {errorMsg && (
            <div className="mt-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-medium text-center">
              {errorMsg}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
            <button
              type="button"
              onClick={handleGenerar}
              disabled={generando}
              className="flex h-14 w-full sm:w-auto items-center justify-center gap-3 rounded-xl bg-actium-orange px-10 text-sm font-semibold text-white transition-all hover:bg-actium-orange-hover shadow-lg shadow-actium-orange/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generando ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Guardando cierre...</>
              ) : (
                <><Download className="h-5 w-5" /> Finalizar y Guardar ATS Cerrado</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── VISTA NORMAL DE CREACIÓN (APERTURA) ──────────────────────────────────
  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl">
      {/* 1. Datos básicos */}
      <div className={CARD}>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className={SECTION_TITLE_INLINE}>
            <span className={NUM}>1</span> Datos básicos
          </h2>
          <button
            type="button"
            onClick={handleRellenarUltimo}
            disabled={rellenando}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-actium-orange/40 bg-actium-orange/10 px-4 text-[10px] font-semibold uppercase tracking-widest text-actium-orange transition-all hover:bg-actium-orange/20 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
          >
            {rellenando ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
            Rellenar con el último
          </button>
        </div>
        <p className="mb-5 text-[10px] leading-relaxed text-white/30">
          Copia el último ATS registrado, incluidos el personal ejecutor y sus cédulas. Las firmas
          siempre quedan en blanco: se firman en cada análisis.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {proyectos.length > 0 && (
            <Campo label="Proyecto Asociado">
              <select
                value={proyectoId}
                onChange={(e) => setProyectoId(e.target.value)}
                className={FIELD + " w-full px-3"}
              >
                <option value="">Seleccione un proyecto...</option>
                {proyectos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </Campo>
          )}
          <Campo label="Empresa">
            <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} className={FIELD} placeholder="Nombre de la empresa" />
          </Campo>
          <Campo label="Ciudad">
            <Input value={ciudad} onChange={(e) => setCiudad(e.target.value)} className={FIELD} />
          </Campo>
          <Campo label="Área / Proceso">
            <Input value={areaProceso} onChange={(e) => setAreaProceso(e.target.value)} className={FIELD} />
          </Campo>
          <Campo label="Ubicación">
            <Input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} className={FIELD} />
          </Campo>
          <Campo label="Lugar de trabajo">
            <Input value={lugarTrabajo} onChange={(e) => setLugarTrabajo(e.target.value)} className={FIELD} />
          </Campo>
          <Campo label="Fecha de realización">
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={FIELD} />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Hora de inicio" small>
              <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className={FIELD} />
            </Campo>
            <Campo label="Hora de fin" small>
              <Input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className={FIELD} />
            </Campo>
          </div>
          <Campo label="Descripción de la tarea a realizar" full>
            <textarea value={descripcionTarea} onChange={(e) => setDescripcionTarea(e.target.value)} className={TEXTAREA} />
          </Campo>
        </div>
      </div>

      {/* 2. Permisos requeridos */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE}>
          <span className={NUM}>2</span> Para este trabajo se requiere permiso de
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PERMISOS_REQUERIDOS.map((p) => {
            const on = permisos.includes(p.id);
            return (
              <button key={p.id} type="button" onClick={() => togglePermiso(p.id)}
                className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all min-h-[44px] ${on ? "border-actium-orange bg-actium-orange/10" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"}`}>
                <span className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 ${on ? "border-actium-orange bg-actium-orange" : "border-white/20"}`}>
                  {on && <Check className="h-3.5 w-3.5 text-white" />}
                </span>
                <span className="text-xs font-medium text-white">{p.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-3">
          <Campo label="Otro (¿cuál?)" full>
            <Input value={permisoOtroCual} onChange={(e) => setPermisoOtroCual(e.target.value)} className={FIELD} />
          </Campo>
        </div>
      </div>

      {/* 3. Equipos y herramientas */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE}>
          <span className={NUM}>3</span> Equipos y herramientas a utilizar
        </h2>
        <p className="text-[10px] text-white/30 mb-4">Indique cada una de las herramientas a utilizar por categoría.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {CATEGORIAS_HERRAMIENTAS.map((c) => (
            <Campo key={c.id} label={c.label}>
              <Input
                value={herramientas[c.id] ?? ""}
                onChange={(e) => setHerramientas((prev) => ({ ...prev, [c.id]: e.target.value }))}
                className={FIELD}
              />
            </Campo>
          ))}
        </div>
      </div>

      {/* 4. Análisis de la tarea */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE}>
          <span className={NUM}>4</span> Análisis de la tarea
        </h2>
        <div className="space-y-5">
          {PREGUNTAS_ANALISIS.map((q) => (
            <Campo key={q.id} label={q.texto} full>
              <textarea
                value={analisis[q.id] ?? ""}
                onChange={(e) => setAnalisis((prev) => ({ ...prev, [q.id]: e.target.value }))}
                className={TEXTAREA}
              />
            </Campo>
          ))}
        </div>
      </div>

      {/* 5. Pasos */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={SECTION_TITLE + " mb-0"}>
            <span className={NUM}>5</span> Pasos de la tarea
          </h2>
          <button type="button" onClick={addPaso} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-[10px] font-semibold text-white uppercase tracking-widest hover:bg-white/10 transition-colors">
            <Plus className="h-3 w-3" /> Agregar paso
          </button>
        </div>
        <div className="space-y-4">
          {pasos.map((paso, index) => (
            <div key={paso.id} className="relative rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">Paso {index + 1}</p>
                {pasos.length > 1 && (
                  <button type="button" onClick={() => removePaso(paso.id)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md" aria-label="Eliminar paso">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="space-y-4">
                <Campo label="Paso detallado" small full>
                  <Input value={paso.paso} onChange={(e) => updatePaso(paso.id, "paso", e.target.value)} className="h-11 bg-white/5 border-white/10 text-white rounded-lg" />
                </Campo>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Campo label="Peligros" small>
                    <Input value={paso.peligros} onChange={(e) => updatePaso(paso.id, "peligros", e.target.value)} className="h-11 bg-amber-500/5 border-amber-500/20 text-white rounded-lg" />
                  </Campo>
                  <Campo label="Consecuencias" small>
                    <Input value={paso.consecuencias} onChange={(e) => updatePaso(paso.id, "consecuencias", e.target.value)} className="h-11 bg-white/5 border-white/10 text-white rounded-lg" />
                  </Campo>
                  <Campo label="Controles requeridos" small>
                    <Input value={paso.controles} onChange={(e) => updatePaso(paso.id, "controles", e.target.value)} className="h-11 bg-emerald-500/5 border-emerald-500/20 text-white rounded-lg" />
                  </Campo>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Evaluación del riesgo */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE}>
          <span className={NUM}>6</span> Evaluación del riesgo
        </h2>
        <div className="space-y-6">
          <EvaluacionDecision
            pregunta={EVALUACION_RIESGO.probabilidad.pregunta}
            si={EVALUACION_RIESGO.probabilidad.si}
            no={EVALUACION_RIESGO.probabilidad.no}
            value={probabilidadIncidente}
            onChange={setProbabilidadIncidente}
          />
          <EvaluacionDecision
            pregunta={EVALUACION_RIESGO.seguridad.pregunta}
            si={EVALUACION_RIESGO.seguridad.si}
            no={EVALUACION_RIESGO.seguridad.no}
            value={seguroProceder}
            onChange={setSeguroProceder}
          />
        </div>
      </div>

      {/* 7. Personal ejecutor */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={SECTION_TITLE + " mb-0"}>
            <span className={NUM}>7</span> Personal ejecutor
          </h2>
          <button type="button" onClick={addEjecutor} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-[10px] font-semibold text-white uppercase tracking-widest hover:bg-white/10 transition-colors">
            <Plus className="h-3 w-3" /> Agregar
          </button>
        </div>
        <div className="space-y-4">
          {ejecutores.map((ej, index) => (
            <div key={ej.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  Ejecutor {index + 1}
                </span>
                {ejecutores.length > 1 && (
                  <button type="button" onClick={() => removeEjecutor(ej.id)} className="flex items-center gap-1 text-[10px] font-semibold text-red-400 hover:bg-red-400/10 px-2 py-1 rounded-md transition-colors" aria-label="Eliminar ejecutor">
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Campo label="Cédula" small>
                  <Input value={ej.cedula} onChange={(e) => updateEjecutor(ej.id, "cedula", e.target.value)} inputMode="numeric" className="h-11 bg-white/5 border-white/10 text-white rounded-lg" placeholder="Número de identificación" />
                </Campo>
                <Campo label="Nombres y apellidos" small>
                  <Input value={ej.nombre} onChange={(e) => updateEjecutor(ej.id, "nombre", e.target.value)} className="h-11 bg-white/5 border-white/10 text-white rounded-lg" placeholder="Nombres y apellidos" />
                </Campo>
              </div>
              <div className="pt-2 border-t border-white/5">
                <SignaturePad
                  onSave={(firma) => updateEjecutor(ej.id, "firma", firma)}
                  initialValue={ej.firma}
                  label={`Firma de ${ej.nombre.trim() || `Ejecutor ${index + 1}`}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 8. Autorización y firma */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE}>
          <span className={NUM}>8</span> Autorización y firma (Emisor)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <Campo label="Nombre de quien autoriza">
            <Input value={emisorNombre} onChange={(e) => setEmisorNombre(e.target.value)} className={FIELD} />
          </Campo>
          <Campo label="Cédula">
            <Input value={emisorCedula} onChange={(e) => setEmisorCedula(e.target.value)} inputMode="numeric" className={FIELD} />
          </Campo>
        </div>

        <SignaturePad onSave={setFirmaData} initialValue={firmaData} label="Firma de quien autoriza el análisis" />

        <p className="mt-3 text-[10px] text-white/30 leading-relaxed italic">
          Esta firma tiene carácter informativo y NO constituye firma electrónica certificada según la Ley 527 de 1999.
        </p>

        {errorMsg && (
          <div className="mt-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-medium text-center">
            {errorMsg}
          </div>
        )}

        {avisoMsg && (
          <div
            className={`mt-6 p-4 rounded-xl border text-sm font-medium leading-relaxed ${
              avisoPendiente
                ? "bg-warning/10 border-warning/20 text-warning"
                : "bg-success/10 border-success/20 text-success"
            }`}
          >
            {avisoMsg}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={handleGuardarBorrador} disabled={guardandoBorrador || generando}
            className="flex h-14 w-full sm:w-auto items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/5 px-8 text-sm font-semibold text-white transition-all hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed">
            {guardandoBorrador ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Guardando...</>
            ) : (
              <><Save className="h-5 w-5" /> Guardar borrador</>
            )}
          </button>
          <button type="button" onClick={handleGenerar} disabled={generando || guardandoBorrador}
            className="flex h-14 w-full sm:w-auto items-center justify-center gap-3 rounded-xl bg-actium-orange px-10 text-sm font-semibold text-white transition-all hover:bg-actium-orange-hover shadow-lg shadow-actium-orange/20 disabled:opacity-50 disabled:cursor-not-allowed">
            {generando ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Generando...</>
            ) : (
              <><Download className="h-5 w-5" /> Generar ATS en PDF</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Subcomponentes ─────────────────────────────────────────────────────────
function Campo({ label, children, full, small }: { label: string; children: React.ReactNode; full?: boolean; small?: boolean }) {
  return (
    <div className={`space-y-2 ${full ? "md:col-span-2" : ""}`}>
      <Label className={small ? "text-[10px] text-white/60" : LABEL}>{label}</Label>
      {children}
    </div>
  );
}

function EvaluacionDecision({
  pregunta,
  si,
  no,
  value,
  onChange,
}: {
  pregunta: string;
  si: string;
  no: string;
  value: ProbabilidadIncidente;
  onChange: (v: ProbabilidadIncidente) => void;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
      <p className="text-xs font-medium text-white mb-3">{pregunta}</p>
      <div className="flex gap-2 mb-3">
        {(["si", "no"] as const).map((r) => {
          const active = value === r;
          return (
            <button key={r} type="button" onClick={() => onChange(r)}
              className={`min-w-[64px] min-h-[40px] px-4 rounded-lg text-xs font-semibold uppercase tracking-wide border transition-all ${
                active
                  ? r === "si" ? "border-emerald-500 bg-emerald-500/15 text-emerald-400" : "border-red-500 bg-red-500/15 text-red-400"
                  : "border-white/10 bg-white/[0.02] text-white/40 hover:bg-white/5"
              }`}>
              {r === "si" ? "Sí" : "No"}
            </button>
          );
        })}
      </div>
      {value && (
        <p className="text-[11px] text-white/50 leading-relaxed">{value === "si" ? si : no}</p>
      )}
    </div>
  );
}
