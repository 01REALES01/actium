"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type {
  EmpleadoConDocumentos,
  AusentismoConEmpleado,
  IncidenteConEmpleado,
  EmpleadoDocumento,
} from "@/lib/data/sst";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function docStatus(docs: EmpleadoDocumento[], tipo: string) {
  const doc = docs.find((d) => d.tipo === tipo);
  if (!doc) return "missing";
  if (!doc.vigencia_hasta) return "valid";
  const hoy = new Date();
  const vigencia = new Date(doc.vigencia_hasta);
  const diffDias = (vigencia.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDias < 0) return "expired";
  if (diffDias < 30) return "warning";
  return "valid";
}

function StatusIcon({ status }: { status: string }) {
  if (status === "valid") {
    return (
      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500/10">
        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
      </div>
    );
  }
  if (status === "warning") {
    return (
      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-amber-500/10">
        <AlertCircle className="h-5 w-5 text-amber-500" />
      </div>
    );
  }
  // expired o missing
  return (
    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-red-500/10">
      <AlertCircle className="h-5 w-5 text-red-500" />
    </div>
  );
}

function severidadLabel(s: string) {
  const map: Record<string, string> = {
    leve: "Leve",
    moderado: "Moderado",
    grave: "Grave",
    critico: "Crítico",
  };
  return map[s] ?? s;
}

function severidadColor(s: string) {
  if (s === "critico") return "bg-red-500/20 text-red-400";
  if (s === "grave") return "bg-red-500/10 text-red-500";
  if (s === "moderado") return "bg-amber-500/10 text-amber-500";
  return "bg-blue-500/10 text-blue-500";
}

function ausentismoTipoLabel(t: string) {
  const map: Record<string, string> = {
    medico: "Cita Médica",
    personal: "Personal",
    incapacidad: "Incapacidad",
    vacaciones: "Vacaciones",
    otro: "Otro",
  };
  return map[t] ?? t;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface WorkerDrillDownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "asignado" | "operacion" | "ausentismo" | "incidente" | "accidente";
  proyectoNombre: string;
  empleados: EmpleadoConDocumentos[];
  ausentismos: AusentismoConEmpleado[];
  incidentes: IncidenteConEmpleado[];
  accidentes: IncidenteConEmpleado[];
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function WorkerDrillDown({
  open,
  onOpenChange,
  type,
  proyectoNombre,
  empleados,
  ausentismos,
  incidentes,
  accidentes,
}: WorkerDrillDownProps) {
  const isEvent = type === "incidente" || type === "accidente";
  const eventData = type === "accidente" ? accidentes : incidentes;

  const getTitle = () => {
    switch (type) {
      case "asignado":  return "Personal Asignado";
      case "operacion": return "Personal en Operación";
      case "ausentismo": return "Personal Ausente";
      case "incidente": return "Desglose de Incidentes";
      case "accidente": return "Accidentes Graves";
    }
  };

  const getAccent = () => {
    switch (type) {
      case "asignado":  return "bg-orange-500";
      case "operacion": return "bg-emerald-500";
      case "ausentismo": return "bg-amber-500";
      case "incidente": return "bg-blue-500";
      case "accidente": return "bg-red-500";
    }
  };

  const totalLabel = () => {
    if (isEvent)
      return `${eventData.length} ${type === "incidente" ? "Incidentes registrados" : "Accidentes graves"}`;
    if (type === "ausentismo")
      return `${ausentismos.length} Ausentes (historial)`;
    return `${empleados.length} Trabajadores en sitio`;
  };

  const actionLabel = () => {
    if (isEvent) return "Descargar Reporte de Seguridad";
    if (type === "ausentismo") return "Descargar Reporte de Ausencias";
    return "Ver Gestión de Documentación Completa";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl bg-[#1A1A1A] border-white/5 p-0 text-white overflow-hidden shadow-2xl rounded-2xl">
        <div className="flex flex-col">
          {/* Header */}
          <DialogHeader className="p-8 border-b border-white/5 bg-white/[0.01]">
            <div className="flex items-center gap-2 mb-2">
              <div className={`h-1.5 w-4 rounded-full ${getAccent()}`} />
              <DialogTitle className="text-xs font-bold tracking-widest text-white/50 uppercase">
                {getTitle()}
              </DialogTitle>
            </div>
            <DialogDescription className="text-3xl font-bold text-white mt-1">
              {proyectoNombre}
            </DialogDescription>
          </DialogHeader>

          {/* Table */}
          <div className="flex-1 overflow-y-auto max-h-[60vh]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  {isEvent ? (
                    <>
                      <th className="pl-8 pr-4 py-4 text-[10px] font-bold uppercase tracking-widest text-white/30 w-28">Fecha</th>
                      <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-white/30">Información del Evento</th>
                      <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-white/30">Análisis y Causa Raíz</th>
                      <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-white/30 text-center w-24">Severidad</th>
                      <th className="pl-4 pr-8 py-4 text-[10px] font-bold uppercase tracking-widest text-white/30 text-center w-24">Trabajador</th>
                    </>
                  ) : type === "ausentismo" ? (
                    <>
                      <th className="pl-8 pr-4 py-4 text-[10px] font-bold uppercase tracking-widest text-white/30">Trabajador</th>
                      <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-white/30">Motivo</th>
                      <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-white/30 text-center">Inicio</th>
                      <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-white/30 text-center">Fin</th>
                      <th className="pl-4 pr-8 py-4 text-[10px] font-bold uppercase tracking-widest text-white/30 text-center">Tipo</th>
                    </>
                  ) : (
                    <>
                      <th className="pl-8 pr-4 py-4 text-[10px] font-bold uppercase tracking-widest text-white/30">Trabajador</th>
                      <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-white/30 text-center">ARL</th>
                      <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-white/30 text-center">EPS</th>
                      <th className="px-4 py-4 text-[10px] font-bold uppercase tracking-widest text-white/30 text-center">Cert. Alturas</th>
                      <th className="pl-4 pr-8 py-4 text-[10px] font-bold uppercase tracking-widest text-white/30 text-center">Examen Médico</th>
                    </>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {/* ── Eventos (incidentes/accidentes) ── */}
                {isEvent &&
                  (eventData.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="pl-8 py-12 text-sm text-white/20 italic">
                        No hay {type === "incidente" ? "incidentes" : "accidentes"} registrados.
                      </td>
                    </tr>
                  ) : (
                    eventData.map((ev) => (
                      <tr key={ev.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="pl-8 pr-4 py-6 align-top">
                          <p className="text-xs font-bold text-white/40">
                            {new Date(ev.fecha).toLocaleDateString("es-CO")}
                          </p>
                        </td>
                        <td className="px-4 py-6 align-top">
                          <div className="flex gap-3">
                            <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                            <p className="text-sm leading-relaxed text-white/90">{ev.descripcion}</p>
                          </div>
                        </td>
                        <td className="px-4 py-6 align-top">
                          <div className="flex gap-3">
                            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-sm leading-relaxed text-white/60 italic">
                              {ev.causas ?? ev.acciones_tomadas ?? "—"}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-6 align-top text-center">
                          <span className={`inline-block px-2 py-1 rounded text-[9px] font-bold uppercase ${severidadColor(ev.severidad)}`}>
                            {severidadLabel(ev.severidad)}
                          </span>
                        </td>
                        <td className="pl-4 pr-8 py-6 align-top text-center text-xs font-medium text-white/40">
                          {ev.empleados?.nombre ?? "—"}
                        </td>
                      </tr>
                    ))
                  ))}

                {/* ── Ausentismos ── */}
                {type === "ausentismo" &&
                  (ausentismos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="pl-8 py-12 text-sm text-white/20 italic">
                        No hay ausentismos registrados.
                      </td>
                    </tr>
                  ) : (
                    ausentismos.map((aus) => (
                      <tr key={aus.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="pl-8 pr-4 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-white/40 uppercase shrink-0">
                              {aus.empleados?.nombre?.charAt(0) ?? "?"}
                            </div>
                            <div>
                              <Link
                                href={`/field-workers/${aus.empleado_id}`}
                                className="text-sm font-bold text-white hover:text-[#FF916E] transition-colors"
                              >
                                {aus.empleados?.nombre ?? "—"}
                              </Link>
                              <p className="text-[10px] text-white/30 uppercase tracking-widest">{aus.empleados?.cargo ?? "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-sm font-medium text-white/80">{aus.razon}</td>
                        <td className="px-4 py-5 text-center text-[11px] font-bold text-white/40">
                          {new Date(aus.fecha_inicio).toLocaleDateString("es-CO")}
                        </td>
                        <td className="px-4 py-5 text-center text-[11px] font-bold text-white/40">
                          {new Date(aus.fecha_fin).toLocaleDateString("es-CO")}
                        </td>
                        <td className="pl-4 pr-8 py-5 text-center">
                          <span className="inline-block px-2 py-1 rounded text-[9px] font-bold uppercase bg-emerald-500/10 text-emerald-500">
                            {ausentismoTipoLabel(aus.tipo)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ))}

                {/* ── Empleados (asignado / operacion) ── */}
                {(type === "asignado" || type === "operacion") &&
                  (empleados.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="pl-8 py-12 text-sm text-white/20 italic">
                        No hay personal asignado a este proyecto.
                      </td>
                    </tr>
                  ) : (
                    empleados.map((emp) => (
                      <tr key={emp.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="pl-8 pr-4 py-5">
                          <div className="flex items-center gap-4">
                            <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-white/5 flex-shrink-0 border border-white/10">
                              {emp.foto_path ? (
                                <Image src={emp.foto_path} alt={emp.nombre} fill className="object-cover" />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white/40 uppercase">
                                  {emp.nombre.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <Link
                                href={`/field-workers/${emp.id}`}
                                className="block text-base font-bold text-white truncate hover:text-[#FF916E] transition-colors"
                              >
                                {emp.nombre}
                              </Link>
                              <p className="text-[10px] font-medium text-white/30 uppercase tracking-widest truncate mt-0.5">
                                {emp.cargo ?? emp.profesion ?? "—"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <StatusIcon status={docStatus(emp.documentos, "arl")} />
                            <span className="text-[9px] font-bold text-white/20 uppercase">{emp.arl ?? "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <StatusIcon status={docStatus(emp.documentos, "eps")} />
                            <span className="text-[9px] font-bold text-white/20 uppercase">{emp.eps ?? "—"}</span>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <StatusIcon status={docStatus(emp.documentos, "certificacion_altura")} />
                            <span className="text-[9px] font-bold text-white/20 uppercase">Alturas</span>
                          </div>
                        </td>
                        <td className="pl-4 pr-8 py-5 text-center">
                          <div className="flex flex-col items-center gap-1.5">
                            <StatusIcon status={docStatus(emp.documentos, "examen_medico")} />
                            <span className="text-[9px] font-bold text-white/20 uppercase">Médico</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ))}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="p-8 border-t border-white/5 bg-white/[0.02] flex justify-between items-center">
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
              Total: {totalLabel()}
            </p>
            {isEvent || type === "ausentismo" ? (
              <a
                href="/sst"
                className="rounded-xl bg-orange-500 px-8 py-4 text-xs font-bold text-[#1A1A1A] uppercase tracking-widest hover:bg-orange-400 transition-all shadow-[0_0_20px_rgba(255,145,110,0.2)] inline-block"
              >
                Ver Módulo SST Completo
              </a>
            ) : (
              <a
                href="/field-workers"
                className="rounded-xl bg-orange-500 px-8 py-4 text-xs font-bold text-[#1A1A1A] uppercase tracking-widest hover:bg-orange-400 transition-all shadow-[0_0_20px_rgba(255,145,110,0.2)] inline-block"
              >
                Ver Gestión de Personal
              </a>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
