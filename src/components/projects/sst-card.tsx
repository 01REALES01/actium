"use client";

import Link from "next/link";
import { ShieldCheck, UserCheck, Users, ArrowRight, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { WorkerDrillDown } from "./worker-drilldown";
import { useState } from "react";
import type { SSTStats, EmpleadoConDocumentos, AusentismoConEmpleado, IncidenteConEmpleado } from "@/lib/data/sst";

interface SSTCardProps {
  stats: SSTStats;
  proyectoNombre: string;
  empleados: EmpleadoConDocumentos[];
  empleadosEnOperacion: EmpleadoConDocumentos[];
  ausentismos: AusentismoConEmpleado[];
  incidentes: IncidenteConEmpleado[];
  accidentes: IncidenteConEmpleado[];
  proyectoId: string;
  fecha: string; // hoy YYYY-MM-DD
  parteExiste: boolean;
  presentesHoy: number;
  incidentesHoyCount: number;
  accidentesHoyCount: number;
  puedeEditarParte: boolean;
}

type DrilldownType = "asignado" | "operacion" | "ausentismo" | "incidente" | "accidente";

export function SSTCard({
  stats,
  proyectoNombre,
  empleados,
  empleadosEnOperacion,
  ausentismos,
  incidentes,
  accidentes,
  proyectoId,
  fecha,
  parteExiste,
  presentesHoy,
  incidentesHoyCount,
  accidentesHoyCount,
  puedeEditarParte,
}: SSTCardProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<DrilldownType>("asignado");

  const handleOpen = (newType: DrilldownType) => {
    setType(newType);
    setOpen(true);
  };

  const fechaCorta = new Date(`${fecha}T12:00:00`).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex h-full flex-col gap-5 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
      {/* Cabecera: operación de hoy */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#ff4500]/10 text-[#ff4500]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-widest text-white/50">OPERACIÓN DE HOY</h3>
            <p className="mt-0.5 text-[10px] capitalize text-white/30">{fechaCorta}</p>
          </div>
        </div>
        <Badge
          className={`text-[10px] font-bold tracking-wider ${
            parteExiste
              ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"
              : "bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"
          }`}
        >
          {parteExiste ? "REGISTRADO" : "PENDIENTE"}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleOpen("asignado")}
          className="group flex flex-col items-start rounded-lg border border-white/5 bg-white/5 p-4 transition-all hover:border-white/10 hover:bg-white/10"
        >
          <div className="mb-1 flex w-full items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Personal Asignado</p>
            <Users className="h-3 w-3 text-white/10 transition-colors group-hover:text-[#ff4500]" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{stats.personalAsignado}</span>
            <span className="text-xs text-white/40">Pax</span>
          </div>
        </button>

        <button
          onClick={() => handleOpen("operacion")}
          className="group flex flex-col items-start rounded-lg border border-white/5 bg-white/5 p-4 transition-all hover:border-white/10 hover:bg-white/10"
        >
          <div className="mb-1 flex w-full items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">En Operación</p>
            <UserCheck className="h-3 w-3 text-white/10 transition-colors group-hover:text-emerald-500" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-400">{presentesHoy}</span>
            <span className="text-xs text-white/40">/ {stats.personalAsignado}</span>
          </div>
        </button>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => handleOpen("incidente")}
          className="group flex w-full items-center justify-between rounded-lg border border-white/5 bg-white/5 p-4 transition-all hover:border-white/10 hover:bg-white/10"
        >
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 transition-colors group-hover:text-amber-500">Incidentes hoy</p>
            <p className="text-2xl font-bold text-white">{incidentesHoyCount.toString().padStart(2, "0")}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Total</p>
            <p className="text-2xl font-bold text-white/60">{stats.incidentesTotales}</p>
          </div>
        </button>

        <button
          onClick={() => handleOpen("accidente")}
          className="group flex w-full items-center justify-between rounded-lg border border-white/5 bg-white/5 p-4 transition-all hover:border-white/10 hover:bg-white/10"
        >
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-400/80 transition-colors group-hover:text-red-500">Accidentes hoy</p>
            <p className="text-2xl font-bold text-white">{accidentesHoyCount.toString().padStart(2, "0")}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Graves total</p>
            <p className="text-2xl font-bold text-white/60">{stats.accidentesGraves}</p>
          </div>
        </button>

        <button
          onClick={() => handleOpen("ausentismo")}
          className="group flex w-full items-center justify-between rounded-lg border border-white/5 bg-white/5 p-4 transition-all hover:border-white/10 hover:bg-white/10"
        >
          <div className="text-left">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 transition-colors group-hover:text-[#ff4500]">Inasistencias hoy</p>
            <p className="text-2xl font-bold text-white">{stats.ausentismos.toString().padStart(2, "0")}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">Tasa</p>
            <p className="text-2xl font-bold text-white/60">{stats.tasaAusentismo}%</p>
          </div>
        </button>
      </div>

      {/* CTA principal */}
      <Link
        href={
          parteExiste
            ? `/proyectos/${proyectoId}/parte/${fecha}`
            : (puedeEditarParte ? `/proyectos/${proyectoId}/parte/${fecha}/editar` : `/proyectos/${proyectoId}/parte/${fecha}`)
        }
        className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-[#ff4500] px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:bg-[#ff4500]/90"
      >
        {parteExiste || !puedeEditarParte ? (
          <>
            Ver parte de hoy
            <ArrowRight className="h-3.5 w-3.5" />
          </>
        ) : (
          <>
            <Pencil className="h-3.5 w-3.5" />
            Registrar parte de hoy
          </>
        )}
      </Link>

      <WorkerDrillDown
        open={open}
        onOpenChange={setOpen}
        type={type}
        proyectoNombre={proyectoNombre}
        empleados={empleados}
        empleadosEnOperacion={empleadosEnOperacion}
        ausentismos={ausentismos}
        incidentes={incidentes}
        accidentes={accidentes}
      />
    </div>
  );
}
