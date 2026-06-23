"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RecoverPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recuperar/nueva-clave`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <main className="max-w-md mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold mb-2">Revisá tu email</h1>
        <p className="text-neutral-600 text-sm">
          Te enviamos un link para restablecer tu contraseña.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-2">Recuperar contraseña</h1>
      <p className="text-neutral-600 text-sm mb-6">
        Te enviamos un link a tu email para que puedas crear una nueva
        contraseña.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="bg-black text-white rounded-md px-6 py-3 text-sm font-medium disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Enviar link"}
        </button>
      </form>
    </main>
  );
}
