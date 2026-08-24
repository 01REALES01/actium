"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Trash2,
  Loader2,
  Download,
  History,
  Save,
  HardHat,
  ChevronDown,
  CheckCircle2,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { SignaturePad } from "./signature-pad";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ELEMENTOS_EPP,
  CONSTANCIA_TRABAJADOR_EPP,
  estadoInicialEpp,
  elementoAdicionalVacio,
  filasIncompletas,
  contarEntregados,
  type EstadoElementoEpp,
  type ElementoAdicionalEpp,
} from "@/constants/entrega-epp";
import type { EntregaEppPDFData } from "./entrega-epp-pdf-document";
import { listarFaltantes } from "@/lib/sst/faltantes";
import { hoyLocal } from "@/lib/fecha";

const CARD = "rounded-xl border border-white/5 bg-[#1A1A1A] p-5 sm:p-6 shadow-2xl";
const SECTION_TITLE_INLINE = "flex items-center gap-2 text-sm font-bold tracking-widest text-[#F25C05] uppercase";
const NUM = "flex h-6 w-6 items-center justify-center rounded-full bg-[#F25C05]/10 text-xs";
const LABEL = "text-[10px] font-bold text-white/40 uppercase tracking-widest";
const FIELD = "h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20 [&>option]:bg-[#1A1A1A] [&>option]:text-white";
const TEXTAREA = "w-full min-h-[72px] bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 text-sm placeholder:text-white/20 focus:border-[#F25C05] focus:outline-none focus:ring-2 focus:ring-[#F25C05]/20 transition-all";

export type EmpleadoOptEpp = {
  id: string;
  nombre: string;
  cedula: string;
  cargo: string | null;
  proyectoIds: string[];
};

let adicionalSeq = 0;

type FilaEppEstado = {
  elementos: Record<string, EstadoElementoEpp>;
  adicionales: ElementoAdicionalEpp[];
  observaciones: string;
  cedula: string;
  cargo: string;
  firma: string;
  borradorId: string | null;
  existingPdfPath: string | null;
  formularioId: string | null;
  pdfBlob: Blob | null;
  estado: "pendiente" | "completado";
  expandido: boolean;
  guardando: boolean;
  generando: boolean;
  errorMsg: string;
  avisoMsg: string;
};

function filaVacia(empleado: EmpleadoOptEpp): FilaEppEstado {
  return {
    elementos: estadoInicialEpp(),
    adicionales: [],
    observaciones: "",
    cedula: empleado.cedula || "",
    cargo: empleado.cargo || "",
    firma: "",
    borradorId: null,
    existingPdfPath: null,
    formularioId: null,
    pdfBlob: null,
    estado: "pendiente",
    expandido: false,
    guardando: false,
    generando: false,
    errorMsg: "",
    avisoMsg: "",
  };
}

export function EntregaEppForm({
  proyectos = [],
  empleados = [],
}: {
  proyectos?: { id: string; nombre: string }[];
  empleados?: EmpleadoOptEpp[];
}) {
  const searchParams = useSearchParams();
  const borradorParam = searchParams.get("borradorId");
  const proyectoParam = searchParams.get("proyectoId");

  const [cargandoDatos, setCargandoDatos] = useState(Boolean(borradorParam));
  const [rellenando, setRellenando] = useState(false);
  const [avisoMsg, setAvisoMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Datos de la entrega — compartidos por todos los cargos de esta sesión.
  const [proyectoId, setProyectoId] = useState(proyectoParam || "");
  const [area, setArea] = useState("");
  const [fecha, setFecha] = useState(hoyLocal());

  const [filas, setFilas] = useState<Record<string, FilaEppEstado>>({});

  const hoy = hoyLocal();
  const obra = proyectos.find((p) => p.id === proyectoId)?.nombre || "";

  const trabajadoresDisponibles = useMemo(
    () => (proyectoId ? empleados.filter((e) => e.proyectoIds.includes(proyectoId)) : []),
    [proyectoId, empleados],
  );

  const completados = trabajadoresDisponibles.filter((e) => filas[e.id]?.estado === "completado").length;

  // Un borrador retomado (?borradorId=) llega antes de que el roster del
  // proyecto esté listo: se guarda aquí hasta que la fila del trabajador exista.
  const pendingBorradorRef = useRef<{
    empleadoId: string;
    payload: EntregaEppPDFData;
    borradorId: string;
    existingPdfPath: string | null;
  } | null>(null);

  // Retomar un borrador guardado.
  useEffect(() => {
    if (!borradorParam) return;
    setCargandoDatos(true);
    (async () => {
      try {
        const { obtenerDatosCierreAction } = await import("@/lib/actions/permisos-sst");
        const res = await obtenerDatosCierreAction(borradorParam);
        const payload = (res.payload as EntregaEppPDFData | null) ?? null;

        if (payload) {
          setArea(payload.area || res.fallback?.area || "");
          setFecha(payload.fecha || res.fallback?.fechaInicio || hoyLocal());
          if (payload.empleadoId) {
            pendingBorradorRef.current = {
              empleadoId: payload.empleadoId,
              payload,
              borradorId: borradorParam,
              existingPdfPath: res.pdfPath || null,
            };
          }
        } else if (res.fallback) {
          setArea(res.fallback.area || "");
          setFecha(res.fallback.fechaInicio || hoyLocal());
        }
        if (res.proyectoId) setProyectoId(res.proyectoId);
      } catch (e) {
        console.error("Error al cargar el borrador de entrega de EPP:", e);
      } finally {
        setCargandoDatos(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [borradorParam]);

  // Construye el roster de filas cuando cambia el proyecto, y aplica el
  // borrador pendiente (si lo hay) sobre la fila del trabajador que le
  // corresponde.
  useEffect(() => {
    const base: Record<string, FilaEppEstado> = {};
    for (const empleado of trabajadoresDisponibles) {
      base[empleado.id] = filaVacia(empleado);
    }

    const pending = pendingBorradorRef.current;
    if (pending && base[pending.empleadoId]) {
      const empleado = trabajadoresDisponibles.find((e) => e.id === pending.empleadoId)!;
      const elementosBase = estadoInicialEpp();
      for (const el of ELEMENTOS_EPP) {
        const guardado = pending.payload.elementos?.[el.id];
        if (guardado) elementosBase[el.id] = { ...guardado };
      }
      base[pending.empleadoId] = {
        ...filaVacia(empleado),
        elementos: elementosBase,
        adicionales: (pending.payload.adicionales ?? []).map((a) => ({ ...a, id: ++adicionalSeq })),
        observaciones: pending.payload.observaciones || "",
        cedula: pending.payload.trabajadorCedula || empleado.cedula || "",
        cargo: pending.payload.trabajadorCargo || empleado.cargo || "",
        firma: pending.payload.trabajadorFirma || "",
        borradorId: pending.borradorId,
        existingPdfPath: pending.existingPdfPath,
        expandido: true,
      };
      pendingBorradorRef.current = null;
    }

    setFilas(base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectoId, trabajadoresDisponibles]);

  const setFilaState = (empleadoId: string, cambio: Partial<FilaEppEstado>) =>
    setFilas((prev) => (prev[empleadoId] ? { ...prev, [empleadoId]: { ...prev[empleadoId], ...cambio } } : prev));

  // ─── Rellenar con el último ─────────────────────────────────────────────────
  // Aplica los elementos del último cargo de esta obra a todos los trabajadores
  // aún pendientes; no toca a quienes ya quedaron completados.

  const handleRellenarUltimo = async () => {
    setErrorMsg("");
    setAvisoMsg("");
    setRellenando(true);
    try {
      const { obtenerUltimoFormularioAction } = await import("@/lib/actions/permisos-sst");
      const res = await obtenerUltimoFormularioAction("entrega_epp", proyectoId || undefined);

      if (!res.encontrado || !res.payload) {
        setErrorMsg("Aún no hay un cargo de entrega de EPP anterior para copiar.");
        return;
      }

      const payload = res.payload as EntregaEppPDFData;
      const elementosBase = estadoInicialEpp();
      for (const el of ELEMENTOS_EPP) {
        const guardado = payload.elementos?.[el.id];
        if (guardado) elementosBase[el.id] = { ...guardado };
      }

      setFilas((prev) => {
        const next = { ...prev };
        for (const id of Object.keys(next)) {
          if (next[id].estado === "completado") continue;
          next[id] = {
            ...next[id],
            elementos: Object.fromEntries(Object.entries(elementosBase).map(([k, v]) => [k, { ...v }])),
            adicionales: (payload.adicionales ?? []).map((a) => ({ ...a, id: ++adicionalSeq })),
          };
        }
        return next;
      });

      const ref = res.referencia;
      setAvisoMsg(
        `Se copiaron los elementos a los trabajadores pendientes, tomados del cargo del ${ref?.fecha || "último registro"}${
          ref?.proyecto ? ` — ${ref.proyecto}` : ""
        }. Cada trabajador y su firma se diligencian individualmente.`,
      );
    } catch (err: any) {
      setErrorMsg(err?.message || "No fue posible recuperar el último cargo.");
    } finally {
      setRellenando(false);
    }
  };

  // ─── Payload de una fila ────────────────────────────────────────────────────

  const construirPayloadFila = (empleado: EmpleadoOptEpp, fila: FilaEppEstado): EntregaEppPDFData => ({
    empresa: "ACTIUM",
    obra,
    area: area.trim(),
    fecha: fecha || hoyLocal(),
    empleadoId: empleado.id,
    trabajadorNombre: empleado.nombre,
    trabajadorCedula: fila.cedula.trim(),
    trabajadorCargo: fila.cargo.trim(),
    elementos: fila.elementos,
    adicionales: fila.adicionales,
    observaciones: fila.observaciones.trim(),
    trabajadorFirma: fila.firma,
  });

  // ─── Guardar borrador de una fila ───────────────────────────────────────────

  const handleGuardarBorradorFila = async (empleado: EmpleadoOptEpp) => {
    const fila = filas[empleado.id];
    if (!fila || !proyectoId) return;
    setFilaState(empleado.id, { guardando: true, errorMsg: "", avisoMsg: "" });
    try {
      const data = construirPayloadFila(empleado, fila);
      const formData = new FormData();
      formData.append("payload", JSON.stringify(data));
      formData.append("tipo", "entrega_epp");
      formData.append("proyectoId", proyectoId);
      if (fila.borradorId) formData.append("borradorId", fila.borradorId);
      if (fila.existingPdfPath) formData.append("existingPdfPath", fila.existingPdfPath);
      formData.append("area", data.area || `Entrega EPP · ${data.trabajadorNombre}`);
      formData.append("ubicacion", data.area || "N/A");
      formData.append("fechaInicio", data.fecha);

      const { guardarBorradorAction } = await import("@/lib/actions/permisos-sst");
      const res = await guardarBorradorAction(formData);

      const pendientes: string[] = [];
      if (contarEntregados(fila.elementos, fila.adicionales) === 0) pendientes.push("al menos un elemento entregado");
      const incompletas = filasIncompletas(fila.elementos, fila.adicionales);
      if (incompletas.length > 0) pendientes.push(`cantidad o fecha de recepción de: ${incompletas.join(", ")}`);
      if (!fila.firma) pendientes.push("firma del trabajador");

      setFilaState(empleado.id, {
        guardando: false,
        borradorId: res.id,
        existingPdfPath: res.pdfPath,
        avisoMsg:
          pendientes.length === 0
            ? "Borrador guardado. Puede emitirlo cuando lo requiera."
            : `Borrador guardado. Queda pendiente: ${listarFaltantes(pendientes)}.`,
      });
    } catch (err: any) {
      setFilaState(empleado.id, {
        guardando: false,
        errorMsg: err?.message || "No fue posible guardar el borrador. Intenta de nuevo.",
      });
    }
  };

  // ─── Generar PDF de una fila ─────────────────────────────────────────────────

  const handleGenerarFila = async (empleado: EmpleadoOptEpp) => {
    const fila = filas[empleado.id];
    if (!fila) return;

    const faltan: string[] = [];
    if (!proyectoId) faltan.push("proyecto asociado");
    if (!fecha) faltan.push("fecha de entrega");
    if (contarEntregados(fila.elementos, fila.adicionales) === 0) faltan.push("al menos un elemento entregado");
    const incompletas = filasIncompletas(fila.elementos, fila.adicionales);
    if (incompletas.length > 0) faltan.push(`cantidad o fecha de recepción de: ${incompletas.join(", ")}`);
    if (!fila.firma) faltan.push("firma del trabajador");

    if (faltan.length > 0) {
      setFilaState(empleado.id, {
        errorMsg: `No fue posible emitir el cargo. Falta diligenciar: ${listarFaltantes(faltan)}.`,
        avisoMsg: "",
      });
      return;
    }

    setFilaState(empleado.id, { generando: true, errorMsg: "", avisoMsg: "" });
    try {
      const data = construirPayloadFila(empleado, fila);

      const { buildEntregaEppPDFBlob } = await import("./entrega-epp-pdf-document");
      const blob = await buildEntregaEppPDFBlob(data);

      const formData = new FormData();
      formData.append("pdfFile", blob, `cargo-entrega-epp-${empleado.nombre}.pdf`);
      formData.append("payload", JSON.stringify(data));
      formData.append("tipo", "entrega_epp");
      if (fila.borradorId) formData.append("formularioId", fila.borradorId);
      if (fila.existingPdfPath) formData.append("existingPdfPath", fila.existingPdfPath);
      formData.append("proyectoId", proyectoId);
      formData.append("area", data.area || `Entrega EPP · ${data.trabajadorNombre}`);
      formData.append("ubicacion", data.area || "N/A");
      formData.append("fechaInicio", data.fecha);

      const { guardarPdfYDatosFormularioAction } = await import("@/lib/actions/permisos-sst");
      const res = await guardarPdfYDatosFormularioAction(formData);

      setFilaState(empleado.id, {
        generando: false,
        estado: "completado",
        formularioId: res.id || null,
        borradorId: res.id || fila.borradorId,
        existingPdfPath: res.pdfPath || fila.existingPdfPath,
        pdfBlob: blob,
        errorMsg: "",
        avisoMsg: "Cargo generado correctamente.",
      });
    } catch (err: any) {
      setFilaState(empleado.id, {
        generando: false,
        errorMsg: err?.message || "No fue posible generar el PDF. Intenta de nuevo.",
      });
    }
  };

  const descargarFila = (empleado: EmpleadoOptEpp, fila: FilaEppEstado) => {
    if (!fila.pdfBlob) return;
    const url = URL.createObjectURL(fila.pdfBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `entrega-epp-${empleado.nombre.replace(/\s+/g, "-").toLowerCase()}-${fecha}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (cargandoDatos) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#F25C05]" />
        <p className="text-xs font-bold text-white/50 uppercase tracking-widest">Cargando el cargo...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl">
      {/* 1. Datos de la entrega */}
      <div className={CARD}>
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className={SECTION_TITLE_INLINE}>
            <span className={NUM}>1</span> Datos de la entrega
          </h2>
          <button
            type="button"
            onClick={handleRellenarUltimo}
            disabled={rellenando || !proyectoId}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#F25C05]/40 bg-[#F25C05]/10 px-4 text-[10px] font-bold uppercase tracking-widest text-[#F25C05] transition-all hover:bg-[#F25C05]/20 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
          >
            {rellenando ? <Loader2 className="h-4 w-4 animate-spin" /> : <History className="h-4 w-4" />}
            Rellenar con el último
          </button>
        </div>
        <p className="mb-5 text-[10px] leading-relaxed text-white/30">
          Copia los elementos del último cargo de esta obra a los trabajadores pendientes. El trabajador y
          la firma siempre quedan en blanco: cada cargo se firma de manera individual.
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
          <CampoForm label="Área">
            <Input value={area} onChange={(e) => setArea(e.target.value)} className={FIELD} />
          </CampoForm>
          <CampoForm label="Fecha de entrega">
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={FIELD} />
          </CampoForm>
        </div>

        {errorMsg && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium leading-relaxed">
            {errorMsg}
          </div>
        )}
        {avisoMsg && (
          <div className="mt-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-sm font-medium leading-relaxed">
            {avisoMsg}
          </div>
        )}
      </div>

      {/* 2. Trabajadores */}
      <div className={CARD}>
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className={SECTION_TITLE_INLINE}>
            <span className={NUM}>2</span> Trabajadores
          </h2>
          {trabajadoresDisponibles.length > 0 && (
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
              {completados} de {trabajadoresDisponibles.length} completados
            </span>
          )}
        </div>

        {!proyectoId ? (
          <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-xs text-white/40">
            Seleccione un proyecto para ver los trabajadores asignados.
          </p>
        ) : trabajadoresDisponibles.length === 0 ? (
          <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4 text-xs text-white/40">
            Este proyecto aún no tiene trabajadores asignados. Asígnelos desde Personal.
          </p>
        ) : (
          <div className="space-y-3">
            {trabajadoresDisponibles.map((empleado, i) => {
              const fila = filas[empleado.id];
              if (!fila) return null;
              return (
                <FilaTrabajadorEpp
                  key={empleado.id}
                  numero={i + 1}
                  empleado={empleado}
                  fila={fila}
                  fecha={fecha}
                  hoy={hoy}
                  onToggleExpand={() => setFilaState(empleado.id, { expandido: !fila.expandido })}
                  onToggleElemento={(elId) =>
                    setFilas((prev) => {
                      const f = prev[empleado.id];
                      if (!f) return prev;
                      const actual = f.elementos[elId];
                      const entregado = !actual.entregado;
                      return {
                        ...prev,
                        [empleado.id]: {
                          ...f,
                          elementos: {
                            ...f.elementos,
                            [elId]: {
                              entregado,
                              cantidad: entregado && !actual.cantidad ? "1" : actual.cantidad,
                              fechaRecepcion: entregado && !actual.fechaRecepcion ? fecha || hoy : actual.fechaRecepcion,
                            },
                          },
                        },
                      };
                    })
                  }
                  onActualizarElemento={(elId, campo, valor) =>
                    setFilas((prev) => {
                      const f = prev[empleado.id];
                      if (!f) return prev;
                      return {
                        ...prev,
                        [empleado.id]: { ...f, elementos: { ...f.elementos, [elId]: { ...f.elementos[elId], [campo]: valor } } },
                      };
                    })
                  }
                  onAgregarAdicional={() =>
                    setFilas((prev) => {
                      const f = prev[empleado.id];
                      if (!f) return prev;
                      return { ...prev, [empleado.id]: { ...f, adicionales: [...f.adicionales, elementoAdicionalVacio(++adicionalSeq)] } };
                    })
                  }
                  onEliminarAdicional={(adId) =>
                    setFilas((prev) => {
                      const f = prev[empleado.id];
                      if (!f) return prev;
                      return { ...prev, [empleado.id]: { ...f, adicionales: f.adicionales.filter((a) => a.id !== adId) } };
                    })
                  }
                  onActualizarAdicional={(adId, cambio) =>
                    setFilas((prev) => {
                      const f = prev[empleado.id];
                      if (!f) return prev;
                      return {
                        ...prev,
                        [empleado.id]: { ...f, adicionales: f.adicionales.map((a) => (a.id === adId ? { ...a, ...cambio } : a)) },
                      };
                    })
                  }
                  onCedula={(v) => setFilaState(empleado.id, { cedula: v })}
                  onCargo={(v) => setFilaState(empleado.id, { cargo: v })}
                  onObservaciones={(v) => setFilaState(empleado.id, { observaciones: v })}
                  onFirma={(v) => setFilaState(empleado.id, { firma: v })}
                  onGuardarBorrador={() => handleGuardarBorradorFila(empleado)}
                  onGenerar={() => handleGenerarFila(empleado)}
                  onDescargar={() => descargarFila(empleado, fila)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Fila de un trabajador ────────────────────────────────────────────────────

function FilaTrabajadorEpp({
  numero,
  empleado,
  fila,
  fecha,
  hoy,
  onToggleExpand,
  onToggleElemento,
  onActualizarElemento,
  onAgregarAdicional,
  onEliminarAdicional,
  onActualizarAdicional,
  onCedula,
  onCargo,
  onObservaciones,
  onFirma,
  onGuardarBorrador,
  onGenerar,
  onDescargar,
}: {
  numero: number;
  empleado: EmpleadoOptEpp;
  fila: FilaEppEstado;
  fecha: string;
  hoy: string;
  onToggleExpand: () => void;
  onToggleElemento: (elId: string) => void;
  onActualizarElemento: (elId: string, campo: "cantidad" | "fechaRecepcion", valor: string) => void;
  onAgregarAdicional: () => void;
  onEliminarAdicional: (adId: number) => void;
  onActualizarAdicional: (adId: number, cambio: Partial<ElementoAdicionalEpp>) => void;
  onCedula: (v: string) => void;
  onCargo: (v: string) => void;
  onObservaciones: (v: string) => void;
  onFirma: (v: string) => void;
  onGuardarBorrador: () => void;
  onGenerar: () => void;
  onDescargar: () => void;
}) {
  const entregados = contarEntregados(fila.elementos, fila.adicionales);
  const completado = fila.estado === "completado";

  return (
    <div
      className={`rounded-xl border transition-colors ${
        completado ? "border-emerald-500/25 bg-emerald-500/[0.03]" : "border-white/5 bg-white/[0.02]"
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
            <p className="truncate text-sm font-bold text-white">{empleado.nombre}</p>
            <p className="truncate text-[10px] uppercase tracking-widest text-white/30">
              {fila.cargo || "Sin cargo"} · {entregados} elemento{entregados === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
              completado
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                : "border-white/10 bg-white/5 text-white/40"
            }`}
          >
            {completado && <CheckCircle2 className="h-3 w-3" />}
            {completado ? "Completado" : "Pendiente"}
          </span>
          <ChevronDown className={`h-4 w-4 text-white/40 transition-transform ${fila.expandido ? "rotate-180" : ""}`} />
        </div>
      </button>

      {fila.expandido && (
        <div className="border-t border-white/5 p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
            <CampoForm label="Cédula">
              <Input value={fila.cedula} onChange={(e) => onCedula(e.target.value)} inputMode="numeric" className={FIELD} />
            </CampoForm>
            <CampoForm label="Cargo">
              <Input value={fila.cargo} onChange={(e) => onCargo(e.target.value)} className={FIELD} />
            </CampoForm>
          </div>

          <p className={LABEL + " mb-3"}>Elementos entregados</p>
          <div className="space-y-2">
            {ELEMENTOS_EPP.map((el) => {
              const estado = fila.elementos[el.id];
              return (
                <div
                  key={el.id}
                  className={`flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between ${
                    estado.entregado ? "border-[#F25C05]/30 bg-[#F25C05]/[0.04]" : "border-white/5 bg-white/[0.02]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggleElemento(el.id)}
                    className="flex min-h-[44px] flex-1 items-center gap-3 text-left"
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded border ${
                        estado.entregado ? "border-[#F25C05] bg-[#F25C05]" : "border-white/20"
                      }`}
                    >
                      {estado.entregado && <HardHat className="h-3.5 w-3.5 text-white" />}
                    </span>
                    <span>
                      <span className="block text-xs font-medium text-white">{el.nombre}</span>
                      <span className="block text-[10px] uppercase tracking-widest text-white/30">{el.unidad}</span>
                    </span>
                  </button>
                  {estado.entregado && (
                    <div className="flex gap-2 sm:shrink-0">
                      <div className="flex-1 space-y-1 sm:w-24 sm:flex-none">
                        <Label className="text-[9px] uppercase tracking-widest text-white/40">Cantidad</Label>
                        <Input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={estado.cantidad}
                          onChange={(e) => onActualizarElemento(el.id, "cantidad", e.target.value)}
                          className="h-11 bg-white/5 border-white/10 text-white rounded-lg"
                        />
                      </div>
                      <div className="flex-1 space-y-1 sm:w-40 sm:flex-none">
                        <Label className="text-[9px] uppercase tracking-widest text-white/40">Fecha de recepción</Label>
                        <Input
                          type="date"
                          value={estado.fechaRecepcion}
                          onChange={(e) => onActualizarElemento(el.id, "fechaRecepcion", e.target.value)}
                          className="h-11 bg-white/5 border-white/10 text-white rounded-lg"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {fila.adicionales.map((ad) => (
              <div key={ad.id} className="flex flex-col gap-3 rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-1">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Elemento adicional</Label>
                    <Input
                      value={ad.nombre}
                      onChange={(e) => onActualizarAdicional(ad.id, { nombre: e.target.value })}
                      className="h-11 bg-white/5 border-white/10 text-white rounded-lg"
                      placeholder="Nombre del elemento"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => onEliminarAdicional(ad.id)}
                    className="mt-6 flex h-11 items-center justify-center gap-1.5 rounded-lg px-3 text-[10px] font-bold uppercase tracking-widest text-red-400 transition-colors hover:bg-red-400/10"
                    aria-label="Eliminar elemento adicional"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="w-24 space-y-1">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Unidad</Label>
                    <select
                      value={ad.unidad}
                      onChange={(e) => onActualizarAdicional(ad.id, { unidad: e.target.value as "UND." | "PAR." })}
                      className={FIELD + " h-11 w-full px-2 text-xs"}
                    >
                      <option value="UND.">UND.</option>
                      <option value="PAR.">PAR.</option>
                    </select>
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Cantidad</Label>
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      value={ad.cantidad}
                      onChange={(e) => onActualizarAdicional(ad.id, { cantidad: e.target.value })}
                      className="h-11 bg-white/5 border-white/10 text-white rounded-lg"
                    />
                  </div>
                  <div className="w-40 space-y-1">
                    <Label className="text-[9px] uppercase tracking-widest text-white/40">Fecha de recepción</Label>
                    <Input
                      type="date"
                      value={ad.fechaRecepcion}
                      onChange={(e) => onActualizarAdicional(ad.id, { fechaRecepcion: e.target.value })}
                      className="h-11 bg-white/5 border-white/10 text-white rounded-lg"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={onAgregarAdicional}
            className="mt-4 flex h-11 items-center justify-center gap-2 rounded-xl border border-[#F25C05]/40 bg-[#F25C05]/10 px-4 text-[10px] font-bold uppercase tracking-widest text-[#F25C05] transition-all hover:bg-[#F25C05]/20"
          >
            <Plus className="h-4 w-4" /> Agregar elemento
          </button>

          <div className="mt-5 space-y-2">
            <Label className="text-[10px] text-white/60">Observaciones</Label>
            <textarea
              value={fila.observaciones}
              onChange={(e) => onObservaciones(e.target.value)}
              className={TEXTAREA}
              placeholder="Novedades de la entrega (opcional)."
            />
          </div>

          <div className="mt-6 pt-5 border-t border-white/5">
            <p className="mb-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 text-[11px] leading-relaxed text-white/60">
              {CONSTANCIA_TRABAJADOR_EPP}
            </p>
            <SignaturePad onSave={onFirma} initialValue={fila.firma} label="Firma del trabajador que recibe" />
          </div>

          {fila.errorMsg && (
            <div className="mt-5 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium leading-relaxed">
              {fila.errorMsg}
            </div>
          )}
          {fila.avisoMsg && (
            <div className="mt-5 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-sm font-medium leading-relaxed">
              {fila.avisoMsg}
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            {completado && fila.formularioId && (
              <Link
                href={`/sst/${fila.formularioId}`}
                target="_blank"
                className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 text-xs font-bold text-white transition-all hover:bg-white/10"
              >
                <Eye className="h-4 w-4" /> Ver formulario
              </Link>
            )}
            {completado && fila.pdfBlob && (
              <button
                type="button"
                onClick={onDescargar}
                className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 text-xs font-bold text-white transition-all hover:bg-white/10"
              >
                <Download className="h-4 w-4" /> Descargar PDF
              </button>
            )}
            <button
              type="button"
              onClick={onGuardarBorrador}
              disabled={fila.guardando || fila.generando}
              className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 text-xs font-bold text-white transition-all hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {fila.guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Guardar borrador
            </button>
            <button
              type="button"
              onClick={onGenerar}
              disabled={fila.generando || fila.guardando}
              className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#F25C05] px-8 text-xs font-bold text-white transition-all hover:bg-[#F25C05]/90 shadow-lg shadow-[#F25C05]/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {fila.generando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {completado ? "Regenerar cargo en PDF" : "Generar cargo en PDF"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CampoForm({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={`space-y-2 ${full ? "md:col-span-2" : ""}`}>
      <Label className={LABEL}>{label}</Label>
      {children}
    </div>
  );
}
