import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { OrderStatusControls } from "@/components/admin/OrderStatusControls";
import { DeleteOrderButton } from "@/components/admin/DeleteOrderButton";
import { CambiarCajaButton } from "@/components/admin/CambiarCajaButton";

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
      "id, status, total, payment_method, delivery_method, shipping_address, payment_proof_url, guest_name, guest_email, guest_phone, created_at, order_items(id, book_id, quantity, unit_price, books(title, author, cover_url))"
    )
    .eq("id", id)
    .single();

  if (!order) notFound();

  type RawItem = {
    id: string;
    book_id: string;
    quantity: number;
    unit_price: number;
    books: { title: string; author: string; cover_url: string | null }[] | { title: string; author: string; cover_url: string | null } | null;
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
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 flex-1">
                    {book?.cover_url ? (
                      <a href={book.cover_url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={book.cover_url}
                          alt={book.title}
                          className="w-10 h-14 object-cover rounded border border-border hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ) : (
                      <div className="w-10 h-14 bg-border rounded shrink-0 flex items-center justify-center">
                        <span className="text-[8px] text-muted">Sin portada</span>
                      </div>
                    )}
                    <span className="pt-1">{item.quantity}x {book?.title ?? "Libro"}</span>
                  </div>
                  <span className="shrink-0">{formatPrice(item.unit_price * item.quantity)}</span>
                </div>
                {cajas.length > 0 && (
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-muted">
                      {cajas.map((c) => `Caja ${c.caja} (${c.cantidad})`).join(", ")}
                    </p>
                    {order.status === "pagado" && (
                      <CambiarCajaButton
                        orderItemId={item.id}
                        bookId={item.book_id}
                        quantity={item.quantity}
                        cajasActuales={cajas}
                      />
                    )}
                  </div>
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
