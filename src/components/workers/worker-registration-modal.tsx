"use client";

import { useState } from "react";
import { Plus, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { registrarTrabajadorAction } from "@/lib/actions/sst-actions";

export function WorkerRegistrationModal({
  proyectos,
}: {
  proyectos: { id: string; nombre: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [cedula, setCedula] = useState("");
  const [nombre, setNombre] = useState("");
  const [cargo, setCargo] = useState("");
  const [profesion, setProfesion] = useState("");
  const [eps, setEps] = useState("");
  const [arl, setArl] = useState("");
  const [fondoPension, setFondoPension] = useState("");
  const [proyectoId, setProyectoId] = useState<string>("none");

  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const resetForm = () => {
    setCedula("");
    setNombre("");
    setCargo("");
    setProfesion("");
    setEps("");
    setArl("");
    setFondoPension("");
    setProyectoId("none");
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && loading) return;
    setOpen(newOpen);
    if (!newOpen) {
      setTimeout(resetForm, 300);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    
    if (!cedula.trim() || !nombre.trim()) {
      setErrorMsg("Cédula y Nombres son obligatorios");
      return;
    }

    setLoading(true);
    try {
      await registrarTrabajadorAction({
        cedula: cedula.trim(),
        nombre: nombre.trim(),
        cargo: cargo.trim(),
        profesion: profesion.trim(),
        eps: eps.trim(),
        arl: arl.trim(),
        fondoPension: fondoPension.trim(),
        proyectoId: proyectoId !== "none" ? proyectoId : undefined,
      });

      setSuccessMsg("Trabajador registrado exitosamente");
      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || "Ocurrió un error al registrar el trabajador");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="flex h-12 md:h-14 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#ff4500] px-6 text-xs font-bold text-white transition-all hover:bg-[#ff4500]/90">
          <Plus className="h-4 w-4" />
          Registrar Nuevo Trabajador
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-[#1A1A1A] border-white/10 text-white p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-4 text-left">
          <DialogTitle className="text-xl font-bold tracking-tight uppercase">
            Nuevo Trabajador
          </DialogTitle>
          <DialogDescription className="text-xs text-white/50">
            Registra los datos del empleado y asígnalo a un proyecto para que aparezca en el listado activo.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 col-span-2 sm:col-span-1">
              <Label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                Cédula *
              </Label>
              <Input
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                placeholder="Número de documento"
                className="h-11 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20"
                required
              />
            </div>
            <div className="flex flex-col gap-2 col-span-2 sm:col-span-1">
              <Label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                Nombres y Apellidos *
              </Label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre completo"
                className="h-11 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 col-span-2 sm:col-span-1">
              <Label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                Cargo
              </Label>
              <Input
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
                placeholder="Ej. Soldador"
                className="h-11 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20"
              />
            </div>
            <div className="flex flex-col gap-2 col-span-2 sm:col-span-1">
              <Label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                Profesión
              </Label>
              <Input
                value={profesion}
                onChange={(e) => setProfesion(e.target.value)}
                placeholder="Ej. Técnico"
                className="h-11 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 col-span-2 sm:col-span-1">
              <Label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                EPS
              </Label>
              <Input
                value={eps}
                onChange={(e) => setEps(e.target.value)}
                placeholder="Entidad de Salud"
                className="h-11 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20"
              />
            </div>
            <div className="flex flex-col gap-2 col-span-2 sm:col-span-1">
              <Label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                ARL
              </Label>
              <Input
                value={arl}
                onChange={(e) => setArl(e.target.value)}
                placeholder="Aseguradora"
                className="h-11 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
              Fondo de Pensión
            </Label>
            <Input
              value={fondoPension}
              onChange={(e) => setFondoPension(e.target.value)}
              placeholder="Fondo de pensiones"
              className="h-11 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20"
            />
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
            <Label className="text-[10px] font-bold text-white/50 uppercase tracking-widest text-amber-500">
              Asignar a Proyecto Inicial (Opcional)
            </Label>
            <Select value={proyectoId} onValueChange={setProyectoId}>
              <SelectTrigger className="h-11 bg-white/5 border-white/10 text-white rounded-xl">
                <SelectValue placeholder="Seleccionar proyecto" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                <SelectItem value="none" className="text-white/50 italic">
                  Sin asignar / Banco de personal
                </SelectItem>
                {proyectos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-white/30 mt-1">
              Si no asignas un proyecto, el trabajador no aparecerá en el listado activo hasta que sea vinculado a una obra.
            </p>
          </div>

          <div className="mt-4 flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="px-5 py-3 rounded-xl border border-white/10 text-xs font-bold text-white/70 hover:bg-white/5 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#ff4500] text-xs font-bold text-white transition-all hover:bg-[#ff4500]/90 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar Trabajador
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
