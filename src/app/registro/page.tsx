"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    if (!data.session) {
      setNeedsConfirmation(true);
      return;
    }

    router.push("/cuenta");
    router.refresh();
  }

  if (needsConfirmation) {
    return (
      <main className="max-w-md mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-2">Confirmá tu email</h1>
        <p className="text-neutral-600 text-sm">
          Te enviamos un link de confirmación a <strong>{email}</strong>.
          Abrilo para activar tu cuenta y después iniciá sesión.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Crear cuenta</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Nombre completo</label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="border border-neutral-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border border-neutral-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Contraseña</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border border-neutral-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white rounded-md px-6 py-3 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Creando cuenta..." : "Crear cuenta"}
        </button>
      </form>

      <p className="text-sm text-neutral-600 mt-4">
        ¿Ya tenés cuenta?{" "}
        <Link href="/login" className="underline">
          Iniciar sesión
        </Link>
      </p>
    </main>
  );
}
