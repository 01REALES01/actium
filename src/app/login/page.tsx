import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoginMotion } from "./login-motion";
import { SubmitButton } from "./submit-button";

type LoginPageProps = {
  searchParams?: {
    error?: string;
  };
};

async function signIn(formData: FormData) {
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
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <LoginMotion>
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-500 text-white shadow-lg shadow-blue-500/20">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-normal">ACTIUM</h1>
            <p className="mt-1 text-sm text-slate-400">Portal de clientes</p>
          </div>
        </div>

        <Card className="border-white/10 bg-slate-900/90 text-slate-100 shadow-2xl">
          <CardHeader>
            <CardTitle>Iniciar sesion</CardTitle>
            <CardDescription className="text-slate-400">Accede con tu correo y contrasena asignados.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={signIn} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required className="border-white/10 bg-slate-950" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" name="password" type="password" autoComplete="current-password" required className="border-white/10 bg-slate-950" />
              </div>
              {searchParams?.error ? (
                <p className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">{searchParams.error}</p>
              ) : null}
              <SubmitButton />
            </form>
            <Button variant="link" className="mt-4 w-full text-slate-400">
              Soporte ACTIUM
            </Button>
          </CardContent>
        </Card>
      </LoginMotion>
    </main>
  );
}
