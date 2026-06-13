"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { crearUsuarioAction } from "@/lib/actions/admin";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-actium-orange focus:outline-none focus:ring-1 focus:ring-actium-orange/30";
const labelClass = "block text-xs font-medium text-white/50 mb-1.5";

const ROLES: { value: string; label: string }[] = [
  { value: "super_admin", label: "Super administrador" },
  { value: "admin", label: "Administrador" },
  { value: "cliente_principal", label: "Cliente principal" },
  { value: "subcliente", label: "Subcliente" },
  { value: "sst", label: "SST" },
  { value: "operativo", label: "Operativo" },
  { value: "financiero", label: "Financiero" },
];

type Props = {
  empresas: { id: string; nombre: string }[];
};

export function CrearUsuarioModal({ empresas }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const empresaId = String(fd.get("empresaId") ?? "").trim();
    const input = {
      email: String(fd.get("email") ?? "").trim(),
      nombre: String(fd.get("nombre") ?? "").trim(),
      password: String(fd.get("password") ?? ""),
      rol: String(fd.get("rol") ?? "operativo") as never,
      empresaId: empresaId || null,
      telefono: String(fd.get("telefono") ?? "").trim() || undefined,
      cedula: String(fd.get("cedula") ?? "").trim() || undefined,
      cargo: String(fd.get("cargo") ?? "").trim() || undefined,
    };

    startTransition(async () => {
      try {
        await crearUsuarioAction(input);
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No fue posible crear el usuario.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-2 rounded-xl bg-actium-orange px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-actium-orange-hover"
      >
        <Plus className="h-4 w-4" strokeWidth={1.5} />
        Nuevo usuario
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isPending && setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-actium border border-white/10 bg-[#1A1A1A] p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-sans text-lg font-semibold text-white">Nuevo usuario</h3>
              <button
                type="button"
                onClick={() => !isPending && setOpen(false)}
                className="text-white/40 transition-colors hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelClass}>Nombre completo *</label>
                  <input name="nombre" required minLength={2} className={inputClass} placeholder="Nombre y apellido" />
                </div>
                <div>
                  <label className={labelClass}>Correo *</label>
                  <input name="email" type="email" required className={inputClass} placeholder="usuario@empresa.com" />
                </div>
                <div>
                  <label className={labelClass}>Contraseña temporal *</label>
                  <input
                    name="password"
                    type="text"
                    required
                    minLength={8}
                    className={inputClass}
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
                <div>
                  <label className={labelClass}>Rol *</label>
                  <select name="rol" required defaultValue="operativo" className={inputClass}>
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value} className="bg-[#1A1A1A]">
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Empresa</label>
                  <select name="empresaId" defaultValue="" className={inputClass}>
                    <option value="" className="bg-[#1A1A1A]">
                      Sin empresa
                    </option>
                    {empresas.map((e) => (
                      <option key={e.id} value={e.id} className="bg-[#1A1A1A]">
                        {e.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Cédula</label>
                  <input name="cedula" className={inputClass} placeholder="Documento" />
                </div>
                <div>
                  <label className={labelClass}>Teléfono</label>
                  <input name="telefono" className={inputClass} placeholder="+57 ..." />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Cargo</label>
                  <input name="cargo" className={inputClass} placeholder="Ej. Supervisor de obra" />
                </div>
              </div>

              <p className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-white/30">
                El usuario queda activo de inmediato. Comparta la contraseña temporal por un canal seguro; el usuario debe cambiarla en su primer ingreso.
              </p>

              {error ? (
                <p className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {error}
                </p>
              ) : null}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => !isPending && setOpen(false)}
                  className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-actium-orange px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-actium-orange-hover disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Crear usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
