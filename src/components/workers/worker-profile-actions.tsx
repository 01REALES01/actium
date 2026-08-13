"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, UserCheck, UserX, Archive, Loader2 } from "lucide-react";
import { WorkerFormModal } from "./worker-form-modal";
import { ArchivarTrabajadorDialog } from "./archivar-trabajador-dialog";
import { toggleTrabajadorActivoAction } from "@/lib/actions/sst-actions";
import type { EmpleadoConProyectos } from "@/lib/data/sst";

type ProyectoOpcion = { id: string; nombre: string; empresa_id: string; subempresa_id: string };

type Props = {
  empleado: EmpleadoConProyectos;
  proyectos: ProyectoOpcion[];
  empresas: { id: string; nombre: string }[];
  subempresas: { id: string; nombre: string; empresa_id: string }[];
};

/** Acciones de gestión del trabajador en su expediente: editar, inactivar/reactivar, archivar. */
export function WorkerProfileActions({ empleado, proyectos, empresas, subempresas }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [archiving, setArchiving] = useState<{ id: string; nombre: string } | null>(null);
  const [toggling, setToggling] = useState(false);

  async function handleToggleActivo() {
    setToggling(true);
    try {
      await toggleTrabajadorActivoAction({ empleadoId: empleado.id, activo: !empleado.activo });
      router.refresh();
    } catch (err) {
      console.error("Error al cambiar el estado del trabajador:", err);
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setEditOpen(true)}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-[11px] font-bold uppercase tracking-widest text-white/70 transition-all hover:bg-white/5 hover:text-white"
      >
        <Pencil className="h-4 w-4" /> Editar
      </button>
      <button
        type="button"
        onClick={handleToggleActivo}
        disabled={toggling}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-[11px] font-bold uppercase tracking-widest text-white/70 transition-all hover:bg-white/5 hover:text-white disabled:opacity-50"
      >
        {toggling ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : empleado.activo ? (
          <UserX className="h-4 w-4" />
        ) : (
          <UserCheck className="h-4 w-4" />
        )}
        {empleado.activo ? "Inactivar" : "Reactivar"}
      </button>
      <button
        type="button"
        onClick={() => setArchiving({ id: empleado.id, nombre: empleado.nombre })}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 px-4 text-[11px] font-bold uppercase tracking-widest text-red-400 transition-all hover:bg-red-500/10"
      >
        <Archive className="h-4 w-4" /> Archivar
      </button>

      <WorkerFormModal
        modo="editar"
        empleado={empleado}
        proyectos={proyectos}
        empresas={empresas}
        subempresas={subempresas}
        empresaFija={null}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      <ArchivarTrabajadorDialog
        empleado={archiving}
        onClose={() => setArchiving(null)}
        redirectTo="/field-workers"
      />
    </div>
  );
}
