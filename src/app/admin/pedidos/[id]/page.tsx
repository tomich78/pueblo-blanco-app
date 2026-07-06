import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { OrderStatusControls } from "@/components/admin/OrderStatusControls";
import { DeleteOrderButton } from "@/components/admin/DeleteOrderButton";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, status, total, payment_method, delivery_method, shipping_address, payment_proof_url, guest_name, guest_email, guest_phone, created_at, order_items(id, quantity, unit_price, books(title, author))"
    )
    .eq("id", id)
    .single();

  if (!order) notFound();

  type RawItem = {
    id: string;
    quantity: number;
    unit_price: number;
    books: { title: string; author: string }[] | { title: string; author: string } | null;
  };

  const orderItemIds = (order.order_items as unknown as RawItem[]).map((i) => i.id);

  const { data: itemCajas } = orderItemIds.length
    ? await supabase
        .from("order_item_cajas")
        .select("order_item_id, caja, cantidad")
        .in("order_item_id", orderItemIds)
    : { data: [] };

  const cajasPorItem = new Map<string, { caja: string; cantidad: number }[]>();
  for (const c of itemCajas ?? []) {
    const list = cajasPorItem.get(c.order_item_id) ?? [];
    list.push({ caja: c.caja, cantidad: c.cantidad });
    cajasPorItem.set(c.order_item_id, list);
  }

  const items = order.order_items as unknown as RawItem[];

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-2">
        <h1 className="font-serif text-2xl font-semibold">
          Pedido #{order.id.slice(0, 8)}
        </h1>
        <DeleteOrderButton orderId={order.id} status={order.status} />
      </div>
      <p className="text-sm text-muted mb-6">
        {new Date(order.created_at).toLocaleString("es-AR")}
      </p>

      <div className="border border-border bg-surface rounded-xl p-4 mb-4 text-sm">
        <p className="font-medium mb-1">Cliente</p>
        <p className="text-muted">{order.guest_name ?? "Cliente registrado"}</p>
        {order.guest_email && <p className="text-muted">{order.guest_email}</p>}
        {order.guest_phone && <p className="text-muted">{order.guest_phone}</p>}
      </div>

      <div className="border border-border bg-surface rounded-xl p-4 mb-4">
        <ul className="flex flex-col gap-3 text-sm">
          {items.map((item, i) => {
            const book = Array.isArray(item.books) ? item.books[0] : item.books;
            const cajas = cajasPorItem.get(item.id) ?? [];
            return (
              <li key={i}>
                <div className="flex justify-between">
                  <span>
                    {item.quantity}x {book?.title ?? "Libro"}
                  </span>
                  <span>{formatPrice(item.unit_price * item.quantity)}</span>
                </div>
                {cajas.length > 0 && (
                  <p className="text-xs text-muted mt-0.5">
                    {cajas.map((c) => `Caja ${c.caja} (${c.cantidad})`).join(", ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <div className="flex justify-between mt-3 pt-3 border-t border-border font-medium text-sm">
          <span>Total</span>
          <span className="font-serif">{formatPrice(order.total)}</span>
        </div>
      </div>

      <div className="text-sm mb-2">
        Método de pago:{" "}
        <strong>
          {order.payment_method === "mercado_pago"
            ? "Mercado Pago"
            : order.payment_method === "transferencia"
            ? "Transferencia"
            : "Efectivo"}
        </strong>
      </div>

      {order.delivery_method && (
        <div className="text-sm mb-4">
          Entrega:{" "}
          <strong>
            {order.delivery_method === "envio"
              ? `Envío — ${order.shipping_address}`
              : "Retiro"}
          </strong>
        </div>
      )}

      {order.payment_proof_url && (
        <div className="border border-border bg-surface rounded-xl p-4 mb-4 text-sm">
          <p className="font-medium mb-2">Comprobante de transferencia</p>
          <a
            href={order.payment_proof_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent hover:underline"
          >
            Ver comprobante
          </a>
        </div>
      )}

      <OrderStatusControls orderId={order.id} currentStatus={order.status} />
    </div>
  );
}
