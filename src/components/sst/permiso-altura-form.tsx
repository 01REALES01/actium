"use client";

import React, { useState } from "react";
import { Plus, Trash2, Loader2, Download, Check } from "lucide-react";
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

// ─── Estilos compartidos ──────────────────────────────────────────────────────
const CARD = "rounded-xl border border-white/5 bg-[#1A1A1A] p-5 sm:p-6 shadow-2xl";
const SECTION_TITLE = "flex items-center gap-2 text-sm font-bold tracking-widest text-[#F25C05] uppercase mb-6";
const NUM = "flex h-6 w-6 items-center justify-center rounded-full bg-[#F25C05]/10 text-xs";
const LABEL = "text-[10px] font-bold text-white/40 uppercase tracking-widest";
const FIELD = "h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20";
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
});

export function PermisoAlturaForm({ empresaInicial = "" }: { empresaInicial?: string }) {
  // 1. Datos básicos
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

  const [generando, setGenerando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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

  // ─── Generar PDF ────────────────────────────────────────────────────────────
  const handleGenerar = async () => {
    setErrorMsg("");
    if (!empresa.trim() || !fecha) {
      setErrorMsg("Indique al menos la empresa y la fecha de realización del trabajo.");
      return;
    }
    if (!firmaData) {
      setErrorMsg("Debe registrar la firma de quien autoriza el permiso.");
      return;
    }

    setGenerando(true);
    try {
      const data: PermisoAlturaPDFData = {
        empresa: empresa.trim(),
        ciudad: ciudad.trim(),
        lugarTrabajo: lugarTrabajo.trim(),
        areaProceso: areaProceso.trim(),
        ubicacion: ubicacion.trim(),
        vigencia: vigencia.trim(),
        fecha,
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
      };

      const { buildPermisoAlturaPDFBlob } = await import("./permiso-altura-pdf-document");
      const blob = await buildPermisoAlturaPDFBlob(data);
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

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl">
      {/* 1. Datos básicos */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE}>
          <span className={NUM}>1</span> Datos básicos del permiso
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Campo label="Empresa">
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
        <div className="mt-3">
          <Campo label="Otros sistemas de acceso (¿cuáles?)" full>
            <Input value={sistemasAccesoOtros} onChange={(e) => setSistemasAccesoOtros(e.target.value)} className={FIELD} />
          </Campo>
        </div>

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
          <div className="mt-3">
            <Campo label="Otras (¿cuáles?)" full>
              <Input value={otrasTarCuales} onChange={(e) => setOtrasTarCuales(e.target.value)} className={FIELD} />
            </Campo>
          </div>
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
          <div className="mt-3">
            <Campo label="Otros EPP (¿cuáles?)" full>
              <Input value={eppOtros} onChange={(e) => setEppOtros(e.target.value)} className={FIELD} />
            </Campo>
          </div>
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

        <SignaturePad onSave={setFirmaData} label="Firma de quien autoriza el permiso" />

        <p className="mt-3 text-[10px] text-white/30 leading-relaxed italic">
          Esta firma tiene carácter informativo y NO constituye firma electrónica certificada según la Ley 527 de 1999.
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
