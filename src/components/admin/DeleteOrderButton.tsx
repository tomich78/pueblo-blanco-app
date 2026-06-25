"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DeleteOrderButton({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("¿Eliminar este pedido? Esta acción no se puede deshacer.")) {
      return;
    }

    setDeleting(true);
    const supabase = createClient();

    if (status === "pagado") {
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("id, book_id")
        .eq("order_id", orderId);

      for (const item of orderItems ?? []) {
        const { data: cajas } = await supabase
          .from("order_item_cajas")
          .select("caja, cantidad")
          .eq("order_item_id", item.id);

        for (const c of cajas ?? []) {
          await supabase.rpc("increment_ubicacion_stock", {
            p_producto_id: item.book_id,
            p_caja: c.caja,
            p_cantidad: c.cantidad,
          });
        }
      }
    }

    const { error } = await supabase.from("orders").delete().eq("id", orderId);
    setDeleting(false);

    if (error) {
      alert("No pudimos eliminar el pedido.");
      return;
    }

    router.push("/admin/pedidos");
    router.refresh();
  }

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="text-sm text-accent hover:underline disabled:opacity-50"
    >
      {deleting ? "Eliminando..." : "Eliminar pedido"}
    </button>
  );
}
