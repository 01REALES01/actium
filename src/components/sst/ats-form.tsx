"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Plus, Trash2, Loader2, Check, CheckCircle2 } from "lucide-react";
import { SignaturePad } from "./signature-pad";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import { crearAtsAction, actualizarAtsAction } from "@/lib/actions/ats";

type ProyectoOpt = {
  id: string;
  nombre: string;
  empresa_id: string;
  subempresa_id: string;
};

type EmpleadoOpt = {
  id: string;
  nombre: string;
  cedula: string;
  cargo: string | null;
  proyecto_id: string;
};

type PasoState = {
  id: number;
  paso: string;
  peligros: string;
  consecuencias: string;
  controles: string;
};

export interface AtsFormProps {
  modo: "crear" | "editar";
  proyectos: ProyectoOpt[];
  empleados: EmpleadoOpt[];
  responsableNombre: string;
  formulario?: {
    id: string;
    proyecto_id: string;
    ubicacion: string;
    area: string;
    pasos: { paso: string; peligros: string; consecuencias: string; controles: string }[];
    trabajadoresIds: string[];
    tieneFirma: boolean;
  };
}

let pasoSeq = 1;
const nuevoPaso = (): PasoState => ({
  id: pasoSeq++,
  paso: "",
  peligros: "",
  consecuencias: "",
  controles: "",
});

export function AtsForm({ modo, proyectos, empleados, responsableNombre, formulario }: AtsFormProps) {
  const router = useRouter();
  const esEdicion = modo === "editar";

  const [proyectoId, setProyectoId] = useState(formulario?.proyecto_id ?? "");
  const [ubicacion, setUbicacion] = useState(formulario?.ubicacion ?? "");
  const [area, setArea] = useState(formulario?.area ?? "");

  const [pasos, setPasos] = useState<PasoState[]>(
    formulario && formulario.pasos.length > 0
      ? formulario.pasos.map((p) => ({ ...nuevoPaso(), ...p }))
      : [nuevoPaso()],
  );

  const [selectedEmpleados, setSelectedEmpleados] = useState<string[]>(
    formulario?.trabajadoresIds ?? [],
  );

  // En edición la firma previa se conserva; solo se sube una nueva si se redibuja.
  const [firmaData, setFirmaData] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const empleadosDelProyecto = empleados.filter((e) => !proyectoId || e.proyecto_id === proyectoId);

  const addPaso = () => setPasos((prev) => [...prev, nuevoPaso()]);
  const updatePaso = (id: number, field: keyof PasoState, value: string) =>
    setPasos((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  const removePaso = (id: number) =>
    setPasos((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));

  const toggleEmpleado = (id: string) =>
    setSelectedEmpleados((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id],
    );

  const handleSubmit = async (estado: "borrador" | "completado" = "completado") => {
    setErrorMsg("");
    const esBorrador = estado === "borrador";

    // El proyecto y la ubicación son obligatorios siempre (incluso en borrador).
    if (!proyectoId || !ubicacion.trim()) {
      setErrorMsg("Seleccione el proyecto e indique la ubicación.");
      return;
    }
    // El resto solo se exige al emitir (completado).
    if (!esBorrador) {
      if (pasos.some((p) => !p.paso.trim())) {
        setErrorMsg("Cada paso debe tener una descripción.");
        return;
      }
      if (selectedEmpleados.length === 0) {
        setErrorMsg("Seleccione al menos un trabajador ejecutor.");
        return;
      }
      if (!esEdicion && !firmaData) {
        setErrorMsg("Debe registrar la firma del responsable.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const pasosPayload = pasos.map((p) => ({
        paso: p.paso.trim(),
        peligros: p.peligros.trim(),
        consecuencias: p.consecuencias.trim(),
        controles: p.controles.trim(),
      }));

      // Sube firma (solo si hay una nueva) al bucket `firmas`, con ruta por tenant.
      let firmaPath: string | null = null;
      if (firmaData) {
        const proyecto = proyectos.find((p) => p.id === proyectoId);
        if (!proyecto) throw new Error("Proyecto inválido.");
        const blob = await (await fetch(firmaData)).blob();
        const ruta = `${proyecto.empresa_id}/${proyecto.subempresa_id}/ats-${Date.now()}/firma_responsable.png`;
        const { error: upErr } = await supabase.storage
          .from("firmas")
          .upload(ruta, blob, { contentType: "image/png", upsert: true });
        if (upErr) throw new Error("No fue posible subir la firma: " + upErr.message);
        firmaPath = ruta;
      }

      if (esEdicion && formulario) {
        await actualizarAtsAction({
          formularioId: formulario.id,
          ubicacion: ubicacion.trim(),
          area: area.trim(),
          pasos: pasosPayload,
          trabajadoresIds: selectedEmpleados,
          firmaPath,
          responsableNombre,
        });
        router.push(`/sst/${formulario.id}`);
      } else {
        const { id } = await crearAtsAction({
          proyectoId,
          ubicacion: ubicacion.trim(),
          area: area.trim(),
          estado,
          pasos: pasosPayload,
          trabajadoresIds: selectedEmpleados,
          firmaPath,
          responsableNombre,
        });
        router.push(`/sst/${id}`);
      }
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err?.message || "Error al procesar el ATS.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl">
      {/* 1. Datos Básicos */}
      <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-5 sm:p-6 shadow-2xl">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-widest text-[#F25C05] uppercase mb-6">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F25C05]/10 text-xs">1</span>
          Datos Generales
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Proyecto</Label>
            <Select value={proyectoId} onValueChange={setProyectoId} disabled={esEdicion}>
              <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white rounded-xl">
                <SelectValue placeholder="Seleccione el proyecto" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                {proyectos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {esEdicion && (
              <p className="text-[10px] text-white/30">El proyecto no se puede cambiar al editar.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Ubicación / Frente de Trabajo</Label>
            <Input
              placeholder="Ej. Torre Norte, Piso 4"
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              className="h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Área (opcional)</Label>
            <Input
              placeholder="Ej. Soldadura, Montaje"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20"
            />
          </div>
        </div>
      </div>

      {/* 2. Pasos y Peligros */}
      <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="flex items-center gap-2 text-sm font-bold tracking-widest text-[#F25C05] uppercase">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F25C05]/10 text-xs">2</span>
            Secuencia de Pasos
          </h2>
          <button
            type="button"
            onClick={addPaso}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/10 transition-colors"
          >
            <Plus className="h-3 w-3" /> Agregar Paso
          </button>
        </div>

        <div className="space-y-4">
          {pasos.map((paso, index) => (
            <div key={paso.id} className="relative rounded-lg border border-white/5 bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Paso {index + 1}</p>
                {pasos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removePaso(paso.id)}
                    className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md"
                    aria-label="Eliminar paso"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] text-white/60">Descripción de la Tarea</Label>
                  <Input
                    value={paso.paso}
                    onChange={(e) => updatePaso(paso.id, "paso", e.target.value)}
                    className="h-11 bg-white/5 border-white/10 text-white rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] text-amber-500/80">Peligros Identificados</Label>
                    <Input
                      value={paso.peligros}
                      onChange={(e) => updatePaso(paso.id, "peligros", e.target.value)}
                      className="h-11 bg-amber-500/5 border-amber-500/20 text-white rounded-lg focus-visible:ring-amber-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-white/50">Consecuencias</Label>
                    <Input
                      value={paso.consecuencias}
                      onChange={(e) => updatePaso(paso.id, "consecuencias", e.target.value)}
                      className="h-11 bg-white/5 border-white/10 text-white rounded-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-emerald-500/80">Controles Propuestos</Label>
                    <Input
                      value={paso.controles}
                      onChange={(e) => updatePaso(paso.id, "controles", e.target.value)}
                      className="h-11 bg-emerald-500/5 border-emerald-500/20 text-white rounded-lg focus-visible:ring-emerald-500/50"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Trabajadores */}
      <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-5 sm:p-6 shadow-2xl">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-widest text-[#F25C05] uppercase mb-6">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F25C05]/10 text-xs">3</span>
          Personal Ejecutor
        </h2>

        {proyectoId ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {empleadosDelProyecto.map((emp) => {
              const isSelected = selectedEmpleados.includes(emp.id);
              return (
                <button
                  type="button"
                  key={emp.id}
                  onClick={() => toggleEmpleado(emp.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                    isSelected
                      ? "border-[#F25C05] bg-[#F25C05]/10"
                      : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 ${
                      isSelected ? "border-[#F25C05] bg-[#F25C05]" : "border-white/20"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white truncate">{emp.nombre}</p>
                    <p className="text-[9px] text-white/40 uppercase tracking-widest truncate">
                      {emp.cargo || "Operario"}
                    </p>
                  </div>
                </button>
              );
            })}
            {empleadosDelProyecto.length === 0 && (
              <p className="text-sm text-white/30 italic col-span-full">
                No hay empleados registrados en este proyecto.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-white/30 italic">Selecciona un proyecto primero para ver el personal.</p>
        )}
      </div>

      {/* 4. Firma y Envío */}
      <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-5 sm:p-6 shadow-2xl">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-widest text-[#F25C05] uppercase mb-6">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F25C05]/10 text-xs">4</span>
          Validación y Firma
        </h2>

        {esEdicion && formulario?.tieneFirma && !firmaData && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            Firma del responsable ya registrada. Vuelva a firmar solo si desea reemplazarla.
          </div>
        )}

        <SignaturePad onSave={setFirmaData} />

        {errorMsg && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
            {errorMsg}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/5 flex flex-col-reverse sm:flex-row justify-end gap-3">
          {!esEdicion && (
            <button
              type="button"
              onClick={() => handleSubmit("borrador")}
              disabled={isSubmitting}
              className="flex h-14 w-full sm:w-auto items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 px-8 text-sm font-bold text-white transition-all hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-5 w-5" /> Guardar Borrador
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSubmit("completado")}
            disabled={isSubmitting}
            className="flex h-14 w-full sm:w-auto items-center justify-center gap-3 rounded-xl bg-[#F25C05] px-10 text-sm font-bold text-white transition-all hover:bg-[#F25C05]/90 shadow-lg shadow-[#F25C05]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Procesando...</>
            ) : (
              <><Save className="h-5 w-5" /> {esEdicion ? "Guardar Cambios" : "Emitir Análisis Seguro de Trabajo"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
