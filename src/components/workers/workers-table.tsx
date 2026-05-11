"use client";

import Image from "next/image";
import { MoreVertical, MapPin, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EmpleadoConDocumentos } from "@/lib/data/sst";
import type { Tables } from "@/types/database.types";

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
    "AL DÍA":    "text-emerald-500 bg-emerald-500/10",
    "POR VENCER": "text-amber-500 bg-amber-500/10",
    "VENCIDO":   "text-red-500 bg-red-500/10",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[9px] font-bold tracking-widest ${styles[status] ?? "text-white/40 bg-white/5"}`}>
      {status}
    </span>
  );
}

function DocChip({ tipo, vigencia_hasta }: { tipo: string; vigencia_hasta: string | null }) {
  const hoy = new Date();
  let color = "border-white/10 bg-white/5 text-white/40";
  if (vigencia_hasta) {
    const diff = (new Date(vigencia_hasta).getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
    if (diff < 0) color = "border-red-500/30 bg-red-500/10 text-red-400";
    else if (diff < 30) color = "border-amber-500/30 bg-amber-500/10 text-amber-400";
    else color = "border-emerald-500/20 bg-emerald-500/5 text-emerald-500";
  }
  const label = tipo.replace("_", " ").toUpperCase().slice(0, 12);
  return (
    <Badge variant="outline" className={`border px-2 py-0.5 text-[9px] font-bold uppercase tracking-tighter ${color}`}>
      {label}
    </Badge>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type EmpleadoConProyecto = EmpleadoConDocumentos & { proyecto_nombre: string };

interface WorkersTableProps {
  empleados: EmpleadoConProyecto[];
  proyectos: Tables<"proyectos">[];
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function WorkersTable({ empleados, proyectos }: WorkersTableProps) {
  if (empleados.length === 0) {
    return (
      <div className="w-full rounded-xl border border-white/5 bg-[#1A1A1A] p-12 text-center">
        <p className="text-sm text-white/20 italic">No hay personal asignado a ningún proyecto activo.</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-xl border border-white/5 bg-[#1A1A1A]">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-white/5 bg-white/[0.02]">
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
              <tr key={emp.id} className="transition-colors hover:bg-white/[0.02] group">
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
                    <MapPin className="h-4 w-4 text-orange-500/50 shrink-0" />
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
                  <button className="rounded-lg p-1.5 text-white/20 hover:bg-white/5 hover:text-white transition-all">
                    <MoreVertical className="h-5 w-5" />
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
    </div>
  );
}
