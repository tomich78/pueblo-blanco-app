"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/Button";

const STATUSES = [
  { value: "pendiente_pago", label: "Pendiente de pago" },
  { value: "esperando_confirmacion", label: "Esperando confirmación" },
  { value: "pagado", label: "Pagado" },
  { value: "enviado", label: "Enviado" },
  { value: "entregado", label: "Entregado" },
  { value: "cancelado", label: "Cancelado" },
];

export function OrderStatusControls({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    if (status === "pagado" && currentStatus !== "pagado") {
      const { data: items } = await supabase
        .from("order_items")
        .select("book_id, quantity")
        .eq("order_id", orderId);

      for (const item of items ?? []) {
        await supabase.rpc("decrement_book_stock", {
          p_book_id: item.book_id,
          p_quantity: item.quantity,
        });
      }
    }

    if (status === "cancelado" && currentStatus === "pagado") {
      const { data: items } = await supabase
        .from("order_items")
        .select("book_id, quantity")
        .eq("order_id", orderId);

      for (const item of items ?? []) {
        await supabase.rpc("increment_book_stock", {
          p_book_id: item.book_id,
          p_quantity: item.quantity,
        });
      }
    }

    await supabase.from("orders").update({ status }).eq("id", orderId);

    if (status === "pagado" && currentStatus !== "pagado") {
      fetch(`/api/pedidos/${orderId}/notificar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "pago_confirmado" }),
      }).catch(() => {});
    }

    setSaving(false);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="border border-border bg-surface rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent"
      >
        {STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <Button
        onClick={handleSave}
        disabled={saving || status === currentStatus}
      >
        {saving ? "Guardando..." : "Actualizar estado"}
      </Button>
    </div>
  );
}
