"use client";

import { useEffect, useState } from "react";
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

type Caja = { caja: string; cantidad: number };

type ItemConCajas = {
  orderItemId: string;
  bookId: string;
  title: string;
  quantity: number;
  cajas: Caja[];
  asignacion: Record<string, number>; // caja -> cantidad asignada
};

function autoAsignar(cajas: Caja[], cantidad: number): Record<string, number> {
  const asignacion: Record<string, number> = {};
  let restante = cantidad;
  for (const c of [...cajas].sort((a, b) => b.cantidad - a.cantidad)) {
    if (restante <= 0) break;
    const toma = Math.min(c.cantidad, restante);
    if (toma > 0) {
      asignacion[c.caja] = toma;
      restante -= toma;
    }
  }
  return asignacion;
}

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
  const [items, setItems] = useState<ItemConCajas[] | null>(null);
  const [loadingItems, setLoadingItems] = useState(false);

  const necesitaAsignarCajas = status === "pagado" && currentStatus !== "pagado";

  useEffect(() => {
    if (!necesitaAsignarCajas) {
      setItems(null);
      return;
    }

    let cancelled = false;
    setLoadingItems(true);

    (async () => {
      const supabase = createClient();

      const { data: orderItems } = await supabase
        .from("order_items")
        .select("id, book_id, quantity, books(title)")
        .eq("order_id", orderId);

      if (!orderItems || cancelled) {
        setLoadingItems(false);
        return;
      }

      const result: ItemConCajas[] = [];
      for (const item of orderItems) {
        const book = Array.isArray(item.books) ? item.books[0] : item.books;
        const { data: ubicaciones } = await supabase
          .from("ubicaciones")
          .select("caja, cantidad")
          .eq("producto_id", item.book_id)
          .gt("cantidad", 0);

        const cajas = ubicaciones ?? [];
        result.push({
          orderItemId: item.id,
          bookId: item.book_id,
          title: book?.title ?? "Libro",
          quantity: item.quantity,
          cajas,
          asignacion: autoAsignar(cajas, item.quantity),
        });
      }

      if (!cancelled) {
        setItems(result);
        setLoadingItems(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [necesitaAsignarCajas, orderId]);

  function setAsignacion(orderItemId: string, caja: string, cantidad: number) {
    setItems((prev) =>
      prev?.map((it) =>
        it.orderItemId === orderItemId
          ? { ...it, asignacion: { ...it.asignacion, [caja]: cantidad } }
          : it
      ) ?? null
    );
  }

  function totalAsignado(item: ItemConCajas) {
    return Object.values(item.asignacion).reduce((a, b) => a + b, 0);
  }

  const asignacionIncompleta =
    necesitaAsignarCajas &&
    (!items || items.some((it) => totalAsignado(it) !== it.quantity));

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();

    if (necesitaAsignarCajas && items) {
      for (const item of items) {
        for (const [caja, cantidad] of Object.entries(item.asignacion)) {
          if (cantidad <= 0) continue;
          await supabase.rpc("decrement_ubicacion_stock", {
            p_producto_id: item.bookId,
            p_caja: caja,
            p_cantidad: cantidad,
          });
          await supabase.from("order_item_cajas").insert({
            order_item_id: item.orderItemId,
            caja,
            cantidad,
          });
        }
      }
    }

    if (status === "cancelado") {
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("id, book_id")
        .eq("order_id", orderId);

      for (const item of orderItems ?? []) {
        const { data: cajas } = await supabase
          .from("order_item_cajas")
          .select("id, caja, cantidad")
          .eq("order_item_id", item.id);

        for (const c of cajas ?? []) {
          await supabase.rpc("increment_ubicacion_stock", {
            p_producto_id: item.book_id,
            p_caja: c.caja,
            p_cantidad: c.cantidad,
          });
          await supabase.from("order_item_cajas").delete().eq("id", c.id);
        }
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
    <div className="flex flex-col gap-4">
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
          disabled={saving || status === currentStatus || asignacionIncompleta}
        >
          {saving ? "Guardando..." : "Actualizar estado"}
        </Button>
      </div>

      {necesitaAsignarCajas && loadingItems && (
        <p className="text-sm text-muted">Buscando ubicación de los libros...</p>
      )}

      {necesitaAsignarCajas && items && items.length > 0 && (
        <div className="border border-border bg-surface rounded-xl p-4 text-sm">
          <p className="font-medium mb-3">De dónde sale cada libro</p>
          <div className="flex flex-col gap-4">
            {items.map((item) => (
              <div key={item.orderItemId}>
                <p className="font-medium mb-1">
                  {item.title} — {item.quantity} unidad(es)
                </p>

                {item.cajas.length <= 1 ? (
                  <p className="text-muted">
                    {item.cajas.length === 1
                      ? `Caja ${item.cajas[0].caja} (${item.cajas[0].cantidad} disponibles)`
                      : "Sin caja registrada"}
                  </p>
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5">
                      {item.cajas.map((c) => (
                        <div key={c.caja} className="flex items-center gap-2">
                          <span className="flex-1 text-muted">
                            Caja {c.caja} ({c.cantidad} disponibles)
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={c.cantidad}
                            value={item.asignacion[c.caja] ?? 0}
                            onChange={(e) =>
                              setAsignacion(
                                item.orderItemId,
                                c.caja,
                                Math.max(
                                  0,
                                  Math.min(c.cantidad, parseInt(e.target.value, 10) || 0)
                                )
                              )
                            }
                            className="w-16 border border-border rounded-lg px-2 py-1 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                    <p
                      className={`text-xs mt-1 ${
                        totalAsignado(item) === item.quantity
                          ? "text-muted"
                          : "text-accent"
                      }`}
                    >
                      Asignado: {totalAsignado(item)} / {item.quantity}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
