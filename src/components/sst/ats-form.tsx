"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Save, Plus, Trash2, Loader2, ShieldAlert, Check } from "lucide-react";
import { SignaturePad } from "./signature-pad";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

interface AtsFormProps {
  proyectos: { id: string; nombre: string }[];
  empleados: { id: string; nombre: string; cedula: string; cargo: string | null; proyecto_id: string }[];
}

export function AtsForm({ proyectos, empleados }: AtsFormProps) {
  const router = useRouter();
  
  // Basic Info
  const [proyectoId, setProyectoId] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  
  // Steps
  const [pasos, setPasos] = useState([{ id: Date.now(), descripcion: "", peligro: "", control: "" }]);
  
  // Workers
  const [selectedEmpleados, setSelectedEmpleados] = useState<string[]>([]);
  
  // Signature
  const [firmaUrl, setFirmaUrl] = useState("");
  
  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const empleadosDelProyecto = empleados.filter(e => !proyectoId || e.proyecto_id === proyectoId);

  const addPaso = () => {
    setPasos([...pasos, { id: Date.now(), descripcion: "", peligro: "", control: "" }]);
  };

  const updatePaso = (id: number, field: string, value: string) => {
    setPasos(pasos.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removePaso = (id: number) => {
    if (pasos.length > 1) {
      setPasos(pasos.filter(p => p.id !== id));
    }
  };

  const toggleEmpleado = (id: string) => {
    if (selectedEmpleados.includes(id)) {
      setSelectedEmpleados(selectedEmpleados.filter(e => e !== id));
    } else {
      setSelectedEmpleados([...selectedEmpleados, id]);
    }
  };

  const handleSubmit = async () => {
    if (!proyectoId || !ubicacion || pasos.some(p => !p.descripcion || !p.peligro) || selectedEmpleados.length === 0 || !firmaUrl) {
      setErrorMsg("Debes completar todos los campos obligatorios, agregar trabajadores y firmar.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");
    const supabase = createClient();

    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user) throw new Error("No autenticado");

      // We need user's empresa_id. Fetch from public.usuarios
      const { data: perfilData } = await supabase.from('usuarios').select('empresa_id, subempresa_id').eq('id', userData.user.id).single();
      const perfil = perfilData as { empresa_id: string | null; subempresa_id: string | null } | null;
      
      const empresaId = perfil?.empresa_id;
      const subempresaId = perfil?.subempresa_id;

      if (!empresaId) throw new Error("No se pudo determinar el tenant (empresa_id)");

      // 1. Upload Signature to Storage
      // Convert base64 to Blob
      const res = await fetch(firmaUrl);
      const blob = await res.blob();
      const formId = `ats-${Date.now()}`;
      const filePath = `${empresaId}/${subempresaId || 'default'}/${formId}/firma_supervisor.png`;

      const { error: uploadError } = await supabase.storage
        .from('firmas')
        .upload(filePath, blob, { contentType: 'image/png' });

      if (uploadError) throw new Error("Error subiendo firma: " + uploadError.message);

      // 2. Insert into formularios
      const { data: formResult, error: formError } = await supabase.from('formularios').insert({
        tipo: 'ats',
        proyecto_id: proyectoId,
        ubicacion: ubicacion,
        estado: 'completado',
        creado_por: userData.user.id,
        empresa_id: empresaId,
        subempresa_id: subempresaId,
        fecha_inicio: new Date().toISOString().split('T')[0],
      } as any).select().single();

      if (formError) throw new Error("Error creando formulario");

      const formularioId = (formResult as any).id as string;

      // 3. Insert ATS Details (Signature ref)
      await supabase.from('ats_detalles').insert({
        formulario_id: formularioId,
        firma_supervisor_url: filePath,
        fecha_inicio: new Date().toISOString()
      } as any);

      // 4. Insert Pasos
      const pasosInserts = pasos.map((p, idx) => ({
        formulario_id: formularioId,
        orden: idx + 1,
        descripcion: p.descripcion,
        peligro_identificado: p.peligro,
        control_propuesto: p.control
      }));
      await supabase.from('ats_pasos').insert(pasosInserts as any);

      // 5. Insert Trabajadores
      const trabajadoresInserts = selectedEmpleados.map(empId => ({
        formulario_id: formularioId,
        empleado_id: empId,
        firma_url: null, // Trabajadores can sign later or via tablet
      }));
      await supabase.from('ats_trabajadores').insert(trabajadoresInserts as any);

      // Success
      router.push("/sst");
      router.refresh();

    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar el ATS.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* 1. Datos Básicos */}
      <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-widest text-[#F25C05] uppercase mb-6">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F25C05]/10 text-xs">1</span>
          Datos Generales
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Proyecto</Label>
            <Select value={proyectoId} onValueChange={setProyectoId}>
              <SelectTrigger className="h-12 bg-white/5 border-white/10 text-white rounded-xl">
                <SelectValue placeholder="Seleccione el proyecto" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                {proyectos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Ubicación / Frentes de Trabajo</Label>
            <Input 
              placeholder="Ej. Torre Norte, Piso 4" 
              value={ubicacion}
              onChange={(e) => setUbicacion(e.target.value)}
              className="h-12 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20"
            />
          </div>
        </div>
      </div>

      {/* 2. Pasos y Peligros */}
      <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="flex items-center gap-2 text-sm font-bold tracking-widest text-[#F25C05] uppercase">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F25C05]/10 text-xs">2</span>
            Secuencia de Pasos
          </h2>
          <button 
            onClick={addPaso}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[10px] font-bold text-white uppercase tracking-widest hover:bg-white/10 transition-colors"
          >
            <Plus className="h-3 w-3" /> Agregar Paso
          </button>
        </div>

        <div className="space-y-4">
          {pasos.map((paso, index) => (
            <div key={paso.id} className="relative rounded-lg border border-white/5 bg-white/[0.02] p-4 group">
              <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => removePaso(paso.id)} className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-md">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Paso {index + 1}</p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] text-white/60">Descripción de la Tarea</Label>
                  <Input 
                    value={paso.descripcion}
                    onChange={(e) => updatePaso(paso.id, 'descripcion', e.target.value)}
                    className="h-10 bg-white/5 border-white/10 text-white rounded-lg"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] text-amber-500/80">Peligros Identificados</Label>
                    <Input 
                      value={paso.peligro}
                      onChange={(e) => updatePaso(paso.id, 'peligro', e.target.value)}
                      className="h-10 bg-amber-500/5 border-amber-500/20 text-white rounded-lg focus-visible:ring-amber-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] text-emerald-500/80">Controles Propuestos</Label>
                    <Input 
                      value={paso.control}
                      onChange={(e) => updatePaso(paso.id, 'control', e.target.value)}
                      className="h-10 bg-emerald-500/5 border-emerald-500/20 text-white rounded-lg focus-visible:ring-emerald-500/50"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Trabajadores */}
      <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-widest text-[#F25C05] uppercase mb-6">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F25C05]/10 text-xs">3</span>
          Personal Ejecutor
        </h2>
        
        {proyectoId ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {empleadosDelProyecto.map(emp => {
              const isSelected = selectedEmpleados.includes(emp.id);
              return (
                <div 
                  key={emp.id}
                  onClick={() => toggleEmpleado(emp.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected ? "border-[#F25C05] bg-[#F25C05]/10" : "border-white/5 bg-white/[0.02] hover:bg-white/[0.05]"
                  }`}
                >
                  <div className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${
                    isSelected ? "border-[#F25C05] bg-[#F25C05]" : "border-white/20"
                  }`}>
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold text-white truncate">{emp.nombre}</p>
                    <p className="text-[9px] text-white/40 uppercase tracking-widest truncate">{emp.cargo || "Operario"}</p>
                  </div>
                </div>
              );
            })}
            {empleadosDelProyecto.length === 0 && (
              <p className="text-sm text-white/30 italic col-span-full">No hay empleados registrados en este proyecto.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-white/30 italic">Selecciona un proyecto primero para ver el personal.</p>
        )}
      </div>

      {/* 4. Firma y Envío */}
      <div className="rounded-xl border border-white/5 bg-[#1A1A1A] p-6 shadow-2xl">
        <h2 className="flex items-center gap-2 text-sm font-bold tracking-widest text-[#F25C05] uppercase mb-6">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F25C05]/10 text-xs">4</span>
          Validación y Firma
        </h2>
        
        <SignaturePad onSave={setFirmaUrl} />

        {errorMsg && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium text-center">
            {errorMsg}
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/5 flex justify-end">
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex h-14 w-full sm:w-auto items-center justify-center gap-3 rounded-xl bg-[#F25C05] px-10 text-sm font-bold text-white transition-all hover:bg-[#F25C05]/90 shadow-lg shadow-[#F25C05]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Procesando ATS...</>
            ) : (
              <><Save className="h-5 w-5" /> Emitir Análisis Seguro de Trabajo</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
