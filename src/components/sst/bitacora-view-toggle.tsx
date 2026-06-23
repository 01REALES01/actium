"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutList, CalendarDays, UserCheck, UserMinus, AlertTriangle, ShieldAlert, ClipboardList, FileText, Download } from "lucide-react";
import { BitacoraCalendarView } from "./bitacora-calendar-view";
import { createClient } from "@/lib/supabase/client";

type ParteRow = {
  proyecto_id: string;
  fecha: string;
  proyecto_nombre: string;
  total_programado: number;
  presentes: number;
  ausentes: number;
  incidentes: number;
  accidentes: number;
};

export type FormularioSSTRow = {
  id: string;
  tipo: string;
  fecha: string;
  pdf_generado_path: string;
  proyecto_id: string;
  proyecto_nombre: string;
};

export function BitacoraViewToggle({ partes = [], formularios = [] }: { partes?: ParteRow[], formularios?: FormularioSSTRow[] }) {
  const [view, setView] = useState<"list" | "calendar">("calendar");
  const supabase = createClient();

  const handleDownloadFormulario = async (path: string, tipo: string, fecha: string) => {
    try {
      const { data, error } = await supabase.storage.from("pdfs-formularios").createSignedUrl(path, 60);
      if (error || !data) throw new Error("No se pudo obtener el PDF");
      window.open(data.signedUrl, "_blank");
    } catch (err) {
      console.error(err);
      alert("Error al descargar el PDF");
    }
  };

  const fmtFecha = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="flex flex-col gap-6">
      {/* Selector de Vista */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">
          Visualización de partes
        </h3>
        <div className="flex items-center rounded-lg border border-white/10 bg-[#1A1A1A] p-1 shadow-lg">
          <button
            onClick={() => setView("calendar")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
              view === "calendar"
                ? "bg-white/10 text-white shadow-sm"
                : "text-white/40 hover:text-white"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Calendario
          </button>
          <button
            onClick={() => setView("list")}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest transition-all ${
              view === "list"
                ? "bg-white/10 text-white shadow-sm"
                : "text-white/40 hover:text-white"
            }`}
          >
            <LayoutList className="h-3.5 w-3.5" /> Lista
          </button>
        </div>
      </div>

      {view === "calendar" ? (
        <BitacoraCalendarView partes={partes} formularios={formularios} />
      ) : (
        <>
          <div className="flex flex-col gap-4 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
          {partes.length === 0 ? (
            <div className="py-12 text-center">
              <ClipboardList className="mx-auto mb-3 h-8 w-8 text-white/20" />
              <p className="text-sm text-white/40">
                Aún no hay partes registrados. Registre el parte del primer día de operación.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="pb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Fecha</th>
                    <th className="pb-3 text-[10px] font-bold uppercase tracking-widest text-white/40">Obra</th>
                    <th className="pb-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Programado</th>
                    <th className="pb-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Presentes</th>
                    <th className="pb-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Ausentes</th>
                    <th className="pb-3 text-center text-[10px] font-bold uppercase tracking-widest text-white/40">Eventos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {partes.map((p) => {
                    const diaForms = formularios.filter(f => f.proyecto_id === p.proyecto_id && f.fecha === p.fecha);
                    return (
                    <tr key={`${p.proyecto_id}-${p.fecha}`} className="group transition-colors hover:bg-white/[0.03]">
                      <td className="py-4 pl-4">
                        <Link href={`/proyectos/${p.proyecto_id}/parte/${p.fecha}`} className="block">
                          <p className="text-xs font-bold text-white transition-colors group-hover:text-[#F25C05]">
                            {fmtFecha(p.fecha)}
                          </p>
                        </Link>
                      </td>
                      <td className="py-4">
                        <Link href={`/proyectos/${p.proyecto_id}/parte/${p.fecha}`} className="block">
                          <p className="max-w-[220px] truncate text-sm text-white/80">{p.proyecto_nombre}</p>
                        </Link>
                      </td>
                      <td className="py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-white">{p.total_programado}</span>
                      </td>
                      <td className="py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-emerald-400">
                          <UserCheck className="h-3.5 w-3.5" />
                          {p.presentes}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-orange-400">
                          <UserMinus className="h-3.5 w-3.5" />
                          {p.ausentes}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        <div className="flex flex-col gap-2 justify-center items-center">
                          <div className="flex items-center justify-center gap-3">
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {p.incidentes}
                            </span>
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400">
                              <ShieldAlert className="h-3.5 w-3.5" />
                              {p.accidentes}
                            </span>
                          </div>
                          {diaForms.length > 0 && (
                            <div className="flex gap-1 flex-wrap justify-center mt-1 max-w-[150px]">
                              {diaForms.map(f => (
                                <button
                                  key={f.id}
                                  onClick={(e) => { e.preventDefault(); handleDownloadFormulario(f.pdf_generado_path, f.tipo, f.fecha); }}
                                  className="flex items-center gap-1 bg-[#F25C05]/10 text-[#F25C05] hover:bg-[#F25C05]/20 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider"
                                  title={`Descargar ${f.tipo}`}
                                >
                                  <FileText className="h-3 w-3" />
                                  {f.tipo === 'ats' ? 'ATS' : f.tipo === 'permiso_altura' ? 'ALTURA' : 'CALIENTE'}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Formularios huérfanos (sin parte diario ese día) */}
        {formularios.filter(f => !partes.some(p => p.proyecto_id === f.proyecto_id && p.fecha === f.fecha)).length > 0 && (
          <div className="mt-4 flex flex-col gap-4 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#F25C05] mb-2">
              Permisos Emitidos (Sin Parte Diario)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {formularios.filter(f => !partes.some(p => p.proyecto_id === f.proyecto_id && p.fecha === f.fecha)).map(f => (
                 <div key={f.id} className="flex flex-col gap-2 p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                    <p className="text-xs font-bold text-white truncate">{f.proyecto_nombre}</p>
                    <p className="text-[10px] text-white/40">{fmtFecha(f.fecha)}</p>
                    <button
                      onClick={() => handleDownloadFormulario(f.pdf_generado_path, f.tipo, f.fecha)}
                      className="mt-1 flex w-fit items-center gap-1.5 bg-[#F25C05]/10 text-[#F25C05] hover:bg-[#F25C05]/20 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      {f.tipo === 'ats' ? 'ATS' : f.tipo === 'permiso_altura' ? 'ALTURA' : 'CALIENTE'}
                    </button>
                 </div>
              ))}
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}
