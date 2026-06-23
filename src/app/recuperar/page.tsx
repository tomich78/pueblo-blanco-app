"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

const INPUT =
  "border border-border bg-surface rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent";

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
      <main className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-semibold mb-2">
          Revisá tu email
        </h1>
        <p className="text-muted text-sm">
          Te enviamos un link para restablecer tu contraseña.
        </p>
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-serif text-2xl font-semibold mb-2">
        Recuperar contraseña
      </h1>
      <p className="text-muted text-sm mb-6">
        Te enviamos un link a tu email para que puedas crear una nueva
        contraseña.
      </p>

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

        {error && <p className="text-sm text-accent">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Enviando..." : "Enviar link"}
        </Button>
      </form>
    </main>
  );
}
