import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

const FROM = process.env.EMAIL_FROM || "Pueblo Blanco <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

type OrderItemEmail = { title: string; quantity: number; unitPrice: number };

type OrderEmailData = {
  id: string;
  total: number;
  customerEmail: string;
  items: OrderItemEmail[];
};

function itemsListHtml(items: OrderItemEmail[]) {
  return items
    .map(
      (i) =>
        `<li>${i.quantity}x ${i.title} — ${formatPrice(i.unitPrice * i.quantity)}</li>`
    )
    .join("");
}

export async function sendOrderConfirmation(order: OrderEmailData) {
  const resend = getResend();
  if (!resend) return;

  await resend.emails.send({
    from: FROM,
    to: order.customerEmail,
    subject: `Pedido #${order.id.slice(0, 8)} recibido — Pueblo Blanco`,
    html: `
      <h2>¡Gracias por tu pedido!</h2>
      <p>Pedido #${order.id.slice(0, 8)}</p>
      <ul>${itemsListHtml(order.items)}</ul>
      <p><strong>Total: ${formatPrice(order.total)}</strong></p>
      <p>Podés ver el estado de tu pedido en cualquier momento desde este link.</p>
    `,
  });
}

export async function sendPaymentConfirmed(order: OrderEmailData) {
  const resend = getResend();
  if (!resend) return;

  await resend.emails.send({
    from: FROM,
    to: order.customerEmail,
    subject: `Pago confirmado — Pedido #${order.id.slice(0, 8)}`,
    html: `
      <h2>Tu pago fue confirmado</h2>
      <p>Pedido #${order.id.slice(0, 8)}</p>
      <ul>${itemsListHtml(order.items)}</ul>
      <p><strong>Total: ${formatPrice(order.total)}</strong></p>
      <p>¡Gracias por tu compra en Pueblo Blanco!</p>
    `,
  });
}

export async function sendProofUploadedNotification(order: OrderEmailData) {
  const resend = getResend();
  if (!resend || !ADMIN_EMAIL) return;

  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Comprobante subido — Pedido #${order.id.slice(0, 8)}`,
    html: `
      <h2>Un cliente subió un comprobante de transferencia</h2>
      <p>Pedido #${order.id.slice(0, 8)} — ${order.customerEmail}</p>
      <ul>${itemsListHtml(order.items)}</ul>
      <p><strong>Total: ${formatPrice(order.total)}</strong></p>
      <p>Revisalo en el panel de admin para confirmar el pago.</p>
    `,
  });
}
