import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

export default async function OrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, status, total, payment_method, created_at")
    .eq("id", id)
    .single();

  if (!order) notFound();

  return (
    <main className="max-w-lg mx-auto px-4 py-16 text-center">
      <h1 className="font-serif text-2xl font-semibold mb-2">
        ¡Pedido recibido!
      </h1>
      <p className="text-muted text-sm mb-6">
        Pedido #{order.id.slice(0, 8)} · {formatPrice(order.total)}
      </p>

      {order.payment_method === "efectivo_transferencia" ? (
        <div className="border border-border bg-surface rounded-xl p-4 text-sm text-left">
          <p className="font-medium mb-2">
            Pagá en efectivo o por transferencia:
          </p>
          <p className="text-muted">
            Te vamos a contactar para coordinar el pago. Una vez confirmado,
            tu pedido pasa a estado &quot;Pagado&quot;.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">
          Estamos procesando tu pago con Mercado Pago.
        </p>
      )}
    </main>
  );
}
