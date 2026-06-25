import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

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

const STATUS_COLOR: Record<string, string> = {
  pendiente_pago: "text-accent",
  esperando_confirmacion: "text-accent",
  pagado: "text-green-700 dark:text-green-400",
  cancelado: "text-muted",
  enviado: "text-green-700 dark:text-green-400",
  entregado: "text-green-700 dark:text-green-400",
};

export default async function AdminOrdersPage() {
  const supabase = await createClient();

  const { data: orders } = await supabase
    .from("orders")
    .select(
      "id, status, total, payment_method, guest_name, guest_email, created_at"
    )
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="font-serif text-2xl font-semibold mb-6">Pedidos</h1>

      <div className="flex flex-col gap-2">
        {orders?.map((order) => (
          <Link
            key={order.id}
            href={`/admin/pedidos/${order.id}`}
            className="flex items-center gap-4 border border-border bg-surface rounded-xl p-3 hover:border-accent text-sm"
          >
            <div className="flex-1">
              <p className="font-medium">#{order.id.slice(0, 8)}</p>
              <p className="text-muted text-xs">
                {order.guest_name ?? "Cliente registrado"} ·{" "}
                {new Date(order.created_at).toLocaleDateString("es-AR")}
              </p>
            </div>
            <span className="text-xs">
              {order.payment_method === "mercado_pago"
                ? "Mercado Pago"
                : order.payment_method === "transferencia"
                ? "Transferencia"
                : "Efectivo"}
            </span>
            <span
              className={`text-xs font-medium ${STATUS_COLOR[order.status]}`}
            >
              {STATUS_LABEL[order.status] ?? order.status}
            </span>
            <span className="font-serif font-semibold">
              {formatPrice(order.total)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
