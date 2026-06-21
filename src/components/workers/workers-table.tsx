"use client";

import Image from "next/image";
import { Upload, MapPin } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import type { EmpleadoConDocumentos } from "@/lib/data/sst";
import type { Tables } from "@/types/database.types";
import { WorkerDetailsModal } from "./worker-details-modal";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDocStatus(emp: EmpleadoConDocumentos) {
  const hoy = new Date();
  let hasExpired = false;
  let hasWarning = false;

  for (const doc of emp.documentos) {
    if (!doc.vigencia_hasta) continue;
    const diff = (new Date(doc.vigencia_hasta).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0) { hasExpired = true; break; }
    if (diff < 30) hasWarning = true;
  }

  if (hasExpired) return "VENCIDO";
  if (hasWarning) return "POR VENCER";
  return "AL DÍA";
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    "AL DÍA":    "text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(52,211,153,0.1)]",
    "POR VENCER": "text-amber-400 border-amber-500/20 shadow-[0_0_10px_rgba(251,191,36,0.1)]",
    "VENCIDO":   "text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9px] font-bold tracking-widest bg-white/[0.02] backdrop-blur-sm transition-all ${styles[status] ?? "text-white/40 border-white/5 shadow-none"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'AL DÍA' ? 'bg-emerald-500' : status === 'POR VENCER' ? 'bg-amber-500' : 'bg-white/20'}`} />
      {status}
    </span>
  );
}

function DocChip({ tipo, vigencia_hasta }: { tipo: string; vigencia_hasta: string | null }) {
  const hoy = new Date();
  let color = "border-white/10 text-white/40 shadow-none";
  let dotColor = "bg-white/20";
  if (vigencia_hasta) {
    const diff = (new Date(vigencia_hasta).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0) {
      color = "border-red-500/30 text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)]";
      dotColor = "bg-red-500";
    }
    else if (diff < 30) {
      color = "border-amber-500/30 text-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.15)]";
      dotColor = "bg-amber-500";
    }
    else {
      color = "border-emerald-500/20 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.1)]";
      dotColor = "bg-emerald-500";
    }
  }
  const label = tipo.replace("_", " ").toUpperCase().slice(0, 12);
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border bg-white/[0.01] px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest backdrop-blur-sm transition-all hover:bg-white/[0.03] ${color}`}>
      <span className={`h-1 w-1 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type EmpleadoConProyecto = EmpleadoConDocumentos & { proyecto_nombre: string };

interface WorkersTableProps {
  empleados: EmpleadoConProyecto[];
  proyectos: Tables<"proyectos">[];
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function WorkersTable({ empleados }: WorkersTableProps) {
  const router = useRouter();
  const [selectedWorker, setSelectedWorker] = useState<EmpleadoConProyecto | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  if (empleados.length === 0) {
    return (
      <div className="w-full rounded-xl border border-white/5 bg-[#1A1A1A] p-12 text-center">
        <p className="text-sm text-white/20 italic">No hay personal asignado a ningún proyecto activo.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-3xl border-0 bg-white/[0.02] backdrop-blur-xl shadow-2xl relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
      <table className="w-full min-w-[800px] border-collapse text-left relative z-10">
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.01]">
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Trabajador</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Cargo</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Proyecto</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">ARL / EPS</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40">Documentos SST</th>
            <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-white/40 text-center">Cumplimiento</th>
            <th className="px-6 py-4" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {empleados.map((emp) => {
            const status = getDocStatus(emp);
            return (
              <tr
                key={emp.id}
                className="transition-all duration-300 hover:bg-white/[0.04] hover:-translate-y-[1px] group cursor-pointer relative"
                onClick={() => router.push(`/field-workers/${emp.id}`)}
              >
                {/* Identidad */}
                <td className="px-6 py-5">
                  <div className="flex items-center gap-4">
                    <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-white/10 shrink-0">
                      {emp.foto_path ? (
                        <Image src={emp.foto_path} alt={emp.nombre} fill className="object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white/40 uppercase">
                          {emp.nombre.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white leading-tight">{emp.nombre}</p>
                      <p className="text-[10px] font-medium text-white/20 uppercase tracking-wider">CC {emp.cedula}</p>
                    </div>
                  </div>
                </td>

                {/* Cargo */}
                <td className="px-6 py-5">
                  <p className="text-sm text-white/60">{emp.cargo ?? emp.profesion ?? "—"}</p>
                </td>

                {/* Proyecto */}
                <td className="px-6 py-5">
                  <div className="flex items-center gap-2 text-white/60">
                    <MapPin className="h-4 w-4 text-[#ff4500]/50 shrink-0" />
                    <span className="text-sm truncate max-w-[180px]">{emp.proyecto_nombre}</span>
                  </div>
                </td>

                {/* ARL / EPS */}
                <td className="px-6 py-5">
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-white/40">ARL: <span className="text-white/70">{emp.arl ?? "—"}</span></p>
                    <p className="text-[11px] font-bold text-white/40">EPS: <span className="text-white/70">{emp.eps ?? "—"}</span></p>
                  </div>
                </td>

                {/* Documentos SST */}
                <td className="px-6 py-5">
                  {emp.documentos.length === 0 ? (
                    <span className="text-[10px] text-white/20 italic">Sin docs registrados</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {emp.documentos.map((doc) => (
                        <DocChip key={doc.id} tipo={doc.tipo} vigencia_hasta={doc.vigencia_hasta} />
                      ))}
                    </div>
                  )}
                </td>

                {/* Estado de cumplimiento */}
                <td className="px-6 py-5 text-center">
                  <StatusBadge status={status} />
                </td>

                {/* Acciones */}
                <td className="px-6 py-5 text-right">
                  <button
                    type="button"
                    title="Subir documentos"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedWorker(emp);
                      setModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/50 transition-all hover:bg-white/5 hover:text-white"
                  >
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Documentos</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-white/5 bg-white/[0.02] px-6 py-4">
        <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">
          {empleados.length} trabajador{empleados.length !== 1 ? "es" : ""} registrado{empleados.length !== 1 ? "s" : ""}
        </p>
      </div>

      <WorkerDetailsModal 
        open={modalOpen} 
        onOpenChange={setModalOpen} 
        empleado={selectedWorker} 
        empresaId={selectedWorker?.empresa_id} 
      />
    </div>
  );
}
