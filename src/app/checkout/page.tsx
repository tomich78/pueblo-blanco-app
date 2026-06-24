"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore, cartTotal, useCartHydrated } from "@/lib/cart-store";
import { createClient } from "@/lib/supabase/client";
import { Button, ButtonLink } from "@/components/Button";

const INPUT =
  "border border-border bg-surface rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-accent";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

type PaymentMethod = "mercado_pago" | "efectivo" | "transferencia";
type DeliveryMethod = "retiro" | "envio";
type Step = "auth" | "delivery" | "datos";

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const hasHydrated = useCartHydrated();
  const total = cartTotal(items);

  const [userId, setUserId] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [continuingAsGuest, setContinuingAsGuest] = useState(false);

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod | null>(null);
  const [address, setAddress] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mercado_pago");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
      setEmail(data.user?.email ?? "");
      setCheckingAuth(false);
    });
  }, []);

  useEffect(() => {
    if (hasHydrated && items.length === 0 && !loading) {
      router.replace("/carrito");
    }
  }, [hasHydrated, items.length, loading, router]);

  if (checkingAuth || !hasHydrated) return null;

  const step: Step =
    !userId && !continuingAsGuest
      ? "auth"
      : !deliveryMethod
      ? "delivery"
      : "datos";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        guest_name: userId ? null : name,
        guest_email: email,
        guest_phone: phone,
        status: "pendiente_pago",
        payment_method: paymentMethod,
        delivery_method: deliveryMethod,
        shipping_address: deliveryMethod === "envio" ? address : null,
        total,
      })
      .select()
      .single();

    if (orderError || !order) {
      setError("No pudimos crear el pedido. Probá de nuevo.");
      setLoading(false);
      return;
    }

    const { error: itemsError } = await supabase.from("order_items").insert(
      items.map((item) => ({
        order_id: order.id,
        book_id: item.bookId,
        quantity: item.quantity,
        unit_price: item.price,
      }))
    );

    if (itemsError) {
      setError("No pudimos guardar los libros del pedido. Probá de nuevo.");
      setLoading(false);
      return;
    }

    clear();

    fetch(`/api/pedidos/${order.id}/notificar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "confirmacion" }),
    }).catch(() => {});

    if (paymentMethod === "mercado_pago") {
      router.push(`/checkout/mercado-pago?order=${order.id}`);
    } else {
      router.push(`/pedido/${order.id}`);
    }
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-10">
      <h1 className="font-serif text-2xl font-semibold mb-6">Checkout</h1>

      <div className="border border-border bg-surface rounded-xl p-4 mb-6">
        <ul className="flex flex-col gap-2 text-sm">
          {items.map((item) => (
            <li key={item.bookId} className="flex justify-between">
              <span>
                {item.quantity}x {item.title}
              </span>
              <span>{formatPrice(item.price * item.quantity)}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between mt-3 pt-3 border-t border-border font-medium">
          <span>Total</span>
          <span className="font-serif">{formatPrice(total)}</span>
        </div>
      </div>

      {step === "auth" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted mb-1">
            ¿Cómo querés continuar con tu compra?
          </p>
          <ButtonLink href="/login?returnTo=/checkout">
            Iniciar sesión
          </ButtonLink>
          <Button variant="outline" onClick={() => setContinuingAsGuest(true)}>
            Continuar como invitado
          </Button>
        </div>
      )}

      {step === "delivery" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium">¿Retiro o envío?</p>

          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 cursor-pointer hover:border-accent">
              <input
                type="radio"
                name="delivery"
                checked={deliveryMethod === "retiro"}
                onChange={() => setDeliveryMethod("retiro")}
              />
              <span className="text-sm">Retiro en punto de entrega</span>
            </label>

            <label className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 cursor-pointer hover:border-accent">
              <input
                type="radio"
                name="delivery"
                checked={deliveryMethod === "envio"}
                onChange={() => setDeliveryMethod("envio")}
              />
              <span className="text-sm">Envío a domicilio</span>
            </label>
          </div>
        </div>
      )}

      {step === "datos" && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => setDeliveryMethod(null)}
            className="text-xs text-muted hover:text-accent self-start"
          >
            ← Cambiar retiro/envío
          </button>

          {deliveryMethod === "envio" && (
            <div className="border border-border bg-surface rounded-xl p-3 flex flex-col gap-2">
              <label className="text-sm font-medium">
                Dirección de envío
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Calle, número, ciudad"
                className={INPUT}
              />
              <p className="text-xs text-muted">
                El envío está a cargo del comprador. Nos vamos a comunicar
                para coordinarlo.
              </p>
            </div>
          )}

          {!userId && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Nombre completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={INPUT}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Teléfono</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={INPUT}
            />
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium mb-1">Método de pago</legend>

            <label className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 cursor-pointer hover:border-accent">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === "mercado_pago"}
                onChange={() => setPaymentMethod("mercado_pago")}
              />
              <span className="text-sm">Tarjeta / Mercado Pago</span>
            </label>

            <label className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 cursor-pointer hover:border-accent">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === "transferencia"}
                onChange={() => setPaymentMethod("transferencia")}
              />
              <span className="text-sm">Transferencia bancaria</span>
            </label>

            <label className="flex items-center gap-2 border border-border rounded-lg px-3 py-2.5 cursor-pointer hover:border-accent">
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === "efectivo"}
                onChange={() => setPaymentMethod("efectivo")}
              />
              <span className="text-sm">Efectivo</span>
            </label>
          </fieldset>

          {error && <p className="text-sm text-accent">{error}</p>}

          <Button type="submit" disabled={loading} className="w-full mt-2">
            {loading ? "Procesando..." : "Confirmar pedido"}
          </Button>
        </form>
      )}
    </main>
  );
}
