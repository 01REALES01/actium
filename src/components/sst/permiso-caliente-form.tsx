"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2, Loader2, Download, Check, AlertTriangle, ShieldCheck, PenLine } from "lucide-react";
import { SignaturePad } from "./signature-pad";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PERMISOS_ADICIONALES,
  ENERGIAS_PELIGROSAS,
  EPP_CALIENTE,
  CHEQUEO_CALIENTE,
  RESPUESTA_CHEQUEO,
  RESPUESTA_LABEL,
  RESPUESTA_SINO,
  type RespuestaChequeo,
  type RespuestaSiNo,
} from "@/constants/permiso-caliente";
import type {
  TrabajadorCaliente,
  PermisoCalientePDFData,
} from "./permiso-caliente-pdf-document";

const CARD = "rounded-xl border border-white/5 bg-[#1A1A1A] p-5 sm:p-6 shadow-2xl";
const SECTION_TITLE = "flex items-center gap-2 text-sm font-bold tracking-widest text-[#F25C05] uppercase mb-6";
const NUM = "flex h-6 w-6 items-center justify-center rounded-full bg-[#F25C05]/10 text-xs";
const LABEL = "text-[10px] font-bold text-white/40 uppercase tracking-widest";
const FIELD = "h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20 [&>option]:bg-[#1A1A1A] [&>option]:text-white";
const TEXTAREA = "w-full min-h-[88px] bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm placeholder:text-white/20 focus:border-[#F25C05] focus:outline-none focus:ring-2 focus:ring-[#F25C05]/20 transition-all";

type TrabajadorState = TrabajadorCaliente & { id: number };
let tSeq = 1;
const nuevoTrabajador = (): TrabajadorState => ({ id: tSeq++, nombre: "", cedula: "", firma: "", firmaCierre: "" });

export function PermisoCalienteForm({ proyectos = [] }: { proyectos?: { id: string; nombre: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cierreId = searchParams.get("cierreId");

  const [esModoCierre, setEsModoCierre] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(false);
  const [existingPdfPath, setExistingPdfPath] = useState<string | null>(null);

  // 1. Datos básicos
  const [proyectoId, setProyectoId] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [area, setArea] = useState("");
  const [proposito, setProposito] = useState("");
  const [desde, setDesde] = useState("");
  const [desdeHora, setDesdeHora] = useState("");
  const [hasta, setHasta] = useState("");
  const [hastaHora, setHastaHora] = useState("");

  // 2. Permisos adicionales
  const [permisosAdicionales, setPermisosAdicionales] = useState<Record<string, RespuestaSiNo>>({});
  const [instruccionesSO, setInstruccionesSO] = useState<Record<string, string>>({});

  // 3. Lista de chequeo
  const [chequeo, setChequeo] = useState<Record<string, RespuestaChequeo>>({});

  // 4. Bloqueo de energías
  const [energias, setEnergias] = useState<string[]>([]);
  const [equiposBloquear, setEquiposBloquear] = useState("");
  const [mecanismoBloqueo, setMecanismoBloqueo] = useState("");
  const [bloqueadoPor, setBloqueadoPor] = useState("");

  // 5. EPP
  const [epp, setEpp] = useState<string[]>([]);

  // 6. Trabajadores y firmas
  const [trabajadores, setTrabajadores] = useState<TrabajadorState[]>([nuevoTrabajador()]);
  const [emisorNombre, setEmisorNombre] = useState("");
  const [emisorFirma, setEmisorFirma] = useState("");
  const [emisorFirmaCierre, setEmisorFirmaCierre] = useState("");
  const [coordinadorNombre, setCoordinadorNombre] = useState("");
  const [coordinadorFirma, setCoordinadorFirma] = useState("");
  const [coordinadorFirmaCierre, setCoordinadorFirmaCierre] = useState("");

  const [sinDatosPrevios, setSinDatosPrevios] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Cargar datos previos si es modo cierre
  useEffect(() => {
    if (!cierreId) return;
    setEsModoCierre(true);
    setCargandoDatos(true);
    async function cargar() {
      try {
        const { obtenerDatosCierreAction } = await import("@/lib/actions/permisos-sst");
        const res = await obtenerDatosCierreAction(cierreId!);

        if (res.pdfPath) setExistingPdfPath(res.pdfPath);
        if (res.proyectoId) setProyectoId(res.proyectoId);

        if (res.payload) {
          const payload: PermisoCalientePDFData = res.payload;
          setEmpresa(payload.empresa || res.fallback.empresa);
          setArea(payload.area || res.fallback.area);
          setProposito(payload.proposito || "");
          setDesde(payload.desde || res.fallback.fechaInicio || new Date().toISOString().split("T")[0]);
          setDesdeHora(payload.desdeHora || "");
          setHasta(payload.hasta || res.fallback.fechaInicio || new Date().toISOString().split("T")[0]);
          setHastaHora(payload.hastaHora || "");
          if (payload.permisosAdicionales) setPermisosAdicionales(payload.permisosAdicionales);
          if (payload.instruccionesSO) setInstruccionesSO(payload.instruccionesSO);
          if (payload.chequeo) setChequeo(payload.chequeo);
          if (payload.energias) setEnergias(payload.energias);
          setEquiposBloquear(payload.equiposBloquear || "");
          setMecanismoBloqueo(payload.mecanismoBloqueo || "");
          setBloqueadoPor(payload.bloqueadoPor || "");
          if (payload.epp) setEpp(payload.epp);
          if (payload.trabajadores && payload.trabajadores.length > 0) {
            setTrabajadores(payload.trabajadores.map((t, idx) => ({ ...t, id: idx + 1 })));
          }
          if (payload.emisorNombre) setEmisorNombre(payload.emisorNombre);
          if (payload.emisorFirma) setEmisorFirma(payload.emisorFirma);
          if (payload.emisorFirmaCierre) setEmisorFirmaCierre(payload.emisorFirmaCierre);
          if (payload.coordinadorNombre) setCoordinadorNombre(payload.coordinadorNombre);
          if (payload.coordinadorFirma) setCoordinadorFirma(payload.coordinadorFirma);
          if (payload.coordinadorFirmaCierre) setCoordinadorFirmaCierre(payload.coordinadorFirmaCierre);
        } else {
          setEmpresa(res.fallback.empresa);
          setArea(res.fallback.area);
          setDesde(res.fallback.fechaInicio || new Date().toISOString().split("T")[0]);
          setHasta(res.fallback.fechaInicio || new Date().toISOString().split("T")[0]);
          setSinDatosPrevios(true);
        }
      } catch (e) {
        console.error("Error al cargar datos previos:", e);
      } finally {
        setCargandoDatos(false);
      }
    }
    cargar();
  }, [cierreId]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const toggleArr = (setter: React.Dispatch<React.SetStateAction<string[]>>, id: string) =>
    setter((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const updateTrabajador = (id: number, field: keyof TrabajadorCaliente, value: string) =>
    setTrabajadores((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));
  const addTrabajador = () => setTrabajadores((prev) => [...prev, nuevoTrabajador()]);
  const removeTrabajador = (id: number) =>
    setTrabajadores((prev) => (prev.length > 1 ? prev.filter((t) => t.id !== id) : prev));

  // ─── Generar PDF ────────────────────────────────────────────────────────────
  const handleGenerar = async () => {
    setErrorMsg("");
    const finalEmpresa = (empresa || "ACTIUM").trim();
    const finalDesde = desde || new Date().toISOString().split("T")[0];

    if (!esModoCierre && (!finalEmpresa || !finalDesde)) {
      setErrorMsg("Indique al menos la empresa y la fecha de inicio del trabajo.");
      return;
    }
    if (!esModoCierre && !emisorFirma) {
      setErrorMsg("Debe registrar la firma del emisor del permiso.");
      return;
    }

    setGenerando(true);
    try {
      const data: PermisoCalientePDFData = {
        empresa: finalEmpresa,
        area: area.trim(),
        proposito: proposito.trim(),
        desde: finalDesde,
        desdeHora,
        hasta: hasta || finalDesde,
        hastaHora,
        permisosAdicionales,
        instruccionesSO,
        chequeo,
        energias,
        equiposBloquear: equiposBloquear.trim(),
        mecanismoBloqueo: mecanismoBloqueo.trim(),
        bloqueadoPor: bloqueadoPor.trim(),
        epp,
        trabajadores: trabajadores.map(({ id: _id, ...rest }) => rest),
        emisorNombre: emisorNombre.trim(),
        emisorFirma,
        emisorFirmaCierre,
        coordinadorNombre: coordinadorNombre.trim(),
        coordinadorFirma,
        coordinadorFirmaCierre,
      };

      const { buildPermisoCalientePDFBlob } = await import("./permiso-caliente-pdf-document");
      const blob = await buildPermisoCalientePDFBlob(data);

      const formData = new FormData();
      formData.append("pdfFile", blob, "permiso-caliente.pdf");
      formData.append("payload", JSON.stringify(data));
      formData.append("tipo", "permiso_caliente");
      if (cierreId) formData.append("cierreId", cierreId);
      if (existingPdfPath) formData.append("existingPdfPath", existingPdfPath);
      if (proyectoId) formData.append("proyectoId", proyectoId);
      formData.append("area", area.trim());
      formData.append("ubicacion", "N/A");
      formData.append("fechaInicio", finalDesde);

      const { guardarPdfYDatosFormularioAction } = await import("@/lib/actions/permisos-sst");
      const res = await guardarPdfYDatosFormularioAction(formData);

      if (res.id) {
        router.push(`/sst/${res.id}`);
        return;
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `permiso-caliente-${(empresa || "actium").replace(/\s+/g, "-").toLowerCase()}-${desde}.pdf`;
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

  // ─── VISTA DEDICADA DE CIERRE ─────────────────────────────────────────────
  if (esModoCierre) {
    return (
      <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl">
        {/* Banner de Modo Cierre */}
        <div className="rounded-xl border border-[#F25C05]/30 bg-[#F25C05]/10 p-5 flex items-start gap-4 shadow-lg shadow-[#F25C05]/5">
          <PenLine className="h-6 w-6 text-[#F25C05] shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-[#F25C05] uppercase tracking-wider">
              Registro de Firmas de Cierre — Permiso en Caliente
            </h3>
            <p className="text-xs text-white/70 mt-1 leading-relaxed">
              Diligencie las firmas de finalización de labores de cada trabajador autorizado y del personal responsable para cerrar formalmente el permiso y regenerar el PDF oficial.
            </p>
          </div>
        </div>

        {sinDatosPrevios && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-white/80 leading-relaxed">
              <strong className="text-amber-400">Nota:</strong> Este permiso fue emitido antes de la integración de firmas digitales duales. Puede verificar los nombres de los trabajadores a continuación y registrar sus firmas de cierre.
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
              <span className="text-[10px] text-white/40 block uppercase font-bold">Área / Lugar</span>
              <span className="text-white font-medium">{area || "—"}</span>
            </div>
            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-[10px] text-white/40 block uppercase font-bold">Fecha Inicio</span>
              <span className="text-white font-medium">{desde ? `${desde} ${desdeHora || ""}` : "—"}</span>
            </div>
            <div className="bg-white/5 p-3 rounded-lg border border-white/5">
              <span className="text-[10px] text-white/40 block uppercase font-bold">Fecha Fin</span>
              <span className="text-white font-medium">{hasta ? `${hasta} ${hastaHora || ""}` : "—"}</span>
            </div>
          </div>
          {proposito && (
            <div className="mt-3 bg-white/5 p-3 rounded-lg border border-white/5 text-xs">
              <span className="text-[10px] text-white/40 block uppercase font-bold mb-1">Propósito de la labor</span>
              <span className="text-white/80">{proposito}</span>
            </div>
          )}
        </div>

        {/* Firmas de Cierre de los Trabajadores */}
        <div className={CARD}>
          <div className="flex items-center justify-between mb-6">
            <h2 className={SECTION_TITLE + " mb-0"}>
              <span className={NUM}>1</span> Firmas de Cierre de Trabajadores Autorizados
            </h2>
            <button
              type="button"
              onClick={addTrabajador}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/10 transition-colors"
            >
              <Plus className="h-3 w-3" /> Agregar Trabajador
            </button>
          </div>
          <div className="space-y-6">
            {trabajadores.map((t, index) => (
              <div key={t.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                  <div>
                    {sinDatosPrevios ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                        <Input
                          value={t.nombre}
                          onChange={(e) => updateTrabajador(t.id, "nombre", e.target.value)}
                          placeholder="Nombre del trabajador"
                          className="h-9 bg-white/5 border-white/10 text-white rounded-lg text-xs"
                        />
                        <Input
                          value={t.cedula}
                          onChange={(e) => updateTrabajador(t.id, "cedula", e.target.value)}
                          placeholder="Cédula"
                          inputMode="numeric"
                          className="h-9 bg-white/5 border-white/10 text-white rounded-lg text-xs"
                        />
                      </div>
                    ) : (
                      <>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                          {t.nombre || `Trabajador ${index + 1}`}
                        </h3>
                        <p className="text-[11px] text-white/40 font-mono">
                          C.C. {t.cedula || "No registrada"}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 w-fit">
                      <Check className="h-3 w-3" /> Firma de Inicio Registrada
                    </span>
                    {trabajadores.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTrabajador(t.id)}
                        className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md"
                        title="Eliminar trabajador"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                <SignaturePad
                  onSave={(firma) => updateTrabajador(t.id, "firmaCierre", firma)}
                  label={`Firma de Cierre (Finalización) de ${t.nombre.trim() || `Trabajador ${index + 1}`}`}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Firmas de Cierre de Emisor y SISO */}
        <div className={CARD}>
          <h2 className={SECTION_TITLE}>
            <span className={NUM}>2</span> Firmas de Cierre de Autorización
          </h2>
          <div className="space-y-6">
            {/* Emisor */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {emisorNombre || "Emisor del Permiso"}
                  </h3>
                  <p className="text-[11px] text-white/40 uppercase tracking-widest">
                    Emisor del Permiso
                  </p>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 w-fit">
                  <Check className="h-3 w-3" /> Firma de Inicio Registrada
                </span>
              </div>
              <SignaturePad
                onSave={setEmisorFirmaCierre}
                label="Firma de Cierre del Emisor (Fin de Labores)"
              />
            </div>

            {/* Coordinador SISO */}
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {coordinadorNombre || "Coordinador SISO"}
                  </h3>
                  <p className="text-[11px] text-white/40 uppercase tracking-widest">
                    Coordinador SISO
                  </p>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 w-fit">
                  <Check className="h-3 w-3" /> Firma de Inicio Registrada
                </span>
              </div>
              <SignaturePad
                onSave={setCoordinadorFirmaCierre}
                label="Firma de Cierre del Coordinador SISO (Fin de Labores)"
              />
            </div>
          </div>

          <p className="mt-4 text-[10px] text-white/30 leading-relaxed italic">
            Estas firmas tienen carácter informativo y NO constituyen firma electrónica certificada según la Ley 527 de 1999.
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
        <h2 className={SECTION_TITLE}>
          <span className={NUM}>1</span> Datos del permiso
        </h2>
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
          <Campo label="Área donde se realiza el trabajo">
            <Input value={area} onChange={(e) => setArea(e.target.value)} className={FIELD} />
          </Campo>
          <Campo label="Propósito del trabajo" full>
            <textarea value={proposito} onChange={(e) => setProposito(e.target.value)} className={TEXTAREA} placeholder="Breve descripción de la tarea y para qué se realiza" />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Desde (fecha)" small>
              <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={FIELD} />
            </Campo>
            <Campo label="Hora" small>
              <Input type="time" value={desdeHora} onChange={(e) => setDesdeHora(e.target.value)} className={FIELD} />
            </Campo>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Hasta (fecha)" small>
              <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={FIELD} />
            </Campo>
            <Campo label="Hora" small>
              <Input type="time" value={hastaHora} onChange={(e) => setHastaHora(e.target.value)} className={FIELD} />
            </Campo>
          </div>
        </div>
      </div>

      {/* 2. Permisos adicionales */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE}>
          <span className={NUM}>2</span> Permisos adicionales requeridos
        </h2>
        <div className="space-y-3">
          {PERMISOS_ADICIONALES.map((p) => {
            const isSi = permisosAdicionales[p.id] === "si";
            return (
              <div key={p.id} className="flex flex-col gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-xs text-white/80">{p.label}</p>
                  <div className="flex gap-2 shrink-0">
                    {RESPUESTA_SINO.map((r) => {
                      const active = permisosAdicionales[p.id] === r;
                      return (
                        <button key={r} type="button"
                          onClick={() => setPermisosAdicionales((prev) => ({ ...prev, [p.id]: r }))}
                          className={`min-w-[56px] min-h-[40px] px-3 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${
                            active
                              ? r === "si" ? "border-emerald-500 bg-emerald-500/15 text-emerald-400" : "border-red-500 bg-red-500/15 text-red-400"
                              : "border-white/10 bg-white/[0.02] text-white/40 hover:bg-white/5"
                          }`}>
                          {r === "si" ? "Sí" : "No"}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {isSi && (
                  <div className="mt-2 border-t border-white/5 pt-3">
                    <Campo label="Instrucciones SO" small>
                      <Input 
                        value={instruccionesSO[p.id] || ""} 
                        onChange={(e) => setInstruccionesSO(prev => ({ ...prev, [p.id]: e.target.value }))} 
                        className="h-10 bg-white/5 border-white/10 text-white rounded-lg text-xs placeholder:text-white/20" 
                        placeholder="Especifique las instrucciones de seguridad operativa..."
                      />
                    </Campo>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Lista de chequeo por secciones */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE}>
          <span className={NUM}>3</span> Lista de verificación
        </h2>
        <div className="space-y-8">
          {CHEQUEO_CALIENTE.map((sec) => (
            <div key={sec.id}>
              <p className="text-xs font-bold text-white uppercase tracking-widest mb-3 pb-2 border-b border-white/5">
                {sec.titulo}
              </p>
              <div className="space-y-2">
                {sec.items.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-white/80 leading-snug">{item.texto}</p>
                    <div className="flex gap-2 shrink-0">
                      {RESPUESTA_CHEQUEO.map((r) => {
                        const active = chequeo[item.id] === r;
                        const color = r === "si" ? "emerald" : r === "no" ? "red" : "white";
                        return (
                          <button key={r} type="button"
                            onClick={() => setChequeo((prev) => ({ ...prev, [item.id]: r }))}
                            className={`min-w-[44px] min-h-[40px] px-3 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all ${
                              active
                                ? color === "emerald" ? "border-emerald-500 bg-emerald-500/15 text-emerald-400"
                                : color === "red" ? "border-red-500 bg-red-500/15 text-red-400"
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
          ))}
        </div>
      </div>

      {/* 4. Bloqueo de energías */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE}>
          <span className={NUM}>4</span> Bloqueo de energías peligrosas
        </h2>
        <ChecksGroup
          titulo="Energías a bloquear"
          opciones={ENERGIAS_PELIGROSAS}
          seleccionados={energias}
          onToggle={(id) => toggleArr(setEnergias, id)}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          <Campo label="Equipos que deben ser bloqueados" full>
            <Input value={equiposBloquear} onChange={(e) => setEquiposBloquear(e.target.value)} className={FIELD} />
          </Campo>
          <Campo label="Mecanismo utilizado para el bloqueo">
            <Input value={mecanismoBloqueo} onChange={(e) => setMecanismoBloqueo(e.target.value)} className={FIELD} />
          </Campo>
          <Campo label="Bloqueado por">
            <Input value={bloqueadoPor} onChange={(e) => setBloqueadoPor(e.target.value)} className={FIELD} />
          </Campo>
        </div>
      </div>

      {/* 5. EPP */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE}>
          <span className={NUM}>5</span> Elementos de protección personal
        </h2>
        <ChecksGroup
          titulo="EPP requeridos para la labor"
          opciones={EPP_CALIENTE}
          seleccionados={epp}
          onToggle={(id) => toggleArr(setEpp, id)}
        />
      </div>

      {/* 6. Trabajadores */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={SECTION_TITLE + " mb-0"}>
            <span className={NUM}>6</span> Trabajadores autorizados
          </h2>
          <button type="button" onClick={addTrabajador} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/10 transition-colors">
            <Plus className="h-3 w-3" /> Agregar
          </button>
        </div>
        <div className="space-y-4">
          {trabajadores.map((t, index) => (
            <div key={t.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Trabajador {index + 1}
                </span>
                {trabajadores.length > 1 && (
                  <button type="button" onClick={() => removeTrabajador(t.id)} className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:bg-red-400/10 px-2 py-1 rounded-md transition-colors" aria-label="Eliminar trabajador">
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Campo label="Nombre completo" small>
                  <Input value={t.nombre} onChange={(e) => updateTrabajador(t.id, "nombre", e.target.value)} className="h-11 bg-white/5 border-white/10 text-white rounded-lg" placeholder="Nombre completo" />
                </Campo>
                <Campo label="Cédula" small>
                  <Input value={t.cedula} onChange={(e) => updateTrabajador(t.id, "cedula", e.target.value)} inputMode="numeric" className="h-11 bg-white/5 border-white/10 text-white rounded-lg" placeholder="Número de identificación" />
                </Campo>
              </div>
              <div className="pt-2 border-t border-white/5">
                <SignaturePad
                  onSave={(firma) => updateTrabajador(t.id, "firma", firma)}
                  label={`Firma de ${t.nombre.trim() || `Trabajador ${index + 1}`}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Firmas */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE}>
          <span className={NUM}>7</span> Firmas
        </h2>
        <div className="space-y-8">
          <div>
            <Campo label="Nombre del emisor del permiso">
              <Input value={emisorNombre} onChange={(e) => setEmisorNombre(e.target.value)} className={FIELD + " mb-4"} />
            </Campo>
            <SignaturePad onSave={setEmisorFirma} label="Firma del emisor" />
          </div>
          <div>
            <Campo label="Nombre del coordinador SISO">
              <Input value={coordinadorNombre} onChange={(e) => setCoordinadorNombre(e.target.value)} className={FIELD + " mb-4"} />
            </Campo>
            <SignaturePad onSave={setCoordinadorFirma} label="Firma del coordinador SISO" />
          </div>
        </div>

        <p className="mt-3 text-[10px] text-white/30 leading-relaxed italic">
          Estas firmas tienen carácter informativo y NO constituyen firma electrónica certificada según la Ley 527 de 1999.
        </p>

        {errorMsg && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
            {errorMsg}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
          <button type="button" onClick={handleGenerar} disabled={generando}
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
