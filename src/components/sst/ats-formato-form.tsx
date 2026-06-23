"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Download, Check } from "lucide-react";
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

const CARD = "rounded-actium border border-white/5 bg-[#1A1A1A] p-5 sm:p-6 shadow-2xl";
const SECTION_TITLE = "flex items-center gap-2 text-sm font-semibold tracking-widest text-actium-orange uppercase mb-6";
const NUM = "flex h-6 w-6 items-center justify-center rounded-full bg-actium-orange/10 text-xs";
const LABEL = "text-[10px] font-semibold text-white/40 uppercase tracking-widest";
const FIELD = "h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20";
const TEXTAREA = "w-full min-h-[80px] bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm placeholder:text-white/20 focus:border-actium-orange focus:outline-none focus:ring-2 focus:ring-actium-orange/20 transition-all";

type EjecutorState = EjecutorAts & { id: number };
type PasoState = PasoAts & { id: number };
let ejSeq = 1;
let pasoSeq = 1;
const nuevoEjecutor = (): EjecutorState => ({ id: ejSeq++, cedula: "", nombre: "" });
const nuevoPaso = (): PasoState => ({ id: pasoSeq++, paso: "", peligros: "", consecuencias: "", controles: "" });

export function AtsFormatoForm({ proyectos = [] }: { proyectos?: { id: string; nombre: string }[] }) {
  const router = useRouter();
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

  const [generando, setGenerando] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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

  // ─── Generar PDF ────────────────────────────────────────────────────────────
  const handleGenerar = async () => {
    setErrorMsg("");
    if (!empresa.trim() || !fecha) {
      setErrorMsg("Indique al menos la empresa y la fecha de realización del trabajo.");
      return;
    }
    if (!firmaData) {
      setErrorMsg("Debe registrar la firma de quien autoriza el análisis.");
      return;
    }

    setGenerando(true);
    try {
      const data: AtsFormatoPDFData = {
        empresa: empresa.trim(),
        ciudad: ciudad.trim(),
        areaProceso: areaProceso.trim(),
        ubicacion: ubicacion.trim(),
        lugarTrabajo: lugarTrabajo.trim(),
        fecha,
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
      };

      const { buildAtsFormatoPDFBlob } = await import("./ats-formato-pdf-document");
      const blob = await buildAtsFormatoPDFBlob(data);
      
      // Subir el PDF generado a Supabase Storage
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const tempId = crypto.randomUUID();
      const ext = "pdf";
      // Asumimos un tenant genérico si no hay proyecto configurado
      const storagePath = `temp-empresa/temp-subempresa/${tempId}/${crypto.randomUUID()}.${ext}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("pdfs-formularios")
        .upload(storagePath, blob, { contentType: "application/pdf" });
        
      if (uploadError) throw new Error("No fue posible subir el archivo a Supabase Storage: " + uploadError.message);
      
      // Guardar en la base de datos si hay un proyecto seleccionado
      if (proyectoId) {
        const { guardarPdfAtsAction } = await import("@/lib/actions/permisos-sst");
        const { id: formId } = await guardarPdfAtsAction({
          proyectoId,
          ubicacion: ubicacion.trim() || "N/A",
          area: areaProceso.trim(),
          fechaInicio: fecha,
          pdfPath: storagePath
        });
        
        router.push(`/sst/${formId}`);
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

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl">
      {/* 1. Datos básicos */}
      <div className={CARD}>
        <h2 className={SECTION_TITLE}>
          <span className={NUM}>1</span> Datos básicos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {proyectos.length > 0 && (
            <Campo label="Proyecto Asociado">
              <select
                value={proyectoId}
                onChange={(e) => setProyectoId(e.target.value)}
                className={FIELD + " px-3"}
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
          <Campo label="Lugar de trabajo">
            <Input value={lugarTrabajo} onChange={(e) => setLugarTrabajo(e.target.value)} className={FIELD} />
          </Campo>
          <Campo label="Ubicación donde se realiza el trabajo" full>
            <Input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} className={FIELD} />
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
        <div className="space-y-3">
          {ejecutores.map((ej, index) => (
            <div key={ej.id} className="flex items-end gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Campo label="Cédula" small>
                  <Input value={ej.cedula} onChange={(e) => updateEjecutor(ej.id, "cedula", e.target.value)} inputMode="numeric" className="h-11 bg-white/5 border-white/10 text-white rounded-lg" />
                </Campo>
                <Campo label={`Trabajador ${index + 1}`} small>
                  <Input value={ej.nombre} onChange={(e) => updateEjecutor(ej.id, "nombre", e.target.value)} className="h-11 bg-white/5 border-white/10 text-white rounded-lg" placeholder="Nombres y apellidos" />
                </Campo>
              </div>
              {ejecutores.length > 1 && (
                <button type="button" onClick={() => removeEjecutor(ej.id)} className="p-2.5 text-red-400 hover:bg-red-400/10 rounded-md shrink-0" aria-label="Eliminar ejecutor">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
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

        <SignaturePad onSave={setFirmaData} label="Firma de quien autoriza el análisis" />

        <p className="mt-3 text-[10px] text-white/30 leading-relaxed italic">
          Esta firma tiene carácter informativo y NO constituye firma electrónica certificada según la Ley 527 de 1999.
        </p>

        {errorMsg && (
          <div className="mt-6 p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm font-medium text-center">
            {errorMsg}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
          <button type="button" onClick={handleGenerar} disabled={generando}
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
