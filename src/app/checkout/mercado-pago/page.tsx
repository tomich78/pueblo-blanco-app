"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function MercadoPagoRedirect() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setError("Pedido no encontrado.");
      return;
    }

    fetch("/api/mercadopago/create-preference", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("No pudimos iniciar el pago.");
        return res.json();
      })
      .then((data) => {
        window.location.href = data.initPoint;
      })
      .catch(() => {
        setError(
          "No pudimos iniciar el pago con Mercado Pago. Probá de nuevo."
        );
      });
  }, [orderId]);

  return (
    <main className="max-w-lg mx-auto px-4 py-16 text-center">
      <h1 className="font-serif text-2xl font-semibold mb-2">
        {error ? "Algo salió mal" : "Redirigiendo a Mercado Pago..."}
      </h1>
      <p className="text-muted text-sm">
        {error ?? "Te llevamos al checkout seguro de Mercado Pago."}
      </p>
    </main>
  );
}

export default function MercadoPagoRedirectPage() {
  return (
    <Suspense fallback={null}>
      <MercadoPagoRedirect />
    </Suspense>
  );
}
