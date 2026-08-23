"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2, Loader2, Download, Check, AlertTriangle, ShieldCheck, PenLine, History, Save } from "lucide-react";
import { SignaturePad } from "./signature-pad";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SISTEMAS_ACCESO,
  OTRAS_TAR,
  EPP_ALTURA,
  CHEQUEO_ALTURA,
  RESPUESTA_CHEQUEO,
  RESPUESTA_LABEL,
  type RespuestaChequeo,
} from "@/constants/permiso-altura";
import type {
  EjecutorAltura,
  PermisoAlturaPDFData,
} from "./permiso-altura-pdf-document";
import type { FallbackFormularioSST } from "@/lib/sst/prefill";
import { listarFaltantes, contar } from "@/lib/sst/faltantes";
import { hoyLocal } from "@/lib/fecha";

// ─── Estilos compartidos ──────────────────────────────────────────────────────
const CARD = "rounded-xl border border-white/5 bg-[#1A1A1A] p-5 sm:p-6 shadow-2xl";
const SECTION_TITLE = "flex items-center gap-2 text-sm font-bold tracking-widest text-[#F25C05] uppercase mb-6";
const SECTION_TITLE_INLINE = "flex items-center gap-2 text-sm font-bold tracking-widest text-[#F25C05] uppercase";
const NUM = "flex h-6 w-6 items-center justify-center rounded-full bg-[#F25C05]/10 text-xs";
const LABEL = "text-[10px] font-bold text-white/40 uppercase tracking-widest";
const FIELD = "h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20 [&>option]:bg-[#1A1A1A] [&>option]:text-white";
const TEXTAREA = "w-full min-h-[88px] bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm placeholder:text-white/20 focus:border-[#F25C05] focus:outline-none focus:ring-2 focus:ring-[#F25C05]/20 transition-all";

type EjecutorState = EjecutorAltura & { id: number };
let ejSeq = 1;
const nuevoEjecutor = (): EjecutorState => ({
  id: ejSeq++,
  cedula: "",
  nombre: "",
  capacitacion: "",
  profesion: "",
  seguridadSocial: "",
  firma: "",
  firmaCierre: "",
});

export function PermisoAlturaForm({ empresaInicial = "", proyectos = [] }: { empresaInicial?: string; proyectos?: { id: string; nombre: string }[] }) {
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
  const [empresa, setEmpresa] = useState(empresaInicial);
  const [ciudad, setCiudad] = useState("");
  const [lugarTrabajo, setLugarTrabajo] = useState("");
  const [areaProceso, setAreaProceso] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [vigencia, setVigencia] = useState("");
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");

  // Personal ejecutor
  const [ejecutores, setEjecutores] = useState<EjecutorState[]>([nuevoEjecutor()]);

  // 2. Descripción
  const [tiposTrabajo, setTiposTrabajo] = useState("");
  const [herramientas, setHerramientas] = useState("");
  const [alturaAprox, setAlturaAprox] = useState("");

  // 3. Medidas de prevención
  const [sistemasAcceso, setSistemasAcceso] = useState<string[]>([]);
  const [sistemasAccesoOtros, setSistemasAccesoOtros] = useState("");
  const [otrasTar, setOtrasTar] = useState<Record<string, boolean>>({});
  const [otrasTarCuales, setOtrasTarCuales] = useState("");
  const [procedimiento, setProcedimiento] = useState("");
  const [epp, setEpp] = useState<string[]>([]);
  const [eppOtros, setEppOtros] = useState("");

  // 4. Lista de chequeo
  const [chequeo, setChequeo] = useState<Record<string, RespuestaChequeo>>({});

  // Autorización
  const [emisorNombre, setEmisorNombre] = useState("");
  const [emisorCedula, setEmisorCedula] = useState("");
  const [firmaData, setFirmaData] = useState("");
  const [emisorFirmaCierre, setEmisorFirmaCierre] = useState("");

  const [sinDatosPrevios, setSinDatosPrevios] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Vuelca en el formulario un payload guardado (cierre, borrador o permiso
  // anterior). Con `conservarPersonal` no se tocan ejecutores ni firmas: al
  // copiar un permiso previo esos datos deben diligenciarse siempre de nuevo.
  const aplicarPayload = (
    payload: Partial<PermisoAlturaPDFData>,
    opciones?: { fallback?: FallbackFormularioSST; conservarPersonal?: boolean },
  ) => {
    const fb = opciones?.fallback;
    setEmpresa(payload.empresa || fb?.empresa || "");
    setCiudad(payload.ciudad || "");
    setLugarTrabajo(payload.lugarTrabajo || "");
    setAreaProceso(payload.areaProceso || fb?.area || "");
    setUbicacion(payload.ubicacion || fb?.ubicacion || "");
    setVigencia(payload.vigencia || "");
    setFecha(payload.fecha || fb?.fechaInicio || hoyLocal());
    setHoraInicio(payload.horaInicio || "");
    setHoraFin(payload.horaFin || "");
    setTiposTrabajo(payload.tiposTrabajo || "");
    setHerramientas(payload.herramientas || "");
    setAlturaAprox(payload.alturaAprox || "");
    setSistemasAcceso(payload.sistemasAcceso ?? []);
    setSistemasAccesoOtros(payload.sistemasAccesoOtros || "");
    setOtrasTar(payload.otrasTar ?? {});
    setOtrasTarCuales(payload.otrasTarCuales || "");
    setProcedimiento(payload.procedimiento || "");
    setEpp(payload.epp ?? []);
    setEppOtros(payload.eppOtros || "");
    setChequeo(payload.chequeo ?? {});

    if (opciones?.conservarPersonal) return;

    setEjecutores(
      payload.ejecutores?.length
        ? payload.ejecutores.map((e, idx) => ({ ...e, id: idx + 1 }))
        : [nuevoEjecutor()],
    );
    setEmisorNombre(payload.emisorNombre || "");
    setEmisorCedula(payload.emisorCedula || "");
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
          aplicarPayload(res.payload as PermisoAlturaPDFData, { fallback: res.fallback });
        } else {
          // Permiso previo sin JSON en Storage
          setEmpresa(res.fallback.empresa);
          setAreaProceso(res.fallback.area);
          setUbicacion(res.fallback.ubicacion);
          setFecha(res.fallback.fechaInicio || hoyLocal());
          if (cierreId) setSinDatosPrevios(true);
        }
      } catch (e) {
        console.error("Error al cargar datos previos de altura:", e);
      } finally {
        setCargandoDatos(false);
      }
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cierreId, borradorParam]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const toggleArr = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    id: string,
  ) => setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const updateEjecutor = (id: number, field: keyof EjecutorAltura, value: string) =>
    setEjecutores((prev) => prev.map((e) => (e.id === id ? { ...e, [field]: value } : e)));
  const addEjecutor = () => setEjecutores((prev) => [...prev, nuevoEjecutor()]);
  const removeEjecutor = (id: number) =>
    setEjecutores((prev) => (prev.length > 1 ? prev.filter((e) => e.id !== id) : prev));

  const setRespuesta = (itemId: string, r: RespuestaChequeo) =>
    setChequeo((prev) => ({ ...prev, [itemId]: r }));

  // Instantánea del formulario, común al PDF final y al borrador.
  const construirPayload = (): PermisoAlturaPDFData => ({
    empresa: (empresa || "ACTIUM").trim(),
    ciudad: ciudad.trim(),
    lugarTrabajo: lugarTrabajo.trim(),
    areaProceso: areaProceso.trim(),
    ubicacion: ubicacion.trim(),
    vigencia: vigencia.trim(),
    fecha: fecha || hoyLocal(),
    horaInicio,
    horaFin,
    tiposTrabajo: tiposTrabajo.trim(),
    herramientas: herramientas.trim(),
    alturaAprox: alturaAprox.trim(),
    sistemasAcceso,
    sistemasAccesoOtros: sistemasAccesoOtros.trim(),
    otrasTar,
    otrasTarCuales: otrasTarCuales.trim(),
    procedimiento: procedimiento.trim(),
    epp,
    eppOtros: eppOtros.trim(),
    chequeo,
    ejecutores: ejecutores.map(({ id: _id, ...rest }) => rest),
    emisorNombre: emisorNombre.trim(),
    emisorCedula: emisorCedula.trim(),
    firmaDataUrl: firmaData,
    emisorFirmaCierre,
  });

  // ─── Rellenar con el último permiso ─────────────────────────────────────────
  const handleRellenarUltimo = async () => {
    setErrorMsg("");
    setAvisoMsg("");
    setAvisoPendiente(false);
    setRellenando(true);
    try {
      const { obtenerUltimoFormularioAction } = await import("@/lib/actions/permisos-sst");
      const res = await obtenerUltimoFormularioAction("permiso_altura", proyectoId || undefined);

      if (!res.encontrado || !res.payload) {
        setErrorMsg("Aún no hay un permiso de altura anterior para copiar.");
        return;
      }

      aplicarPayload(res.payload as PermisoAlturaPDFData, { conservarPersonal: true });
      const ref = res.referencia;
      setAvisoMsg(
        `Se copió el permiso del ${ref?.fecha || "último registro"}${ref?.proyecto ? ` — ${ref.proyecto}` : ""}. Registre el personal ejecutor y las firmas: nunca se heredan.`,
      );
    } catch (err: any) {
      setErrorMsg(err?.message || "No fue posible recuperar el último permiso.");
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
          ? "un proyecto disponible al cual asociar el permiso"
          : "seleccionar el proyecto asociado",
      );
    }
    return faltan;
  };

  // Lo que queda por diligenciar antes de poder emitir el permiso. No bloquea el
  // borrador: se informa para que el usuario sepa por dónde retomarlo.
  const pendientesPorDiligenciar = (): string[] => {
    const faltan: string[] = [];

    if (!empresa.trim()) faltan.push("empresa");
    if (!fecha) faltan.push("fecha de realización");
    if (!ubicacion.trim()) faltan.push("ubicación del trabajo");
    if (!tiposTrabajo.trim()) faltan.push("tipos de trabajo en alturas");
    if (!alturaAprox.trim()) faltan.push("altura aproximada");
    if (sistemasAcceso.length === 0 && !sistemasAccesoOtros.trim()) {
      faltan.push("sistemas de acceso");
    }
    if (!procedimiento.trim()) faltan.push("procedimiento del trabajo");
    if (epp.length === 0 && !eppOtros.trim()) faltan.push("elementos de protección personal");

    const sinResponder = CHEQUEO_ALTURA.filter((item) => !chequeo[item.id]).length;
    if (sinResponder > 0) {
      faltan.push(`${contar(sinResponder, "ítem", "ítems")} de la lista de verificación`);
    }

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
      const data: PermisoAlturaPDFData = {
        ...construirPayload(),
        empresa: empresa.trim(),
        fecha,
      };

      const formData = new FormData();
      formData.append("payload", JSON.stringify(data));
      formData.append("tipo", "permiso_altura");
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
          ? "Borrador guardado. El permiso está completo: puede emitirlo cuando lo requiera."
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
      if (!firmaData) faltan.push("firma de quien autoriza el permiso");

      if (faltan.length > 0) {
        setErrorMsg(
          `No fue posible emitir el permiso. Falta diligenciar: ${listarFaltantes(faltan)}.`,
        );
        return;
      }
    }

    setGenerando(true);
    try {
      const data = construirPayload();

      const { buildPermisoAlturaPDFBlob } = await import("./permiso-altura-pdf-document");
      const blob = await buildPermisoAlturaPDFBlob(data);

      const formData = new FormData();
      formData.append("pdfFile", blob, "permiso-altura.pdf");
      formData.append("payload", JSON.stringify(data));
      formData.append("tipo", "permiso_altura");
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
      link.download = `permiso-altura-${(empresa || "actium").replace(/\s+/g, "-").toLowerCase()}-${fecha}.pdf`;
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
          Cargando información del permiso...
        </p>
      </div>
    );
  }

  if (cargandoDatos) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#F25C05]" />
        <p className="text-xs font-bold text-white/50 uppercase tracking-widest">
          Cargando información del permiso...
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
              Registro de Firmas de Cierre — Permiso de Altura
            </h3>
            <p className="text-xs text-white/70 mt-1 leading-relaxed">
              Diligencie las firmas de finalización de labores de cada ejecutor y del emisor responsable para cerrar formalmente el permiso y regenerar el PDF oficial.
            </p>
          </div>
        </div>

        {sinDatosPrevios && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-white/80 leading-relaxed">
              <strong className="text-amber-400">Nota:</strong> Este permiso fue emitido antes de la integración de firmas digitales duales. Puede verificar los nombres de los ejecutores a continuación y registrar sus firmas de cierre.
            </p>
          </div>
        )}

        {/* Resumen del permiso */}
        <div className={CARD}>
          <h2 className="text-xs font-bold tracking-widest text-white/50 uppercase mb-4">
            Resumen del Permiso Emitido
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-[10px] text-white/40 block uppercase font-bold">Empresa</span>
              <span className="text-white font-medium">{empresa || "ACTIUM"}</span>
            </div>
            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-[10px] text-white/40 block uppercase font-bold">Ubicación / Área</span>
              <span className="text-white font-medium">{areaProceso || ubicacion || "—"}</span>
            </div>
            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-[10px] text-white/40 block uppercase font-bold">Fecha / Horario</span>
              <span className="text-white font-medium">{fecha ? `${fecha} (${horaInicio || ""}-${horaFin || ""})` : "—"}</span>
            </div>
            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-[10px] text-white/40 block uppercase font-bold">Altura Aprox.</span>
              <span className="text-white font-medium">{alturaAprox ? `${alturaAprox} mts` : "—"}</span>
            </div>
          </div>
          {tiposTrabajo && (
            <div className="mt-3 bg-white/5 p-3 rounded-lg border border-white/5 text-xs">
              <span className="text-[10px] text-white/40 block uppercase font-bold mb-1">Trabajos en altura a realizar</span>
              <span className="text-white/80">{tiposTrabajo}</span>
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
                          C.C. {ej.cedula || "No registrada"} {ej.profesion ? `• ${ej.profesion}` : ""}
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
            <span className={NUM}>2</span> Firma de Cierre de Autorización (Emisor)
          </h2>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  {emisorNombre || "Emisor del Permiso"}
                </h3>
                <p className="text-[11px] text-white/40 uppercase tracking-widest">
                  Emisor del Permiso {emisorCedula ? `• C.C. ${emisorCedula}` : ""}
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
            <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
              {errorMsg}
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
            <button
              type="button"
              onClick={handleGenerar}
              disabled={generando}
              className="flex h-14 w-full sm:w-auto items-center justify-center gap-3 rounded-xl bg-[#F25C05] px-10 text-sm font-bold text-white transition-all hover:bg-[#F25C05]/90 shadow-lg shadow-[#F25C05]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generando ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> Guardando cierre...</>
              ) : (
                <><Download className="h-5 w-5" /> Finalizar y Guardar Permiso Cerrado</>
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
            <span className={NUM}>1</span> Datos básicos del permiso
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
          Copia los datos del último permiso de altura registrado. El personal ejecutor y las firmas
          siempre quedan en blanco: deben diligenciarse en cada permiso.
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
          <Campo label="Empresa Contratista">
            <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} className={FIELD} placeholder="Nombre de la empresa" />
          </Campo>
          <Campo label="Ciudad">
            <Input value={ciudad} onChange={(e) => setCiudad(e.target.value)} className={FIELD} />
          </Campo>
          <Campo label="Lugar de trabajo">
            <Input value={lugarTrabajo} onChange={(e) => setLugarTrabajo(e.target.value)} className={FIELD} />
          </Campo>
          <Campo label="Área / Proceso">
            <Input value={areaProceso} onChange={(e) => setAreaProceso(e.target.value)} className={FIELD} />
          </Campo>
          <Campo label="Ubicación donde se realiza el trabajo" full>
            <Input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} className={FIELD} />
          </Campo>
          <Campo label="Vigencia del permiso">
            <Input value={vigencia} onChange={(e) => setVigencia(e.target.value)} className={FIELD} placeholder="Ej. 1 día" />
          </Campo>
          <Campo label="Fecha de realización">
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={FIELD} />
          </Campo>
          <Campo label="Hora de inicio">
            <Input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} className={FIELD} />
          </Campo>
          <Campo label="Hora de finalización">
            <Input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} className={FIELD} />
          </Campo>
        </div>
      </div>

      {/* Personal ejecutor */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={SECTION_TITLE + " mb-0"}>
            <span className={NUM}>2</span> Personal ejecutor
          </h2>
          <button type="button" onClick={addEjecutor} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/10 transition-colors">
            <Plus className="h-3 w-3" /> Agregar
          </button>
        </div>
        <div className="space-y-4">
          {ejecutores.map((ej, index) => (
            <div key={ej.id} className="relative rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Ejecutor {index + 1}</p>
                {ejecutores.length > 1 && (
                  <button type="button" onClick={() => removeEjecutor(ej.id)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md" aria-label="Eliminar ejecutor">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Campo label="Cédula" small>
                  <Input value={ej.cedula} onChange={(e) => updateEjecutor(ej.id, "cedula", e.target.value)} inputMode="numeric" className="h-11 bg-white/5 border-white/10 text-white rounded-lg" />
                </Campo>
                <Campo label="Nombres y apellidos" small>
                  <Input value={ej.nombre} onChange={(e) => updateEjecutor(ej.id, "nombre", e.target.value)} className="h-11 bg-white/5 border-white/10 text-white rounded-lg" />
                </Campo>
                <Campo label="Capacitación / certificado" small>
                  <Input value={ej.capacitacion} onChange={(e) => updateEjecutor(ej.id, "capacitacion", e.target.value)} className="h-11 bg-white/5 border-white/10 text-white rounded-lg" />
                </Campo>
                <Campo label="Profesión" small>
                  <Input value={ej.profesion} onChange={(e) => updateEjecutor(ej.id, "profesion", e.target.value)} className="h-11 bg-white/5 border-white/10 text-white rounded-lg" />
                </Campo>
                <Campo label="Verificación seguridad social" small full>
                  <Input value={ej.seguridadSocial} onChange={(e) => updateEjecutor(ej.id, "seguridadSocial", e.target.value)} className="h-11 bg-white/5 border-white/10 text-white rounded-lg" placeholder="EPS / ARL / Pensión" />
                </Campo>
              </div>
              <div className="pt-2 mt-4 border-t border-white/5">
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

      {/* 3. Descripción del trabajo */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE}>
          <span className={NUM}>3</span> Descripción del trabajo
        </h2>
        <div className="space-y-5">
          <Campo label="Tipos de trabajos en alturas a realizar" full>
            <textarea value={tiposTrabajo} onChange={(e) => setTiposTrabajo(e.target.value)} className={TEXTAREA} />
          </Campo>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Campo label="Herramientas a utilizar">
              <Input value={herramientas} onChange={(e) => setHerramientas(e.target.value)} className={FIELD} />
            </Campo>
            <Campo label="Altura aproximada (mts)">
              <Input value={alturaAprox} onChange={(e) => setAlturaAprox(e.target.value)} inputMode="decimal" className={FIELD} />
            </Campo>
          </div>
        </div>
      </div>

      {/* 4. Medidas de prevención */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE}>
          <span className={NUM}>4</span> Medidas de prevención y protección
        </h2>

        <ChecksGroup
          titulo="Sistemas de acceso a utilizar"
          opciones={SISTEMAS_ACCESO}
          seleccionados={sistemasAcceso}
          onToggle={(id) => toggleArr(setSistemasAcceso, id)}
        />
        {sistemasAcceso.includes("otros") && (
          <div className="mt-3">
            <Campo label="Otros sistemas de acceso (¿cuáles?)" full>
              <Input value={sistemasAccesoOtros} onChange={(e) => setSistemasAccesoOtros(e.target.value)} className={FIELD} />
            </Campo>
          </div>
        )}

        <div className="mt-6">
          <p className={LABEL + " mb-3"}>Otras tareas de alto riesgo (TAR) involucradas</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {OTRAS_TAR.map((t) => {
              const on = !!otrasTar[t.id];
              return (
                <button key={t.id} type="button" onClick={() => setOtrasTar((p) => ({ ...p, [t.id]: !p[t.id] }))}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all min-h-[44px] ${on ? "border-[#F25C05] bg-[#F25C05]/10" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"}`}>
                  <span className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 ${on ? "border-[#F25C05] bg-[#F25C05]" : "border-white/20"}`}>
                    {on && <Check className="h-3.5 w-3.5 text-white" />}
                  </span>
                  <span className="text-xs font-medium text-white">{t.label}</span>
                </button>
              );
            })}
          </div>
          {otrasTar["otras"] && (
            <div className="mt-3">
              <Campo label="Otras (¿cuáles?)" full>
                <Input value={otrasTarCuales} onChange={(e) => setOtrasTarCuales(e.target.value)} className={FIELD} />
              </Campo>
            </div>
          )}
        </div>

        <div className="mt-6">
          <Campo label="Procedimiento para desarrollar el trabajo" full>
            <textarea value={procedimiento} onChange={(e) => setProcedimiento(e.target.value)} className={TEXTAREA} />
          </Campo>
        </div>

        <div className="mt-6">
          <ChecksGroup
            titulo="EPP y sistemas de protección contra caídas"
            opciones={EPP_ALTURA}
            seleccionados={epp}
            onToggle={(id) => toggleArr(setEpp, id)}
          />
          {epp.includes("otros") && (
            <div className="mt-3">
              <Campo label="Otros EPP (¿cuáles?)" full>
                <Input value={eppOtros} onChange={(e) => setEppOtros(e.target.value)} className={FIELD} />
              </Campo>
            </div>
          )}
        </div>
      </div>

      {/* 5. Lista de chequeo */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE}>
          <span className={NUM}>5</span> Lista de verificación
        </h2>
        <div className="space-y-2">
          {CHEQUEO_ALTURA.map((item, i) => (
            <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-white/80 leading-snug">
                <span className="text-white/30 font-bold mr-2">{i + 1}.</span>{item.texto}
              </p>
              <div className="flex gap-2 shrink-0">
                {RESPUESTA_CHEQUEO.map((r) => {
                  const active = chequeo[item.id] === r;
                  const color = r === "si" ? "emerald" : r === "no" ? "red" : "white";
                  return (
                    <button key={r} type="button" onClick={() => setRespuesta(item.id, r)}
                      className={`min-w-[44px] min-h-[40px] px-3 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${
                        active
                          ? color === "emerald"
                            ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
                            : color === "red"
                            ? "border-red-500 bg-red-500/15 text-red-400"
                            : "border-white/40 bg-white/10 text-white"
                          : "border-white/10 bg-white/[0.02] text-white/40 hover:bg-white/5"
                      }`}>
                      {RESPUESTA_LABEL[r]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Autorización y firma */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE}>
          <span className={NUM}>6</span> Autorización y firma (Emisor)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <Campo label="Nombre de quien autoriza">
            <Input value={emisorNombre} onChange={(e) => setEmisorNombre(e.target.value)} className={FIELD} />
          </Campo>
          <Campo label="Cédula">
            <Input value={emisorCedula} onChange={(e) => setEmisorCedula(e.target.value)} inputMode="numeric" className={FIELD} />
          </Campo>
        </div>

        <SignaturePad onSave={setFirmaData} initialValue={firmaData} label="Firma de quien autoriza el permiso" />

        <p className="mt-3 text-[10px] text-white/30 leading-relaxed italic">
          Esta firma tiene carácter informativo y NO constituye firma electrónica certificada según la Ley 527 de 1999.
        </p>

        {errorMsg && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
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
          <button type="button" onClick={handleGuardarBorrador} disabled={guardandoBorrador || generando}
            className="flex h-14 w-full sm:w-auto items-center justify-center gap-3 rounded-xl border border-white/15 bg-white/5 px-8 text-sm font-bold text-white transition-all hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed">
            {guardandoBorrador ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Guardando...</>
            ) : (
              <><Save className="h-5 w-5" /> Guardar borrador</>
            )}
          </button>
          <button type="button" onClick={handleGenerar} disabled={generando || guardandoBorrador}
            className="flex h-14 w-full sm:w-auto items-center justify-center gap-3 rounded-xl bg-[#F25C05] px-10 text-sm font-bold text-white transition-all hover:bg-[#F25C05]/90 shadow-lg shadow-[#F25C05]/20 disabled:opacity-50 disabled:cursor-not-allowed">
            {generando ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Generando...</>
            ) : (
              <><Download className="h-5 w-5" /> Generar permiso en PDF</>
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

function ChecksGroup({
  titulo,
  opciones,
  seleccionados,
  onToggle,
}: {
  titulo: string;
  opciones: readonly { id: string; label: string }[];
  seleccionados: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <p className={LABEL + " mb-3"}>{titulo}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {opciones.map((op) => {
          const on = seleccionados.includes(op.id);
          return (
            <button key={op.id} type="button" onClick={() => onToggle(op.id)}
              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all min-h-[44px] ${on ? "border-[#F25C05] bg-[#F25C05]/10" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"}`}>
              <span className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 ${on ? "border-[#F25C05] bg-[#F25C05]" : "border-white/20"}`}>
                {on && <Check className="h-3.5 w-3.5 text-white" />}
              </span>
              <span className="text-xs font-medium text-white">{op.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
