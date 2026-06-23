import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { OrderStatusControls } from "@/components/admin/OrderStatusControls";

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
      "id, status, total, payment_method, guest_name, guest_email, guest_phone, created_at, order_items(quantity, unit_price, books(title, author))"
    )
    .eq("id", id)
    .single();

  if (!order) notFound();

  type Item = {
    quantity: number;
    unit_price: number;
    books: { title: string; author: string }[] | { title: string; author: string } | null;
  };

  const items = order.order_items as unknown as Item[];

  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-2xl font-semibold mb-2">
        Pedido #{order.id.slice(0, 8)}
      </h1>
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
        <ul className="flex flex-col gap-2 text-sm">
          {items.map((item, i) => {
            const book = Array.isArray(item.books) ? item.books[0] : item.books;
            return (
              <li key={i} className="flex justify-between">
                <span>
                  {item.quantity}x {book?.title ?? "Libro"}
                </span>
                <span>{formatPrice(item.unit_price * item.quantity)}</span>
              </li>
            );
          })}
        </ul>
        <div className="flex justify-between mt-3 pt-3 border-t border-border font-medium text-sm">
          <span>Total</span>
          <span className="font-serif">{formatPrice(order.total)}</span>
        </div>
      </div>

      <div className="text-sm mb-4">
        Método de pago:{" "}
        <strong>
          {order.payment_method === "mercado_pago"
            ? "Mercado Pago"
            : "Efectivo/transferencia"}
        </strong>
      </div>

      <OrderStatusControls orderId={order.id} currentStatus={order.status} />
    </div>
  );
}
