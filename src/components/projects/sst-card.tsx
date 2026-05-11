"use client";

import { ShieldCheck, UserCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { WorkerDrillDown } from "./worker-drilldown";
import { useState } from "react";
import type { SSTStats, EmpleadoConDocumentos, AusentismoConEmpleado, IncidenteConEmpleado } from "@/lib/data/sst";

interface SSTCardProps {
  stats: SSTStats;
  proyectoNombre: string;
  empleados: EmpleadoConDocumentos[];
  ausentismos: AusentismoConEmpleado[];
  incidentes: IncidenteConEmpleado[];
  accidentes: IncidenteConEmpleado[];
}

type DrilldownType = "asignado" | "operacion" | "ausentismo" | "incidente" | "accidente";

export function SSTCard({ stats, proyectoNombre, empleados, ausentismos, incidentes, accidentes }: SSTCardProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<DrilldownType>("asignado");

  const handleOpen = (newType: DrilldownType) => {
    setType(newType);
    setOpen(true);
  };

  return (
    <div className="flex h-full flex-col gap-6 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xs font-bold tracking-widest text-white/50">
              SEGURIDAD Y SALUD (SST)
            </h3>
          </div>
        </div>
        <Badge className="bg-emerald-500/10 text-[10px] font-bold tracking-wider text-emerald-500 hover:bg-emerald-500/20">
          ESTADO: ÓPTIMO
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleOpen("asignado")}
          className="flex flex-col items-start rounded-lg border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-white/10 group"
        >
          <div className="flex items-center justify-between w-full mb-1">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Personal Asignado</p>
            <Users className="h-3 w-3 text-white/10 group-hover:text-orange-500 transition-colors" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{stats.personalAsignado}</span>
            <span className="text-xs text-white/40">Pax</span>
          </div>
        </button>

        <button
          onClick={() => handleOpen("operacion")}
          className="flex flex-col items-start rounded-lg border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-white/10 group"
        >
          <div className="flex items-center justify-between w-full mb-1">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">En Operación</p>
            <UserCheck className="h-3 w-3 text-white/10 group-hover:text-emerald-500 transition-colors" />
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{stats.enOperacion}</span>
            <span className="text-xs text-white/40">Pax</span>
          </div>
        </button>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => handleOpen("incidente")}
          className="flex items-center justify-between w-full rounded-lg border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-white/10 group"
        >
          <div className="text-left">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider group-hover:text-orange-500 transition-colors">Incidentes Totales</p>
            <p className="text-2xl font-bold text-white">{stats.incidentesTotales.toString().padStart(2, "0")}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Hoy</p>
            <p className="text-2xl font-bold text-white">{stats.incidentesHoy}</p>
          </div>
        </button>

        <button
          onClick={() => handleOpen("accidente")}
          className="flex items-center justify-between w-full rounded-lg border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-white/10 group"
        >
          <div className="text-left">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider text-red-400/80 group-hover:text-red-500 transition-colors">Accidentes Graves</p>
            <p className="text-2xl font-bold text-white">{stats.accidentesGraves.toString().padStart(2, "0")}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Hoy</p>
            <p className="text-2xl font-bold text-white">{stats.accidentesHoy}</p>
          </div>
        </button>

        <button
          onClick={() => handleOpen("ausentismo")}
          className="flex items-center justify-between w-full rounded-lg border border-white/5 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-white/10 group"
        >
          <div className="text-left">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider group-hover:text-amber-500 transition-colors">Ausentismos</p>
            <p className="text-2xl font-bold text-white">{stats.ausentismos.toString().padStart(2, "0")}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Tasa</p>
            <p className="text-2xl font-bold text-white">{stats.tasaAusentismo}%</p>
          </div>
        </button>
      </div>

      <WorkerDrillDown
        open={open}
        onOpenChange={setOpen}
        type={type}
        proyectoNombre={proyectoNombre}
        empleados={empleados}
        ausentismos={ausentismos}
        incidentes={incidentes}
        accidentes={accidentes}
      />
    </div>
  );
}
