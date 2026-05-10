"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginFormProps = {
  error?: string;
  action: (formData: FormData) => Promise<void>;
};

export function LoginForm({ error, action }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => action(formData));
  }

  const inputClass =
    "rounded-xl border border-[--border-default] bg-[--bg-secondary] px-4 py-2.5 pr-10 text-[--text-primary] placeholder:text-[--text-muted] focus-visible:border-actium-orange focus-visible:ring-2 focus-visible:ring-actium-orange/20 transition-all duration-200";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium text-[--text-secondary]">
          Correo electrónico
        </Label>
        <div className="relative">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="nombre@actium.com"
            required
            className={inputClass}
          />
          <Mail
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[--text-muted]"
            strokeWidth={1.5}
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password" className="text-sm font-medium text-[--text-secondary]">
            Contraseña
          </Label>
          <button
            type="button"
            className="text-xs font-medium text-actium-orange transition-colors hover:text-actium-orange-hover"
          >
            ¿Olvidó su contraseña?
          </button>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••••••"
            required
            className={inputClass}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[--text-muted] transition-colors hover:text-[--text-secondary]"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.5} />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>

      {/* Recordar */}
      <label className="flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          name="remember"
          className="h-4 w-4 rounded border-[--border-default] bg-[--bg-secondary] accent-actium-orange"
        />
        <span className="text-sm text-[--text-secondary]">Mantener sesión iniciada</span>
      </label>

      {/* Error */}
      {error ? (
        <p className="rounded-xl border border-danger/20 bg-danger/15 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-actium-orange py-3 text-sm font-semibold text-white shadow-actium transition-all duration-200 hover:bg-actium-orange-hover hover:shadow-actium-lg disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Ingresando..." : "Iniciar sesión"}
      </button>
    </form>
  );
}
