import { redirect } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams?: { error?: string };
};

async function signIn(formData: FormData): Promise<void> {
  "use server";

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/proyectos");
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <div className="flex min-h-screen bg-actium-graphite">
      {/* Panel izquierdo — hero */}
      <div
        className="relative hidden w-[55%] flex-col justify-between overflow-hidden lg:flex"
        style={{
          background:
            "linear-gradient(135deg, #1a1208 0%, #282828 50%, #1a1208 100%)",
        }}
      >
        {/* Grid técnico sutil */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "linear-gradient(#F25C05 1px, transparent 1px), linear-gradient(90deg, #F25C05 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Líneas diagonales — sensación de estructura metálica */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 top-0 h-[120%] w-1 rotate-[20deg] bg-gradient-to-b from-transparent via-actium-orange/10 to-transparent" />
          <div className="absolute left-32 top-0 h-[120%] w-px rotate-[20deg] bg-gradient-to-b from-transparent via-actium-orange/10 to-transparent" />
          <div className="absolute left-64 top-0 h-[120%] w-1 rotate-[20deg] bg-gradient-to-b from-transparent via-actium-orange/10 to-transparent" />
          <div className="absolute right-0 top-0 h-[120%] w-px rotate-[20deg] bg-gradient-to-b from-transparent via-actium-orange/10 to-transparent" />
        </div>

        {/* Marca — símbolo blanco + logotipo en Ancorli */}
        <div className="relative flex items-center gap-2.5 p-12 pb-0">
          <Image
            src="/logo-actium-mark.png"
            alt="Actium"
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />
          <span className="font-display text-lg tracking-widest text-actium-seashell">
            Actium
          </span>
        </div>

        <div className="relative mt-auto p-12 pb-14">
          <h2 className="font-display mb-3 text-5xl xl:text-6xl leading-tight text-actium-seashell">
            Damos vida al acero
          </h2>
          <p className="mb-10 max-w-sm text-sm leading-relaxed text-[--text-secondary]">
            Somos expertos en procesos soldables de alta complejidad.
          </p>

          <div className="flex items-center gap-4">
            <p className="font-display text-5xl text-actium-orange">+16</p>
            <div className="border-l border-white/10 pl-4 py-1">
              <p className="font-subtitle text-xs uppercase tracking-wider text-actium-orange font-semibold">Años</p>
              <p className="font-sans text-[10px] xl:text-[11px] uppercase tracking-wider text-actium-seashell/40 mt-0.5">De experiencia</p>
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="flex flex-1 flex-col items-center justify-center bg-actium-graphite px-8 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-actium-orange shadow-actium">
              <Image
                src="/logo-actium-mark.png"
                alt="Actium"
                width={24}
                height={24}
                className="h-6 w-6 object-contain"
              />
            </div>
            <span className="font-display text-xl tracking-widest text-actium-seashell">
              ACTIUM
            </span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <h1 className="font-display text-3xl text-actium-seashell">Bienvenido de nuevo</h1>
            <p className="mt-2 text-sm leading-relaxed text-[--text-secondary]">
              Ingrese sus credenciales para acceder a la plataforma de gestión de infraestructura.
            </p>
          </div>

          <LoginForm error={searchParams?.error} action={signIn} />

          <div className="my-7 border-t border-[--border-subtle]" />

          <p className="mb-5 text-center text-sm text-[--text-secondary]">
            ¿No tiene una cuenta corporativa?{" "}
            <button className="font-semibold text-actium-orange transition-colors hover:text-actium-orange-hover">
              Solicitar acceso
            </button>
          </p>

          <div className="mb-6 flex justify-center gap-6 text-xs text-[--text-muted]">
            <button className="transition-colors hover:text-[--text-secondary]">Términos de servicio</button>
            <button className="transition-colors hover:text-[--text-secondary]">Política de privacidad</button>
          </div>

          <p className="text-center text-xs text-[--text-muted]">
            © 2026 Actium Industrial S.A.S. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </div>
  );
}
