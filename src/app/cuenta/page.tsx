import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/LogoutButton";
import Link from "next/link";

const STATUS_LABEL: Record<string, string> = {
  pendiente_pago: "Pendiente de pago",
  pagado: "Pagado",
  cancelado: "Cancelado",
  enviado: "Enviado",
  entregado: "Entregado",
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

export default async function AccountPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, is_admin")
    .eq("id", userData.user.id)
    .single();

  const { data: orders } = await supabase
    .from("orders")
    .select("id, status, total, created_at, payment_method")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl font-semibold">
            Hola, {profile?.full_name || userData.user.email}
          </h1>
          <p className="text-sm text-muted">{userData.user.email}</p>
        </div>
        <LogoutButton />
      </div>

      {profile?.is_admin && (
        <Link
          href="/admin"
          className="block mb-6 text-sm font-medium text-accent hover:underline"
        >
          Ir al panel admin →
        </Link>
      )}

      <h2 className="font-medium mb-3">Mis pedidos</h2>

      {orders && orders.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li
              key={order.id}
              className="border border-border bg-surface rounded-xl p-3 flex justify-between items-center text-sm"
            >
              <div>
                <p className="font-medium">
                  Pedido #{order.id.slice(0, 8)}
                </p>
                <p className="text-muted">
                  {new Date(order.created_at).toLocaleDateString("es-AR")} ·{" "}
                  {STATUS_LABEL[order.status] ?? order.status}
                </p>
              </div>
              <span className="font-serif font-semibold">
                {formatPrice(order.total)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">Todavía no hiciste pedidos.</p>
      )}
    </main>
  );
}
