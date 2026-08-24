"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Plus,
  Trash2,
  Loader2,
  Download,
  History,
  Save,
  AlertTriangle,
  CheckCircle2,
  Drill,
  Disc3,
  Cable,
  Zap,
  BriefcaseMedical,
  HardHat,
  ClipboardCheck,
} from "lucide-react";
import { SignaturePad } from "./signature-pad";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  HERRAMIENTAS_PREOP,
  ESCALAS,
  equipoVacio,
  esEquipoCritico,
  itemsCriticos,
  itemsSinResponder,
  elementosFaltantes,
  elementosVencidos,
  elementosSinContar,
  itemsPorGrupo,
  valorCritico,
  CERTIFICACION_OPERADOR,
  type EquipoPreop,
  type EstadoHerramientaPreop,
  type HerramientaPreop,
} from "@/constants/preoperacional";
import type { PreoperacionalPDFData } from "./preoperacional-pdf-document";
import type { FallbackFormularioSST } from "@/lib/sst/prefill";
import { listarFaltantes, contar } from "@/lib/sst/faltantes";
import { hoyLocal } from "@/lib/fecha";

const CARD = "rounded-xl border border-white/5 bg-[#1A1A1A] p-5 sm:p-6 shadow-2xl";
const SECTION_TITLE_INLINE = "flex items-center gap-2 text-sm font-bold tracking-widest text-[#F25C05] uppercase";
const NUM = "flex h-6 w-6 items-center justify-center rounded-full bg-[#F25C05]/10 text-xs";
const LABEL = "text-[10px] font-bold text-white/40 uppercase tracking-widest";
const FIELD = "h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20 [&>option]:bg-[#1A1A1A] [&>option]:text-white";
const TEXTAREA = "w-full min-h-[88px] bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm placeholder:text-white/20 focus:border-[#F25C05] focus:outline-none focus:ring-2 focus:ring-[#F25C05]/20 transition-all";

const ICONOS: Record<string, React.ComponentType<{ className?: string }>> = {
  Drill,
  Disc3,
  Cable,
  Zap,
  BriefcaseMedical,
  HardHat,
};

function estadoInicial(): Record<string, EstadoHerramientaPreop> {
  return Object.fromEntries(
    HERRAMIENTAS_PREOP.map((h) => [h.id, { noAplica: false, equipos: h.unico ? [equipoVacio()] : [] }]),
  );
}

export function PreoperacionalForm({ proyectos = [] }: { proyectos?: { id: string; nombre: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const borradorParam = searchParams.get("borradorId");

  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [existingPdfPath, setExistingPdfPath] = useState<string | null>(null);
  // Fila en estado borrador que se está diligenciando (recién guardada o retomada).
  const [borradorId, setBorradorId] = useState<string | null>(borradorParam);
  const [guardandoBorrador, setGuardandoBorrador] = useState(false);
  const [rellenando, setRellenando] = useState(false);
  const [avisoMsg, setAvisoMsg] = useState("");
  const [avisoPendiente, setAvisoPendiente] = useState(false);

  // 1. Datos generales
  const [proyectoId, setProyectoId] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [frenteTrabajo, setFrenteTrabajo] = useState("");
  const [area, setArea] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [trabajoEjecutado, setTrabajoEjecutado] = useState("");

  // 2. Herramientas inspeccionadas
  const [herramientas, setHerramientas] = useState<Record<string, EstadoHerramientaPreop>>(estadoInicial);
  const [observacionesGenerales, setObservacionesGenerales] = useState("");

  // Firmas
  const [inspectorNombre, setInspectorNombre] = useState("");
  const [inspectorCedula, setInspectorCedula] = useState("");
  const [inspectorFirma, setInspectorFirma] = useState("");
  const [supervisorNombre, setSupervisorNombre] = useState("");
  const [supervisorCedula, setSupervisorCedula] = useState("");
  const [supervisorFirma, setSupervisorFirma] = useState("");

  const [generando, setGenerando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const hoy = hoyLocal();

  // ─── Hidratación ────────────────────────────────────────────────────────────

  /**
   * Vuelca un payload guardado en el formulario. Con `conservarPersonal` no se
   * tocan las firmas ni los nombres, y con `soloEquipos` se conserva el parque de
   * herramientas —qué equipos existen y cómo se identifican— pero se descartan
   * las calificaciones: la inspección de hoy hay que hacerla hoy.
   */
  const aplicarPayload = (
    payload: Partial<PreoperacionalPDFData>,
    opciones?: {
      fallback?: FallbackFormularioSST;
      conservarPersonal?: boolean;
      soloEquipos?: boolean;
    },
  ) => {
    const fb = opciones?.fallback;
    setEmpresa(payload.empresa || fb?.empresa || "");
    setFrenteTrabajo(payload.frenteTrabajo || "");
    setArea(payload.area || fb?.area || "");
    setUbicacion(payload.ubicacion || fb?.ubicacion || "");
    setFecha(payload.fecha || fb?.fechaInicio || hoyLocal());
    setHoraInicio(payload.horaInicio || "");
    setHoraFin(payload.horaFin || "");
    setTrabajoEjecutado(payload.trabajoEjecutado || "");

    const base = estadoInicial();
    for (const herramienta of HERRAMIENTAS_PREOP) {
      const guardada = payload.herramientas?.[herramienta.id];
      if (!guardada) continue;
      base[herramienta.id] = {
        noAplica: Boolean(guardada.noAplica),
        equipos: (guardada.equipos ?? []).map((equipo) => ({
          ...equipoVacio(),
          ...equipo,
          // Al copiar un permiso anterior se hereda el equipo, no su calificación.
          respuestas: opciones?.soloEquipos ? {} : { ...(equipo.respuestas ?? {}) },
          inventario: opciones?.soloEquipos ? {} : { ...(equipo.inventario ?? {}) },
          observaciones: opciones?.soloEquipos ? "" : equipo.observaciones || "",
          epp: [...(equipo.epp ?? [])],
        })),
      };
    }
    setHerramientas(base);
    setObservacionesGenerales(opciones?.soloEquipos ? "" : payload.observacionesGenerales || "");

    if (opciones?.conservarPersonal) return;

    setInspectorNombre(payload.inspectorNombre || "");
    setInspectorCedula(payload.inspectorCedula || "");
    setInspectorFirma(payload.inspectorFirma || "");
    setSupervisorNombre(payload.supervisorNombre || "");
    setSupervisorCedula(payload.supervisorCedula || "");
    setSupervisorFirma(payload.supervisorFirma || "");
  };

  // Retomar un borrador guardado.
  useEffect(() => {
    if (!borradorParam) return;
    setCargandoDatos(true);
    async function cargar() {
      try {
        const { obtenerDatosCierreAction } = await import("@/lib/actions/permisos-sst");
        const res = await obtenerDatosCierreAction(borradorParam!);

        if (res.pdfPath) setExistingPdfPath(res.pdfPath);
        if (res.proyectoId) setProyectoId(res.proyectoId);

        if (res.payload) {
          aplicarPayload(res.payload as PreoperacionalPDFData, { fallback: res.fallback });
        } else {
          setEmpresa(res.fallback.empresa);
          setArea(res.fallback.area);
          setUbicacion(res.fallback.ubicacion);
          setFecha(res.fallback.fechaInicio || hoyLocal());
        }
      } catch (e) {
        console.error("Error al cargar el borrador preoperacional:", e);
      } finally {
        setCargandoDatos(false);
      }
    }
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borradorParam]);

  // ─── Manipulación de equipos ────────────────────────────────────────────────

  const agregarEquipo = (hid: string) =>
    setHerramientas((prev) => ({
      ...prev,
      [hid]: { noAplica: false, equipos: [...prev[hid].equipos, equipoVacio()] },
    }));

  const eliminarEquipo = (hid: string, indice: number) =>
    setHerramientas((prev) => ({
      ...prev,
      [hid]: { ...prev[hid], equipos: prev[hid].equipos.filter((_, i) => i !== indice) },
    }));

  const toggleNoAplica = (hid: string) =>
    setHerramientas((prev) => ({
      ...prev,
      [hid]: { ...prev[hid], noAplica: !prev[hid].noAplica },
    }));

  const actualizarEquipo = (hid: string, indice: number, cambio: (e: EquipoPreop) => EquipoPreop) =>
    setHerramientas((prev) => ({
      ...prev,
      [hid]: {
        ...prev[hid],
        equipos: prev[hid].equipos.map((equipo, i) => (i === indice ? cambio(equipo) : equipo)),
      },
    }));

  // ─── Payload ────────────────────────────────────────────────────────────────

  const construirPayload = (): PreoperacionalPDFData => ({
    empresa: (empresa || "ACTIUM").trim(),
    frenteTrabajo: frenteTrabajo.trim(),
    area: area.trim(),
    ubicacion: ubicacion.trim(),
    fecha: fecha || hoyLocal(),
    horaInicio,
    horaFin,
    trabajoEjecutado: trabajoEjecutado.trim(),
    herramientas,
    observacionesGenerales: observacionesGenerales.trim(),
    inspectorNombre: inspectorNombre.trim(),
    inspectorCedula: inspectorCedula.trim(),
    inspectorFirma,
    supervisorNombre: supervisorNombre.trim(),
    supervisorCedula: supervisorCedula.trim(),
    supervisorFirma,
  });

  // ─── Faltantes ──────────────────────────────────────────────────────────────

  const faltantesParaGuardar = (): string[] => {
    const faltan: string[] = [];
    if (!proyectoId) {
      faltan.push(
        proyectos.length === 0
          ? "un proyecto disponible al cual asociar la inspección"
          : "seleccionar el proyecto asociado",
      );
    }
    return faltan;
  };

  /** Equipos con hallazgo crítico y sin observación: hay que decir qué se encontró. */
  const criticosSinObservacion = (): string[] => {
    const pendientes: string[] = [];
    for (const herramienta of HERRAMIENTAS_PREOP) {
      const estado = herramientas[herramienta.id];
      if (estado.noAplica) continue;
      estado.equipos.forEach((equipo, i) => {
        if (esEquipoCritico(herramienta, equipo, hoy) && !equipo.observaciones.trim()) {
          pendientes.push(`la observación de ${herramienta.nombre.toLowerCase()} ${i + 1}`);
        }
      });
    }
    return pendientes;
  };

  const pendientesPorDiligenciar = (): string[] => {
    const faltan: string[] = [];

    if (!empresa.trim()) faltan.push("empresa");
    if (!fecha) faltan.push("fecha de inspección");
    if (!frenteTrabajo.trim()) faltan.push("frente de trabajo");
    if (!trabajoEjecutado.trim()) faltan.push("trabajo ejecutado");

    const sinDefinir = HERRAMIENTAS_PREOP.filter(
      (h) => !herramientas[h.id].noAplica && herramientas[h.id].equipos.length === 0,
    );
    if (sinDefinir.length > 0) {
      faltan.push(
        `registrar equipos o marcar como no aplica: ${sinDefinir
          .map((h) => h.nombre.toLowerCase())
          .join(", ")}`,
      );
    }

    for (const herramienta of HERRAMIENTAS_PREOP) {
      const estado = herramientas[herramienta.id];
      if (estado.noAplica) continue;
      estado.equipos.forEach((equipo, i) => {
        const rotulo = `${herramienta.nombre.toLowerCase()} ${i + 1}`;
        if (herramienta.modo === "inventario") {
          const sinContar = elementosSinContar(herramienta, equipo).length;
          if (sinContar > 0) {
            faltan.push(`${contar(sinContar, "elemento", "elementos")} sin contar en ${rotulo}`);
          }
        } else {
          const sinResponder = itemsSinResponder(herramienta, equipo).length;
          if (sinResponder > 0) {
            faltan.push(`${contar(sinResponder, "ítem", "ítems")} sin calificar en ${rotulo}`);
          }
        }
      });
    }

    faltan.push(...criticosSinObservacion());

    if (!inspectorNombre.trim()) faltan.push("nombre de quien inspecciona");
    if (!inspectorFirma) faltan.push("firma de quien inspecciona");
    if (!supervisorNombre.trim()) faltan.push("nombre del supervisor");
    if (!supervisorFirma) faltan.push("firma del supervisor");

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
      const res = await obtenerUltimoFormularioAction("preoperacional", proyectoId || undefined);

      if (!res.encontrado || !res.payload) {
        setErrorMsg("Aún no hay una inspección preoperacional anterior para copiar.");
        return;
      }

      aplicarPayload(res.payload as PreoperacionalPDFData, {
        conservarPersonal: true,
        soloEquipos: true,
      });
      const ref = res.referencia;
      setAvisoMsg(
        `Se copiaron los equipos de la inspección del ${ref?.fecha || "último registro"}${
          ref?.proyecto ? ` — ${ref.proyecto}` : ""
        }. Las calificaciones y las firmas quedan en blanco: la inspección de hoy debe realizarse hoy.`,
      );
    } catch (err: any) {
      setErrorMsg(err?.message || "No fue posible recuperar la última inspección.");
    } finally {
      setRellenando(false);
    }
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
      // que solo aplican al emitir (empresa "ACTIUM", fecha de hoy).
      const data: PreoperacionalPDFData = {
        ...construirPayload(),
        empresa: empresa.trim(),
        fecha,
      };

      const formData = new FormData();
      formData.append("payload", JSON.stringify(data));
      formData.append("tipo", "preoperacional");
      formData.append("proyectoId", proyectoId);
      if (borradorId) formData.append("borradorId", borradorId);
      if (existingPdfPath) formData.append("existingPdfPath", existingPdfPath);
      formData.append("area", data.area);
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
          ? "Borrador guardado. La inspección está completa: puede emitirla cuando lo requiera."
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
    if (!fecha) faltan.push("fecha de inspección");
    if (!inspectorFirma) faltan.push("firma de quien inspecciona");

    const sinEquipos = HERRAMIENTAS_PREOP.every(
      (h) => herramientas[h.id].noAplica || herramientas[h.id].equipos.length === 0,
    );
    if (sinEquipos) faltan.push("al menos un equipo inspeccionado");

    // Un hallazgo crítico sin explicar deja el registro inservible: es justo lo
    // que hay que poder auditar después.
    faltan.push(...criticosSinObservacion());

    if (faltan.length > 0) {
      setErrorMsg(
        `No fue posible emitir la inspección. Falta diligenciar: ${listarFaltantes(faltan)}.`,
      );
      return;
    }

    setGenerando(true);
    try {
      const data = construirPayload();

      const { buildPreoperacionalPDFBlob } = await import("./preoperacional-pdf-document");
      const blob = await buildPreoperacionalPDFBlob(data);

      const formData = new FormData();
      formData.append("pdfFile", blob, "instrucciones-preoperacionales.pdf");
      formData.append("payload", JSON.stringify(data));
      formData.append("tipo", "preoperacional");
      if (borradorId) formData.append("formularioId", borradorId);
      if (existingPdfPath) formData.append("existingPdfPath", existingPdfPath);
      if (proyectoId) formData.append("proyectoId", proyectoId);
      formData.append("area", data.area);
      formData.append("ubicacion", data.ubicacion || "N/A");
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
      link.download = `preoperacional-${(empresa || "actium").replace(/\s+/g, "-").toLowerCase()}-${data.fecha}.pdf`;
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
          Cargando la inspección...
        </p>
      </div>
    );
  }

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
          Copia los equipos de la última inspección con su identificación. Las calificaciones y las
          firmas siempre quedan en blanco: el estado de hoy debe verificarse hoy.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {proyectos.length > 0 && (
            <CampoForm label="Proyecto asociado">
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
            </CampoForm>
          )}
          <CampoForm label="Empresa">
            <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} className={FIELD} placeholder="Nombre de la empresa" />
          </CampoForm>
          <CampoForm label="Frente de trabajo">
            <Input value={frenteTrabajo} onChange={(e) => setFrenteTrabajo(e.target.value)} className={FIELD} />
          </CampoForm>
          <CampoForm label="Área / Proceso">
            <Input value={area} onChange={(e) => setArea(e.target.value)} className={FIELD} />
          </CampoForm>
          <CampoForm label="Ubicación">
            <Input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} className={FIELD} />
          </CampoForm>
          <CampoForm label="Fecha de inspección">
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
          <CampoForm label="Trabajo ejecutado" full>
            <textarea value={trabajoEjecutado} onChange={(e) => setTrabajoEjecutado(e.target.value)} className={TEXTAREA} />
          </CampoForm>
        </div>
      </div>

      {/* 2..n. Herramientas */}
      {HERRAMIENTAS_PREOP.map((herramienta, indice) => (
        <SeccionHerramienta
          key={herramienta.id}
          herramienta={herramienta}
          numero={indice + 2}
          estado={herramientas[herramienta.id]}
          hoy={hoy}
          onAgregar={() => agregarEquipo(herramienta.id)}
          onEliminar={(i) => eliminarEquipo(herramienta.id, i)}
          onToggleNoAplica={() => toggleNoAplica(herramienta.id)}
          onActualizar={(i, cambio) => actualizarEquipo(herramienta.id, i, cambio)}
        />
      ))}

      {/* Observaciones generales */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE_INLINE + " mb-6"}>
          <span className={NUM}>{HERRAMIENTAS_PREOP.length + 2}</span> Observaciones generales
        </h2>
        <textarea
          value={observacionesGenerales}
          onChange={(e) => setObservacionesGenerales(e.target.value)}
          className={TEXTAREA}
          placeholder="Hallazgos, acciones tomadas o novedades de la jornada."
        />
      </div>

      {/* Firmas */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE_INLINE + " mb-6"}>
          <span className={NUM}>{HERRAMIENTAS_PREOP.length + 3}</span> Firmas
        </h2>

        <p className="mb-6 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-[11px] leading-relaxed text-white/60">
          {CERTIFICACION_OPERADOR}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <CampoForm label="Nombre de quien inspecciona">
            <Input value={inspectorNombre} onChange={(e) => setInspectorNombre(e.target.value)} className={FIELD} />
          </CampoForm>
          <CampoForm label="Cédula">
            <Input value={inspectorCedula} onChange={(e) => setInspectorCedula(e.target.value)} inputMode="numeric" className={FIELD} />
          </CampoForm>
        </div>
        <SignaturePad onSave={setInspectorFirma} initialValue={inspectorFirma} label="Firma de quien inspecciona (operador)" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-8 mb-6">
          <CampoForm label="Nombre del supervisor">
            <Input value={supervisorNombre} onChange={(e) => setSupervisorNombre(e.target.value)} className={FIELD} />
          </CampoForm>
          <CampoForm label="Cédula">
            <Input value={supervisorCedula} onChange={(e) => setSupervisorCedula(e.target.value)} inputMode="numeric" className={FIELD} />
          </CampoForm>
        </div>
        <SignaturePad onSave={setSupervisorFirma} initialValue={supervisorFirma} label="Firma del supervisor SST" />

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
              <><Download className="h-5 w-5" /> Generar inspección en PDF</>
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

function SeccionHerramienta({
  herramienta,
  numero,
  estado,
  hoy,
  onAgregar,
  onEliminar,
  onToggleNoAplica,
  onActualizar,
}: {
  herramienta: HerramientaPreop;
  numero: number;
  estado: EstadoHerramientaPreop;
  hoy: string;
  onAgregar: () => void;
  onEliminar: (indice: number) => void;
  onToggleNoAplica: () => void;
  onActualizar: (indice: number, cambio: (e: EquipoPreop) => EquipoPreop) => void;
}) {
  const Icono = ICONOS[herramienta.icono] ?? ClipboardCheck;
  const cantidad = estado.equipos.length;

  return (
    <div className={CARD}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={NUM}>{numero}</span>
          <div>
            <h2 className="text-sm font-bold uppercase tracking-widest text-[#F25C05] flex items-center gap-2">
              <Icono className="h-4 w-4" />
              {herramienta.nombre}
            </h2>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-white/30">
              {herramienta.subtitulo}
              {cantidad > 0 && ` · ${contar(cantidad, "equipo", "equipos")}`}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onToggleNoAplica}
            className={`flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-[10px] font-bold uppercase tracking-widest transition-all ${
              estado.noAplica
                ? "border-white/30 bg-white/10 text-white"
                : "border-white/10 bg-white/[0.02] text-white/40 hover:bg-white/5"
            }`}
          >
            {estado.noAplica ? "No aplica" : "Marcar no aplica"}
          </button>
          {!estado.noAplica && !herramienta.unico && (
            <button
              type="button"
              onClick={onAgregar}
              className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#F25C05]/40 bg-[#F25C05]/10 px-4 text-[10px] font-bold uppercase tracking-widest text-[#F25C05] transition-all hover:bg-[#F25C05]/20"
            >
              <Plus className="h-4 w-4" /> Agregar {herramienta.singular}
            </button>
          )}
        </div>
      </div>

      {estado.noAplica ? (
        <p className="mt-6 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-xs text-white/40">
          {herramienta.unico
            ? "Esta sección no aplica a la labor. Saldrá como no aplica en el permiso."
            : "Esta herramienta no se utiliza en la labor. Saldrá como no aplica en el permiso."}
        </p>
      ) : cantidad === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-xs text-white/40">
          Aún no hay {herramienta.nombre.toLowerCase()} registrada. Agregue una por cada equipo que
          vaya a inspeccionar, o marque la herramienta como no aplica.
        </p>
      ) : (
        <div className="mt-6 space-y-5">
          {ESCALAS[herramienta.escala].leyenda && herramienta.modo === "chequeo" && (
            <p className="text-[10px] leading-relaxed text-white/30">
              {ESCALAS[herramienta.escala].leyenda}
            </p>
          )}

          {estado.equipos.map((equipo, i) => (
            <EquipoCard
              key={i}
              herramienta={herramienta}
              equipo={equipo}
              indice={i}
              hoy={hoy}
              onEliminar={() => onEliminar(i)}
              onActualizar={(cambio) => onActualizar(i, cambio)}
            />
          ))}
        </div>
      )}

      {(herramienta.notas ?? []).map((nota, i) => (
        <p key={i} className="mt-4 text-[10px] leading-relaxed text-white/25">
          {nota}
        </p>
      ))}
    </div>
  );
}

function EquipoCard({
  herramienta,
  equipo,
  indice,
  hoy,
  onEliminar,
  onActualizar,
}: {
  herramienta: HerramientaPreop;
  equipo: EquipoPreop;
  indice: number;
  hoy: string;
  onEliminar: () => void;
  onActualizar: (cambio: (e: EquipoPreop) => EquipoPreop) => void;
}) {
  const critico = esEquipoCritico(herramienta, equipo, hoy);
  const faltantes = elementosFaltantes(herramienta, equipo).map((el) => el.id);
  const vencidos = elementosVencidos(herramienta, equipo, hoy).map((el) => el.id);
  const criticos = itemsCriticos(herramienta, equipo).length;

  const setIdentificacion = (campo: string, valor: string) =>
    onActualizar((e) => ({ ...e, identificacion: { ...e.identificacion, [campo]: valor } }));

  const setRespuesta = (item: string, valor: string) =>
    onActualizar((e) => ({ ...e, respuestas: { ...e.respuestas, [item]: valor } }));

  const toggleEpp = (id: string) =>
    onActualizar((e) => ({
      ...e,
      epp: e.epp.includes(id) ? e.epp.filter((x) => x !== id) : [...e.epp, id],
    }));

  const setInventario = (id: string, campo: "cantidad" | "vence", valor: string) =>
    onActualizar((e) => {
      const anterior = e.inventario[id] ?? { cantidad: "", vence: "" };
      return { ...e, inventario: { ...e.inventario, [id]: { ...anterior, [campo]: valor } } };
    });

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 transition-colors ${
        critico ? "border-red-500/30 bg-red-500/[0.04]" : "border-white/5 bg-white/[0.02]"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-white">
            {herramienta.unico ? herramienta.nombre : `${herramienta.nombre} ${indice + 1}`}
          </span>
          {critico ? (
            <span className="flex items-center gap-1 rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-red-400">
              <AlertTriangle className="h-3 w-3" /> {herramienta.etiquetaCritica}
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              {herramienta.modo === "inventario" ? "Dotación completa" : "Apto"}
            </span>
          )}
        </div>
        {!herramienta.unico && (
          <button
            type="button"
            onClick={onEliminar}
            className="flex h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-[10px] font-bold uppercase tracking-widest text-red-400 transition-colors hover:bg-red-400/10 sm:w-auto"
            aria-label={`Eliminar ${herramienta.singular} ${indice + 1}`}
          >
            <Trash2 className="h-4 w-4" /> Eliminar
          </button>
        )}
      </div>

      {/* Identificación del equipo */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {herramienta.identificacion.map((campo) => (
          <div key={campo.id} className={`space-y-2 ${campo.full ? "sm:col-span-2" : ""}`}>
            <Label className="text-[10px] text-white/60">{campo.label}</Label>
            <Input
              value={equipo.identificacion[campo.id] ?? ""}
              onChange={(e) => setIdentificacion(campo.id, e.target.value)}
              className="h-11 bg-white/5 border-white/10 text-white rounded-lg"
            />
          </div>
        ))}
      </div>

      {/* Lista de chequeo o inventario */}
      {herramienta.modo === "chequeo" ? (
        <div className="mt-5 space-y-5">
          {itemsPorGrupo(herramienta).map((grupo, gi) => (
            <div key={grupo.grupo ?? gi} className="space-y-2">
              {grupo.grupo && (
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/50 border-b border-white/5 pb-2">
                  {grupo.grupo}
                </p>
              )}
              {grupo.items.map(({ item, codigo }) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-2 rounded-lg border border-white/5 bg-white/[0.02] p-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4"
                >
                  <p className="text-xs leading-relaxed text-white/80 lg:flex-1">
                    {codigo && <span className="text-white/40 mr-1.5">{codigo}</span>}
                    {item.texto}
                  </p>
                  <div className="flex gap-2 lg:shrink-0">
                    {ESCALAS[herramienta.escala].opciones.map((op) => {
                      const activo = equipo.respuestas[item.id] === op.id;
                      const esCritico = op.id === valorCritico(herramienta.escala, item);
                      return (
                        <button
                          key={op.id}
                          type="button"
                          onClick={() => setRespuesta(item.id, op.id)}
                          className={`min-h-[44px] flex-1 rounded-lg border px-2 text-[10px] font-bold uppercase tracking-widest transition-all lg:flex-none lg:px-3 ${
                            activo
                              ? esCritico
                                ? "border-red-500 bg-red-500/20 text-red-300"
                                : op.id === "na"
                                ? "border-white/30 bg-white/10 text-white/70"
                                : "border-emerald-500 bg-emerald-500/20 text-emerald-300"
                              : "border-white/10 bg-white/[0.02] text-white/40 hover:bg-white/5"
                          }`}
                        >
                          {op.corto}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {(herramienta.inventario ?? []).map((el) => {
            const registro = equipo.inventario[el.id];
            const falta = faltantes.includes(el.id);
            const vencido = vencidos.includes(el.id);
            return (
              <div
                key={el.id}
                className={`flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${
                  falta || vencido ? "border-red-500/30 bg-red-500/[0.06]" : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <div className="sm:flex-1">
                  <p className="text-xs leading-relaxed text-white/80">{el.nombre}</p>
                  <p className="mt-0.5 text-[10px] uppercase tracking-widest text-white/30">
                    {el.presentacion} · Requerida: {el.requerida}
                  </p>
                </div>
                <div className="flex gap-2 sm:shrink-0">
                  <div className="flex-1 space-y-1 sm:w-24 sm:flex-none">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Encontrada</Label>
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={registro?.cantidad ?? ""}
                      onChange={(e) => setInventario(el.id, "cantidad", e.target.value)}
                      className="h-11 bg-white/5 border-white/10 text-white rounded-lg"
                    />
                  </div>
                  <div className="flex-1 space-y-1 sm:w-36 sm:flex-none">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Vence</Label>
                    <Input
                      type="month"
                      value={registro?.vence ?? ""}
                      onChange={(e) => setInventario(el.id, "vence", e.target.value)}
                      className="h-11 bg-white/5 border-white/10 text-white rounded-lg"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EPP (máquina de soldar) */}
      {herramienta.epp && (
        <div className="mt-5">
          <p className={LABEL + " mb-3"}>EPP a utilizar</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {herramienta.epp.map((ep) => {
              const on = equipo.epp.includes(ep.id);
              return (
                <button
                  key={ep.id}
                  type="button"
                  onClick={() => toggleEpp(ep.id)}
                  className={`flex min-h-[44px] items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                    on ? "border-[#F25C05] bg-[#F25C05]/10" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      on ? "border-[#F25C05] bg-[#F25C05]" : "border-white/20"
                    }`}
                  >
                    {on && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                  </span>
                  <span className="text-xs font-medium text-white">{ep.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Observaciones del equipo */}
      <div className="mt-5 space-y-2">
        <Label className="text-[10px] text-white/60">
          Observaciones
          {critico && <span className="ml-1 text-red-400">· obligatoria por el hallazgo</span>}
        </Label>
        <textarea
          value={equipo.observaciones}
          onChange={(e) => onActualizar((prev) => ({ ...prev, observaciones: e.target.value }))}
          className={`w-full min-h-[72px] rounded-xl border bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/20 transition-all focus:outline-none focus:ring-2 ${
            critico && !equipo.observaciones.trim()
              ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
              : "border-white/10 focus:border-[#F25C05] focus:ring-[#F25C05]/20"
          }`}
          placeholder={
            critico
              ? herramienta.modo === "inventario"
                ? "Indique qué elementos faltan o están vencidos y qué acción se tomó."
                : `Indique qué se encontró en ${contar(criticos, "ítem", "ítems")} en estado crítico y qué acción se tomó.`
              : "Novedades del equipo (opcional)."
          }
        />
      </div>
    </div>
  );
}
