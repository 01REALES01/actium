"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";
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
import {
  registrarTrabajadorAction,
  actualizarTrabajadorAction,
  asignarTrabajadorProyectoAction,
  retirarTrabajadorProyectoAction,
} from "@/lib/actions/sst-actions";
import type { EmpleadoConProyectos } from "@/lib/data/sst";

type ProyectoOpcion = {
  id: string;
  nombre: string;
  empresa_id: string;
  subempresa_id: string;
};
type EmpresaOpcion = { id: string; nombre: string };
type SubempresaOpcion = { id: string; nombre: string; empresa_id: string };

type Props = {
  modo: "crear" | "editar";
  empleado?: EmpleadoConProyectos;
  proyectos: ProyectoOpcion[];
  empresas: EmpresaOpcion[];
  subempresas: SubempresaOpcion[];
  empresaFija: string | null;
  /** Modo controlado: para abrir desde un menú de acciones (fila de tabla, expediente). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

const emptyForm = (empresaFija: string | null, empresas: EmpresaOpcion[]) => ({
  cedula: "",
  nombre: "",
  cargo: "",
  profesion: "",
  telefono: "",
  email: "",
  eps: "",
  arl: "",
  fondoPension: "",
  fechaIngreso: "",
  fechaRetiro: "",
  proyectoId: "none",
  empresaId: empresaFija ?? empresas[0]?.id ?? "",
  subempresaId: "",
});

export function WorkerFormModal({
  modo,
  empleado,
  proyectos,
  empresas,
  subempresas,
  empresaFija,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: Props) {
  const router = useRouter();
  const isControlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? openProp : internalOpen;
  const setOpen = (next: boolean) => {
    if (isControlled) onOpenChangeProp?.(next);
    else setInternalOpen(next);
  };

  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState(emptyForm(empresaFija, empresas));
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Gestión de proyectos (solo modo editar)
  const [proyectosAsignados, setProyectosAsignados] = useState<{ id: string; nombre: string }[]>(
    empleado?.proyectos ?? [],
  );
  const [proyectoParaAsignar, setProyectoParaAsignar] = useState<string>("");
  const [asignando, setAsignando] = useState(false);
  const [retirandoId, setRetirandoId] = useState<string | null>(null);

  // Precargar datos del empleado al abrir en modo editar
  useEffect(() => {
    if (!open) return;
    if (modo === "editar" && empleado) {
      setForm({
        cedula: empleado.cedula,
        nombre: empleado.nombre,
        cargo: empleado.cargo ?? "",
        profesion: empleado.profesion ?? "",
        telefono: empleado.telefono ?? "",
        email: empleado.email ?? "",
        eps: empleado.eps ?? "",
        arl: empleado.arl ?? "",
        fondoPension: empleado.fondo_pension ?? "",
        fechaIngreso: empleado.fecha_ingreso ?? "",
        fechaRetiro: empleado.fecha_retiro ?? "",
        proyectoId: "none",
        empresaId: empleado.empresa_id,
        subempresaId: empleado.subempresa_id,
      });
      setProyectosAsignados(empleado.proyectos ?? []);
    } else {
      setForm(emptyForm(empresaFija, empresas));
    }
    setErrorMsg("");
    setSuccessMsg("");
  }, [open, modo, empleado, empresaFija, empresas]);

  const sinProyecto = form.proyectoId === "none";
  const subempresasFiltradas = subempresas.filter((s) => s.empresa_id === form.empresaId);

  function handleEmpresaChange(value: string) {
    const primeraSub = subempresas.find((s) => s.empresa_id === value);
    setForm((f) => ({ ...f, empresaId: value, subempresaId: primeraSub?.id ?? "" }));
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && loading) return;
    setOpen(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!form.cedula.trim() || !form.nombre.trim()) {
      setErrorMsg("Cédula y Nombres son obligatorios");
      return;
    }

    const proyecto = !sinProyecto ? proyectos.find((p) => p.id === form.proyectoId) : undefined;
    const empresaResuelta = proyecto?.empresa_id ?? form.empresaId;
    const subempresaResuelta = proyecto?.subempresa_id ?? form.subempresaId;

    if (!empresaResuelta || !subempresaResuelta) {
      setErrorMsg("Selecciona la empresa y la subempresa del trabajador");
      return;
    }

    setLoading(true);
    try {
      if (modo === "crear") {
        await registrarTrabajadorAction({
          cedula: form.cedula.trim(),
          nombre: form.nombre.trim(),
          cargo: form.cargo.trim(),
          profesion: form.profesion.trim(),
          eps: form.eps.trim(),
          arl: form.arl.trim(),
          fondoPension: form.fondoPension.trim(),
          proyectoId: !sinProyecto ? form.proyectoId : undefined,
          empresaId: empresaResuelta,
          subempresaId: subempresaResuelta,
        });
        setSuccessMsg("Trabajador registrado exitosamente");
      } else if (empleado) {
        await actualizarTrabajadorAction({
          empleadoId: empleado.id,
          cedula: form.cedula.trim(),
          nombre: form.nombre.trim(),
          cargo: form.cargo.trim(),
          profesion: form.profesion.trim(),
          telefono: form.telefono.trim(),
          email: form.email.trim(),
          eps: form.eps.trim(),
          arl: form.arl.trim(),
          fondoPension: form.fondoPension.trim(),
          fechaIngreso: form.fechaIngreso,
          fechaRetiro: form.fechaRetiro,
          empresaId: form.empresaId,
          subempresaId: form.subempresaId,
        });
        setSuccessMsg("Trabajador actualizado correctamente");
      }

      router.refresh();
      setTimeout(() => setOpen(false), 1200);
    } catch (err: any) {
      setErrorMsg(err.message || "Ocurrió un error al guardar el trabajador");
    } finally {
      setLoading(false);
    }
  };

  async function handleAsignarProyecto() {
    if (!empleado || !proyectoParaAsignar) return;
    setAsignando(true);
    setErrorMsg("");
    try {
      await asignarTrabajadorProyectoAction({
        empleadoId: empleado.id,
        proyectoId: proyectoParaAsignar,
      });
      const proyecto = proyectos.find((p) => p.id === proyectoParaAsignar);
      if (proyecto) {
        setProyectosAsignados((prev) => [...prev, { id: proyecto.id, nombre: proyecto.nombre }]);
      }
      setProyectoParaAsignar("");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "No fue posible asignar el proyecto.");
    } finally {
      setAsignando(false);
    }
  }

  async function handleRetirarProyecto(proyectoId: string) {
    if (!empleado) return;
    setRetirandoId(proyectoId);
    setErrorMsg("");
    try {
      await retirarTrabajadorProyectoAction({ empleadoId: empleado.id, proyectoId });
      setProyectosAsignados((prev) => prev.filter((p) => p.id !== proyectoId));
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "No fue posible retirar al trabajador del proyecto.");
    } finally {
      setRetirandoId(null);
    }
  }

  const proyectosDisponiblesParaAsignar = proyectos.filter(
    (p) => !proyectosAsignados.some((a) => a.id === p.id),
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!isControlled && modo === "crear" && (
        <DialogTrigger asChild>
          <button className="flex h-12 md:h-14 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#ff4500] px-6 text-xs font-bold text-white transition-all hover:bg-[#ff4500]/90">
            <Plus className="h-4 w-4" />
            Registrar Nuevo Trabajador
          </button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-md bg-[#1A1A1A] border-white/10 text-white p-6 rounded-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-4 text-left">
          <DialogTitle className="text-xl font-bold tracking-tight uppercase">
            {modo === "crear" ? "Nuevo Trabajador" : "Editar Trabajador"}
          </DialogTitle>
          <DialogDescription className="text-xs text-white/50">
            {modo === "crear"
              ? "Registra los datos del empleado y asígnalo a un proyecto para que aparezca en el listado activo."
              : "Actualiza los datos del empleado. Los cambios se reflejan de inmediato en su expediente."}
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
                value={form.cedula}
                onChange={(e) => setForm((f) => ({ ...f, cedula: e.target.value }))}
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
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
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
                value={form.cargo}
                onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
                placeholder="Ej. Soldador"
                className="h-11 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20"
              />
            </div>
            <div className="flex flex-col gap-2 col-span-2 sm:col-span-1">
              <Label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                Profesión
              </Label>
              <Input
                value={form.profesion}
                onChange={(e) => setForm((f) => ({ ...f, profesion: e.target.value }))}
                placeholder="Ej. Técnico"
                className="h-11 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 col-span-2 sm:col-span-1">
              <Label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                Teléfono
              </Label>
              <Input
                type="tel"
                inputMode="numeric"
                value={form.telefono}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                placeholder="Número de contacto"
                className="h-11 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20"
              />
            </div>
            <div className="flex flex-col gap-2 col-span-2 sm:col-span-1">
              <Label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                Correo electrónico
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="correo@ejemplo.com"
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
                value={form.eps}
                onChange={(e) => setForm((f) => ({ ...f, eps: e.target.value }))}
                placeholder="Entidad de Salud"
                className="h-11 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20"
              />
            </div>
            <div className="flex flex-col gap-2 col-span-2 sm:col-span-1">
              <Label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                ARL
              </Label>
              <Input
                value={form.arl}
                onChange={(e) => setForm((f) => ({ ...f, arl: e.target.value }))}
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
              value={form.fondoPension}
              onChange={(e) => setForm((f) => ({ ...f, fondoPension: e.target.value }))}
              placeholder="Fondo de pensiones"
              className="h-11 bg-white/5 border-white/10 text-white rounded-xl placeholder:text-white/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2 col-span-2 sm:col-span-1">
              <Label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                Fecha de ingreso
              </Label>
              <Input
                type="date"
                value={form.fechaIngreso}
                onChange={(e) => setForm((f) => ({ ...f, fechaIngreso: e.target.value }))}
                className="h-11 bg-white/5 border-white/10 text-white rounded-xl [color-scheme:dark]"
              />
            </div>
            <div className="flex flex-col gap-2 col-span-2 sm:col-span-1">
              <Label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                Fecha de retiro
              </Label>
              <Input
                type="date"
                value={form.fechaRetiro}
                onChange={(e) => setForm((f) => ({ ...f, fechaRetiro: e.target.value }))}
                className="h-11 bg-white/5 border-white/10 text-white rounded-xl [color-scheme:dark]"
              />
            </div>
          </div>

          {modo === "crear" && (
            <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
              <Label className="text-[10px] font-bold text-white/50 uppercase tracking-widest text-amber-500">
                Asignar a Proyecto Inicial (Opcional)
              </Label>
              <Select
                value={form.proyectoId}
                onValueChange={(v) => setForm((f) => ({ ...f, proyectoId: v }))}
              >
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
          )}

          {(modo === "editar" || sinProyecto) && (
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2 col-span-2 sm:col-span-1">
                <Label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                  Empresa *
                </Label>
                <Select
                  value={form.empresaId}
                  onValueChange={handleEmpresaChange}
                  disabled={modo === "crear" && !!empresaFija}
                >
                  <SelectTrigger className="h-11 bg-white/5 border-white/10 text-white rounded-xl disabled:opacity-50">
                    <SelectValue placeholder="Seleccionar empresa" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                    {empresas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2 col-span-2 sm:col-span-1">
                <Label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                  Subempresa *
                </Label>
                <Select
                  value={form.subempresaId}
                  onValueChange={(v) => setForm((f) => ({ ...f, subempresaId: v }))}
                  disabled={!form.empresaId}
                >
                  <SelectTrigger className="h-11 bg-white/5 border-white/10 text-white rounded-xl disabled:opacity-50">
                    <SelectValue placeholder="Seleccionar subempresa" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                    {subempresasFiltradas.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {modo === "editar" && empleado && (
            <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
              <Label className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                Proyectos asignados
              </Label>
              {proyectosAsignados.length === 0 ? (
                <p className="text-[11px] text-white/20 italic">
                  Sin asignaciones activas — banco de personal.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {proyectosAsignados.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <span className="text-xs text-white/80 truncate">{p.nombre}</span>
                      <button
                        type="button"
                        onClick={() => handleRetirarProyecto(p.id)}
                        disabled={retirandoId === p.id}
                        title="Retirar del proyecto"
                        className="flex h-8 w-8 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
                      >
                        {retirandoId === p.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {proyectosDisponiblesParaAsignar.length > 0 && (
                <div className="flex gap-2">
                  <Select value={proyectoParaAsignar} onValueChange={setProyectoParaAsignar}>
                    <SelectTrigger className="h-10 flex-1 bg-white/5 border-white/10 text-white rounded-xl">
                      <SelectValue placeholder="Asignar a proyecto" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-white/10 text-white">
                      {proyectosDisponiblesParaAsignar.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    onClick={handleAsignarProyecto}
                    disabled={!proyectoParaAsignar || asignando}
                    className="flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 text-[10px] font-bold uppercase tracking-widest text-white/70 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-50"
                  >
                    {asignando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Asignar"}
                  </button>
                </div>
              )}
            </div>
          )}

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
              {modo === "crear" ? (
                "Guardar Trabajador"
              ) : (
                <>
                  <Pencil className="h-3.5 w-3.5" /> Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
