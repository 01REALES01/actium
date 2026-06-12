"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { crearProyectoAction, editarProyectoAction } from "@/lib/actions/proyectos";
import type { Tables, ProyectoEstado } from "@/types/database.types";

type Empresa = Pick<Tables<"empresas">, "id" | "nombre">;
type Subempresa = Pick<Tables<"subempresas">, "id" | "nombre" | "empresa_id">;

const ESTADOS: { value: ProyectoEstado; label: string }[] = [
  { value: "planificacion", label: "Planificación" },
  { value: "en_curso", label: "En curso" },
  { value: "pausado", label: "Pausado" },
  { value: "completado", label: "Completado" },
  { value: "cancelado", label: "Cancelado" },
];

type ProyectoFormProps = {
  modo: "crear" | "editar";
  empresas: Empresa[];
  subempresas: Subempresa[];
  /** En modo crear con admin: empresa fija. En editar: empresa del proyecto. */
  empresaFija?: string | null;
  proyecto?: Tables<"proyectos">;
};

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[#FF916E]/50 focus:outline-none focus:ring-1 focus:ring-[#FF916E]/30 transition-all [color-scheme:dark]";
const labelClass =
  "text-[10px] font-bold uppercase tracking-widest text-white/40";

export function ProyectoForm({
  modo,
  empresas,
  subempresas,
  empresaFija,
  proyecto,
}: ProyectoFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [empresaId, setEmpresaId] = useState(
    proyecto?.empresa_id ?? empresaFija ?? empresas[0]?.id ?? "",
  );
  const subempresasFiltradas = subempresas.filter((s) => s.empresa_id === empresaId);

  const [form, setForm] = useState({
    subempresaId: proyecto?.subempresa_id ?? subempresasFiltradas[0]?.id ?? "",
    nombre: proyecto?.nombre ?? "",
    codigo: proyecto?.codigo ?? "",
    descripcion: proyecto?.descripcion ?? "",
    ubicacion: proyecto?.ubicacion ?? "",
    ciudad: proyecto?.ciudad ?? "",
    estado: (proyecto?.estado ?? "planificacion") as ProyectoEstado,
    fechaInicio: proyecto?.fecha_inicio ?? "",
    fechaFinProyectada: proyecto?.fecha_fin_proyectada ?? "",
    presupuestoTotal: proyecto?.presupuesto_total != null ? String(proyecto.presupuesto_total) : "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleEmpresaChange(value: string) {
    setEmpresaId(value);
    const primeraSub = subempresas.find((s) => s.empresa_id === value);
    update("subempresaId", primeraSub?.id ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const presupuesto = form.presupuestoTotal.trim()
      ? parseFloat(form.presupuestoTotal)
      : undefined;

    try {
      if (modo === "crear") {
        if (!empresaId) throw new Error("Selecciona una empresa.");
        if (!form.subempresaId) throw new Error("Selecciona una subempresa.");
        const { id } = await crearProyectoAction({
          empresaId,
          subempresaId: form.subempresaId,
          nombre: form.nombre,
          codigo: form.codigo,
          descripcion: form.descripcion.trim() || undefined,
          ubicacion: form.ubicacion.trim() || undefined,
          ciudad: form.ciudad.trim() || undefined,
          estado: form.estado,
          fechaInicio: form.fechaInicio || undefined,
          fechaFinProyectada: form.fechaFinProyectada || undefined,
          presupuestoTotal: presupuesto,
        });
        router.push(`/proyectos/${id}`);
        router.refresh();
      } else {
        if (!proyecto) throw new Error("Proyecto no encontrado.");
        await editarProyectoAction({
          proyectoId: proyecto.id,
          nombre: form.nombre,
          codigo: form.codigo,
          descripcion: form.descripcion.trim() || undefined,
          ubicacion: form.ubicacion.trim() || undefined,
          ciudad: form.ciudad.trim() || undefined,
          estado: form.estado,
          fechaInicio: form.fechaInicio || undefined,
          fechaFinProyectada: form.fechaFinProyectada || undefined,
          presupuestoTotal: presupuesto,
        });
        router.push(`/proyectos/${proyecto.id}`);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No fue posible guardar los cambios. Intenta de nuevo.");
      setLoading(false);
    }
  }

  const mostrarSelectorEmpresa = modo === "crear" && empresas.length > 1;

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href={modo === "editar" && proyecto ? `/proyectos/${proyecto.id}` : "/proyectos"}
        className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white uppercase">
          {modo === "crear" ? "Nuevo Proyecto" : "Editar Proyecto"}
        </h1>
        <p className="mt-2 text-xs text-white/40">
          {modo === "crear"
            ? "Registra un nuevo proyecto en la plataforma."
            : "Actualiza la información del proyecto."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
        {mostrarSelectorEmpresa && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Empresa</label>
            <select
              value={empresaId}
              onChange={(e) => handleEmpresaChange(e.target.value)}
              className={inputClass}
            >
              {empresas.map((emp) => (
                <option key={emp.id} value={emp.id} className="bg-[#1A1A1A]">
                  {emp.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {modo === "crear" && (
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Subempresa</label>
            <select
              value={form.subempresaId}
              onChange={(e) => update("subempresaId", e.target.value)}
              className={inputClass}
              required
            >
              {subempresasFiltradas.length === 0 ? (
                <option value="" className="bg-[#1A1A1A]">
                  No hay subempresas disponibles
                </option>
              ) : (
                subempresasFiltradas.map((sub) => (
                  <option key={sub.id} value={sub.id} className="bg-[#1A1A1A]">
                    {sub.nombre}
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Nombre del proyecto</label>
            <input
              value={form.nombre}
              onChange={(e) => update("nombre", e.target.value)}
              placeholder="Terminal Logística Norte"
              required
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Código</label>
            <input
              value={form.codigo}
              onChange={(e) => update("codigo", e.target.value)}
              placeholder="PRY-001"
              required
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Descripción</label>
          <textarea
            value={form.descripcion}
            onChange={(e) => update("descripcion", e.target.value)}
            placeholder="Infraestructura metalmecánica..."
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Ubicación</label>
            <input
              value={form.ubicacion}
              onChange={(e) => update("ubicacion", e.target.value)}
              placeholder="Zona industrial"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Ciudad</label>
            <input
              value={form.ciudad}
              onChange={(e) => update("ciudad", e.target.value)}
              placeholder="Bogotá"
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Fecha de inicio</label>
            <input
              type="date"
              value={form.fechaInicio}
              onChange={(e) => update("fechaInicio", e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Fecha fin proyectada</label>
            <input
              type="date"
              value={form.fechaFinProyectada}
              onChange={(e) => update("fechaFinProyectada", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Presupuesto total (COP)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.presupuestoTotal}
              onChange={(e) => update("presupuestoTotal", e.target.value)}
              placeholder="0.00"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Estado</label>
            <select
              value={form.estado}
              onChange={(e) => update("estado", e.target.value as ProyectoEstado)}
              className={inputClass}
            >
              {ESTADOS.map((est) => (
                <option key={est.value} value={est.value} className="bg-[#1A1A1A]">
                  {est.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-xs text-red-400">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <Link
            href={modo === "editar" && proyecto ? `/proyectos/${proyecto.id}` : "/proyectos"}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-center text-xs font-bold text-white hover:bg-white/10 transition-colors"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-[#FF916E] px-4 py-2.5 text-xs font-bold text-[#1A1A1A] hover:bg-[#FF916E]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-3.5 w-3.5" />
            {loading ? "Guardando..." : modo === "crear" ? "Crear Proyecto" : "Guardar Cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}
