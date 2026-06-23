"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2 } from "lucide-react";
import { crearSubempresaAction } from "@/lib/actions/admin";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-actium-orange focus:outline-none focus:ring-1 focus:ring-actium-orange/30 [&>option]:bg-[#1A1A1A] [&>option]:text-white";
const labelClass = "block text-xs font-medium text-white/50 mb-1.5";

type EmpresaOption = { id: string; nombre: string };

export function CrearSubempresaModal({ empresas }: { empresas: EmpresaOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const input = {
      empresaId: String(fd.get("empresaId") ?? "").trim(),
      nombre: String(fd.get("nombre") ?? "").trim(),
      nit: String(fd.get("nit") ?? "").trim() || undefined,
      descripcion: String(fd.get("descripcion") ?? "").trim() || undefined,
    };

    startTransition(async () => {
      try {
        await crearSubempresaAction(input);
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "No fue posible crear la subempresa.");
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
        Nueva Subempresa
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isPending && setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-actium border border-white/10 bg-[#1A1A1A] p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="font-sans text-lg font-semibold text-white">Nueva subempresa</h3>
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
                  <label className={labelClass}>Empresa *</label>
                  <select name="empresaId" required defaultValue="" className={inputClass}>
                    <option value="" disabled>
                      Seleccione una empresa
                    </option>
                    {empresas.map((empresa) => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Nombre *</label>
                  <input
                    name="nombre"
                    required
                    minLength={2}
                    className={inputClass}
                    placeholder="Razón social de la subempresa"
                  />
                </div>
                <div>
                  <label className={labelClass}>NIT</label>
                  <input name="nit" className={inputClass} placeholder="900123456-7" />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Descripción</label>
                  <input name="descripcion" className={inputClass} placeholder="Detalle opcional" />
                </div>
              </div>

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
                  Crear subempresa
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
