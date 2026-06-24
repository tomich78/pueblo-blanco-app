import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { UploadProofForm } from "@/components/UploadProofForm";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

const STATUS_LABEL: Record<string, string> = {
  pendiente_pago: "Pendiente de pago",
  esperando_confirmacion: "Esperando confirmación",
  pagado: "Pagado",
  cancelado: "Cancelado",
  enviado: "Enviado",
  entregado: "Entregado",
};

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, status, total, payment_method, delivery_method, shipping_address, payment_proof_url, created_at, order_items(quantity, unit_price, books(title))"
    )
    .eq("id", id)
    .single();

  if (!order) notFound();

  type Item = {
    quantity: number;
    unit_price: number;
    books: { title: string }[] | { title: string } | null;
  };

  const items = order.order_items as unknown as Item[];

  return (
    <main className="max-w-lg mx-auto px-4 py-16">
      <div className="text-center mb-6">
        <h1 className="font-serif text-2xl font-semibold mb-2">
          ¡Pedido recibido!
        </h1>
        <p className="text-muted text-sm">
          Pedido #{order.id.slice(0, 8)} ·{" "}
          {STATUS_LABEL[order.status] ?? order.status}
        </p>
      </div>

      <div className="border border-border bg-surface rounded-xl p-4 mb-6">
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
        <div className="flex justify-between mt-3 pt-3 border-t border-border font-medium">
          <span>Total</span>
          <span className="font-serif">{formatPrice(order.total)}</span>
        </div>
      </div>

      {order.delivery_method && (
        <div className="border border-border bg-surface rounded-xl p-4 mb-6 text-sm">
          <p className="font-medium mb-1">
            {order.delivery_method === "envio" ? "Envío" : "Retiro"}
          </p>
          {order.delivery_method === "envio" ? (
            <>
              <p className="text-muted">{order.shipping_address}</p>
              <p className="text-muted mt-1">
                El envío está a cargo del comprador. Nos vamos a comunicar
                para coordinarlo.
              </p>
            </>
          ) : (
            <p className="text-muted">
              Coordinamos por email/teléfono el retiro.
            </p>
          )}
        </div>
      )}

      {order.payment_method === "transferencia" &&
        order.status === "pendiente_pago" && (
          <div className="border border-border bg-surface rounded-xl p-4 text-sm mb-6">
            <p className="font-medium mb-3">Pagá por transferencia:</p>
            <dl className="flex flex-col gap-1 text-muted mb-3">
              <div className="flex justify-between">
                <dt>Alias</dt>
                <dd className="font-medium text-foreground">
                  mariavictoria.fema
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>CBU</dt>
                <dd className="font-medium text-foreground">
                  4530000800011590786317
                </dd>
              </div>
              <div className="flex justify-between">
                <dt>Banco/billetera</dt>
                <dd className="font-medium text-foreground">Naranja X</dd>
              </div>
              <div className="flex justify-between">
                <dt>Titular</dt>
                <dd className="font-medium text-foreground">
                  María Victoria Femayor
                </dd>
              </div>
            </dl>
            <p className="text-muted mb-4">
              Una vez que hagas la transferencia, subí el comprobante. La
              compra se confirma cuando lo revisemos.
            </p>
            <UploadProofForm orderId={order.id} />
          </div>
        )}

      {order.payment_method === "efectivo" &&
        order.status === "pendiente_pago" && (
          <p className="text-sm text-muted text-center">
            Te vamos a contactar para coordinar el pago en efectivo.
          </p>
        )}

      {order.payment_method === "mercado_pago" &&
        order.status === "pendiente_pago" && (
          <p className="text-sm text-muted text-center">
            Estamos procesando tu pago con Mercado Pago.
          </p>
        )}

      {order.status === "esperando_confirmacion" && (
        <p className="text-sm text-accent text-center font-medium">
          Recibimos tu comprobante. Te confirmamos el pago a la brevedad.
        </p>
      )}

      {order.status === "pagado" && (
        <p className="text-sm text-green-700 text-center font-medium">
          Pago confirmado. ¡Gracias por tu compra!
        </p>
      )}
    </main>
  );
}
