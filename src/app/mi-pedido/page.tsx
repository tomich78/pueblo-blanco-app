"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

const INPUT =
  "border border-border bg-surface rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent";

export default function MiPedidoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");

  // Si el mail trae ?id=UUID-completo, redirigimos directo
  useEffect(() => {
    const idParam = searchParams.get("id");
    if (idParam) {
      setOrderId(idParam);
    }
  }, [searchParams]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const trimmed = orderId.trim().replace(/^#/, "");

    // Si es UUID completo, buscar directo; si son 8 chars, buscar por prefijo
    const isFullUuid = trimmed.length > 8;
    const query = supabase.from("orders").select("id, guest_email");
    const { data: order } = isFullUuid
      ? await query.eq("id", trimmed).maybeSingle()
      : await query.ilike("id", `${trimmed}%`).maybeSingle();

    setLoading(false);

    if (!order) {
      setError("No encontramos un pedido con ese número.");
      return;
    }

    if (
      order.guest_email &&
      order.guest_email.toLowerCase() !== email.trim().toLowerCase()
    ) {
      setError("El email no coincide con el del pedido.");
      return;
    }

    router.push(`/pedido/${order.id}`);
  }

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <h1 className="font-serif text-2xl font-semibold mb-2">Mi pedido</h1>
      <p className="text-sm text-muted mb-6">
        Ingresá el número de pedido y el email que usaste para comprar.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Número de pedido</label>
          <input
            type="text"
            required
            placeholder="Lo encontrás en el email de confirmación"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className={INPUT}
          />
        </div>

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

        <Button type="submit" disabled={loading} className="w-full mt-2">
          {loading ? "Buscando..." : "Ver mi pedido"}
        </Button>
      </form>
    </main>
  );
}
