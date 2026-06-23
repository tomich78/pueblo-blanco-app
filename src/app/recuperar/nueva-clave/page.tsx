"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

const INPUT =
  "border border-border bg-surface rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent";

export default function NewPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push("/cuenta");
  }

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-serif text-2xl font-semibold mb-6">
        Nueva contraseña
      </h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Nueva contraseña</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT}
          />
        </div>

        {error && <p className="text-sm text-accent">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Guardando..." : "Guardar contraseña"}
        </Button>
      </form>
    </main>
  );
}
