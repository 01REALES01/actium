"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dropzone } from "@/components/ui/dropzone";
import { createClient } from "@/lib/supabase/client";
import { addEmployeeDocumentAction } from "@/lib/actions/sst-actions";
import { CalendarDays, ShieldCheck, User as UserIcon, Loader2 } from "lucide-react";
import type { EmpleadoConDocumentos } from "@/lib/data/sst";
import type { DocumentoEmpleadoTipo } from "@/types/database.types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface WorkerDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empleado: EmpleadoConDocumentos | null;
  empresaId?: string;
}

export function WorkerDetailsModal({ open, onOpenChange, empleado, empresaId }: WorkerDetailsModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocumentoEmpleadoTipo>("arl");
  const [vigenciaDesde, setVigenciaDesde] = useState("");
  const [vigenciaHasta, setVigenciaHasta] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!empleado) return null;

  const handleUpload = async () => {
    if (!selectedFile || !vigenciaDesde || !vigenciaHasta || !empresaId) {
      setErrorMsg("Debes completar todos los campos e incluir un archivo.");
      return;
    }

    setIsUploading(true);
    setErrorMsg("");
    const supabase = createClient();

    try {
      // 1. Upload to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${empleado.id}_${docType}_${Date.now()}.${fileExt}`;
      const subempPath = empleado.subempresa_id ? empleado.subempresa_id : 'default';
      const filePath = `${empresaId}/${subempPath}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documentos-empleados')
        .upload(filePath, selectedFile);

      if (uploadError) throw new Error("Error subiendo archivo: " + uploadError.message);

      // 2. Save metadata via Server Action
      await addEmployeeDocumentAction(empleado.id, docType, filePath, vigenciaDesde, vigenciaHasta);

      // Reset form
      setSelectedFile(null);
      setVigenciaDesde("");
      setVigenciaHasta("");
      onOpenChange(false); // Close on success
    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar el documento.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md bg-[#1A1A1A] border-white/5 text-white overflow-y-auto p-0 flex flex-col">
        <SheetHeader className="p-6 pb-0">
          <SheetTitle className="text-white text-xl font-bold uppercase tracking-wider">
            Expediente del Trabajador
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 p-6 flex flex-col gap-8">
          {/* User Info */}
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden relative">
              {empleado.foto_path ? (
                <Image src={empleado.foto_path} alt={empleado.nombre} fill className="object-cover" />
              ) : (
                <UserIcon className="h-8 w-8 text-white/20" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight">{empleado.nombre}</h2>
              <p className="text-sm text-white/40 font-medium uppercase tracking-widest">{empleado.cargo ?? "Sin cargo"}</p>
              <div className="mt-2 flex gap-3 text-xs text-white/60">
                <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> CC: {empleado.cedula}</span>
                <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Ingreso: {empleado.fecha_ingreso ? new Date(empleado.fecha_ingreso).toLocaleDateString() : "N/A"}</span>
              </div>
            </div>
          </div>

          {/* Current Documents */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest">Documentos Actuales</h3>
            {empleado.documentos.length === 0 ? (
              <p className="text-sm text-white/20 italic bg-white/5 p-4 rounded-xl text-center border border-white/5">
                No hay documentos registrados.
              </p>
            ) : (
              <div className="grid gap-3">
                {empleado.documentos.map((doc) => {
                  const hoy = new Date();
                  const vHasta = doc.vigencia_hasta ? new Date(doc.vigencia_hasta) : null;
                  let isWarning = false;
                  let isExpired = false;
                  
                  if (vHasta) {
                    const diff = (vHasta.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24);
                    if (diff < 0) isExpired = true;
                    else if (diff < 30) isWarning = true;
                  }

                  let color = "border-white/5 bg-white/5 text-white/60";
                  if (isExpired) color = "border-red-500/30 bg-red-500/10 text-red-500";
                  else if (isWarning) color = "border-amber-500/30 bg-amber-500/10 text-amber-500";
                  else color = "border-emerald-500/20 bg-emerald-500/10 text-emerald-500";

                  return (
                    <div key={doc.id} className="flex flex-col gap-2 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                      <div className="flex justify-between items-center">
                        <p className="text-xs font-bold uppercase tracking-widest text-white/80">
                          {doc.tipo.replace("_", " ")}
                        </p>
                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold tracking-widest ${color}`}>
                          {isExpired ? "VENCIDO" : isWarning ? "POR VENCER" : "AL DÍA"}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-white/40 uppercase tracking-widest mt-1">
                        <span>Desde: {doc.vigencia_desde ? new Date(doc.vigencia_desde).toLocaleDateString() : "N/A"}</span>
                        <span>Hasta: {doc.vigencia_hasta ? new Date(doc.vigencia_hasta).toLocaleDateString() : "N/A"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="h-px bg-white/5 w-full my-2" />

          {/* Upload New Document */}
          <div className="space-y-4 pb-6">
            <h3 className="text-xs font-bold text-[#F25C05] uppercase tracking-widest">Subir Nuevo Documento</h3>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Tipo de Documento</Label>
                <Select value={docType} onValueChange={(val) => setDocType(val as DocumentoEmpleadoTipo)}>
                  <SelectTrigger className="h-11 bg-white/5 border-white/10 text-white rounded-xl">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                    <SelectItem value="arl">ARL</SelectItem>
                    <SelectItem value="eps">EPS</SelectItem>
                    <SelectItem value="examen_medico">Examen Médico</SelectItem>
                    <SelectItem value="certificacion_altura">Certificación Alturas</SelectItem>
                    <SelectItem value="certificacion_espacio_confinado">Espacios Confinados</SelectItem>
                    <SelectItem value="otro">Otro Documento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Vigencia Desde</Label>
                  <Input 
                    type="date" 
                    value={vigenciaDesde}
                    onChange={(e) => setVigenciaDesde(e.target.value)}
                    className="h-11 bg-white/5 border-white/10 text-white rounded-xl [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Vigencia Hasta</Label>
                  <Input 
                    type="date" 
                    value={vigenciaHasta}
                    onChange={(e) => setVigenciaHasta(e.target.value)}
                    className="h-11 bg-white/5 border-white/10 text-white rounded-xl [color-scheme:dark]"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Dropzone 
                  onFileSelect={setSelectedFile} 
                  selectedFile={selectedFile} 
                  accept={{ 'application/pdf': ['.pdf'], 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] }}
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center font-medium">
                  {errorMsg}
                </div>
              )}

              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-[#F25C05] text-white font-bold tracking-wide transition-all hover:bg-[#F25C05]/90 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
              >
                {isUploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Subiendo...</>
                ) : (
                  "Guardar Documento"
                )}
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
