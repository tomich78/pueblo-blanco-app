"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

const INPUT =
  "border border-border bg-surface rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/cuenta";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(
        error.message.toLowerCase().includes("confirm")
          ? "Todavía no confirmaste tu email. Revisá tu casilla de entrada."
          : "Email o contraseña incorrectos."
      );
      return;
    }

    router.push(returnTo);
    router.refresh();
  }

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-serif text-2xl font-semibold mb-6">
        Iniciar sesión
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={INPUT}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Contraseña</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT}
          />
        </div>

        {error && <p className="text-sm text-accent">{error}</p>}

        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? "Ingresando..." : "Ingresar"}
        </Button>
      </form>

      <div className="flex justify-between text-sm text-muted mt-5">
        <Link
          href={`/registro${returnTo !== "/cuenta" ? `?returnTo=${encodeURIComponent(returnTo)}` : ""}`}
          className="hover:text-accent"
        >
          Crear cuenta
        </Link>
        <Link href="/recuperar" className="hover:text-accent">
          Olvidé mi contraseña
        </Link>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
