import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

const FROM = process.env.EMAIL_FROM || "Pueblo Blanco <onboarding@resend.dev>";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
// Casilla del comercio para avisos internos (nuevas compras, etc.)
const STORE_EMAIL = process.env.ADMIN_EMAIL || "puebloblanco22@gmail.com";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://puebloblancolibros.com.ar";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

export type OrderItemEmail = {
  title: string;
  author?: string;
  quantity: number;
  unitPrice: number;
  coverUrl?: string | null;
};

export type OrderEmailData = {
  id: string;
  total: number;
  customerEmail: string;
  customerName?: string | null;
  items: OrderItemEmail[];
  paymentMethod?: string | null;
  deliveryMethod?: string | null;
  shippingAddress?: string | null;
};

function paymentLabel(method?: string | null) {
  if (method === "mercado_pago") return "Mercado Pago";
  if (method === "transferencia") return "Transferencia bancaria";
  if (method === "efectivo") return "Efectivo";
  return method ?? "—";
}

function deliveryLabel(method?: string | null, address?: string | null) {
  if (method === "envio") return `Envío a domicilio — ${address ?? ""}`;
  if (method === "retiro") return "Retiro en librería";
  return method ?? "—";
}

function itemRowHtml(item: OrderItemEmail) {
  const cover = item.coverUrl
    ? `<img src="${item.coverUrl}" alt="${item.title}" width="48" height="68"
         style="object-fit:cover;border-radius:4px;border:1px solid #e5e7eb;display:block;" />`
    : `<div style="width:48px;height:68px;background:#f3f4f6;border-radius:4px;border:1px solid #e5e7eb;"></div>`;

  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;width:60px;">
        ${cover}
      </td>
      <td style="padding:12px 12px;border-bottom:1px solid #f3f4f6;vertical-align:top;">
        <div style="font-weight:600;color:#111827;font-size:14px;">${item.title}</div>
        ${item.author ? `<div style="color:#6b7280;font-size:13px;margin-top:2px;">${item.author}</div>` : ""}
        <div style="color:#6b7280;font-size:13px;margin-top:4px;">Cantidad: ${item.quantity}</div>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;vertical-align:top;text-align:right;white-space:nowrap;">
        <span style="font-weight:600;color:#111827;font-size:14px;">${formatPrice(item.unitPrice * item.quantity)}</span>
      </td>
    </tr>`;
}

function baseTemplate({
  title,
  greeting,
  body,
  orderId,
  showOrderLink = true,
}: {
  title: string;
  greeting: string;
  body: string;
  orderId: string;
  showOrderLink?: boolean;
}) {
  const shortId = orderId.slice(0, 8).toUpperCase();
  const orderUrl = `${SITE_URL}/mi-pedido?id=${orderId}`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Georgia',serif;color:#111827;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#111827;border-radius:12px 12px 0 0;padding:28px 32px;text-align:center;">
            <div style="font-family:'Georgia',serif;font-size:26px;font-weight:700;color:#ffffff;letter-spacing:1px;">
              Pueblo Blanco
            </div>
            <div style="font-size:12px;color:#9ca3af;margin-top:4px;letter-spacing:2px;text-transform:uppercase;">
              Librería
            </div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">${title}</h1>
            <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">${greeting}</p>
            ${body}
            ${showOrderLink ? `
            <div style="margin-top:28px;text-align:center;">
              <a href="${orderUrl}"
                 style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;
                        padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;letter-spacing:0.5px;">
                Ver estado del pedido
              </a>
            </div>
            <p style="margin:12px 0 0;text-align:center;font-size:12px;color:#9ca3af;">
              También podés ir a <a href="${orderUrl}" style="color:#6b7280;">${SITE_URL}/mi-pedido</a>
              y buscar con el número <strong>${shortId}</strong>
            </p>` : ""}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f3f4f6;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;
                     padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;">
              Pueblo Blanco Librería · puebloblancolibros.com.ar
            </p>
            <p style="margin:6px 0 0;font-size:12px;color:#9ca3af;">
              Ante cualquier consulta respondé este mail o escribinos.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function orderDetailsBlock(order: OrderEmailData) {
  const shortId = order.id.slice(0, 8).toUpperCase();
  return `
    <!-- Número de pedido -->
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 18px;margin-bottom:24px;">
      <span style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Número de pedido</span>
      <div style="font-size:20px;font-weight:700;color:#111827;margin-top:4px;letter-spacing:1px;">#${shortId}</div>
    </div>

    <!-- Artículos -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${order.items.map(itemRowHtml).join("")}
    </table>

    <!-- Total -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="padding:14px 0;border-top:2px solid #111827;">
          <span style="font-size:15px;font-weight:700;color:#111827;">Total</span>
        </td>
        <td style="padding:14px 0;border-top:2px solid #111827;text-align:right;">
          <span style="font-size:18px;font-weight:700;color:#111827;">${formatPrice(order.total)}</span>
        </td>
      </tr>
    </table>

    <!-- Info extra -->
    ${order.paymentMethod || order.deliveryMethod ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:8px;">
      ${order.paymentMethod ? `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;background:#f9fafb;font-size:12px;color:#6b7280;width:40%;">Pago</td>
        <td style="padding:10px 16px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827;">${paymentLabel(order.paymentMethod)}</td>
      </tr>` : ""}
      ${order.deliveryMethod ? `
      <tr>
        <td style="padding:10px 16px;background:#f9fafb;font-size:12px;color:#6b7280;">Entrega</td>
        <td style="padding:10px 16px;font-size:13px;color:#111827;">${deliveryLabel(order.deliveryMethod, order.shippingAddress)}</td>
      </tr>` : ""}
    </table>` : ""}
  `;
}

export async function sendOrderConfirmation(order: OrderEmailData) {
  const resend = getResend();
  if (!resend) return;

  const name = order.customerName ?? "cliente";

  await resend.emails.send({
    from: FROM,
    to: order.customerEmail,
    subject: `Pedido #${order.id.slice(0, 8).toUpperCase()} recibido — Pueblo Blanco`,
    html: baseTemplate({
      title: "¡Gracias por tu pedido!",
      greeting: `Hola${name !== "cliente" ? ` ${name}` : ""}, recibimos tu pedido y ya lo estamos procesando.`,
      body: `
        ${orderDetailsBlock(order)}
        <p style="font-size:13px;color:#6b7280;margin:0;">
          En cuanto confirmemos el pago te avisamos. Si tenés alguna consulta no dudes en escribirnos.
        </p>
      `,
      orderId: order.id,
    }),
  });
}

// Aviso al comercio de que se realizó una nueva compra
export async function sendNewOrderAdminNotification(order: OrderEmailData) {
  const resend = getResend();
  if (!resend) return;

  const shortId = order.id.slice(0, 8).toUpperCase();
  const adminUrl = `${SITE_URL}/admin/pedidos/${order.id}`;
  const cliente = order.customerName
    ? `${order.customerName} (${order.customerEmail})`
    : order.customerEmail;

  await resend.emails.send({
    from: FROM,
    to: STORE_EMAIL,
    replyTo: order.customerEmail,
    subject: `🛒 Nueva compra #${shortId} — ${formatPrice(order.total)}`,
    html: baseTemplate({
      title: "Nueva compra recibida",
      greeting: `${cliente} realizó una compra por ${formatPrice(order.total)}.`,
      body: `
        ${orderDetailsBlock(order)}
        <div style="margin-top:20px;text-align:center;">
          <a href="${adminUrl}"
             style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;
                    padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
            Ver pedido en admin
          </a>
        </div>
      `,
      orderId: order.id,
      showOrderLink: false,
    }),
  });
}

export async function sendPaymentConfirmed(order: OrderEmailData) {
  const resend = getResend();
  if (!resend) return;

  const name = order.customerName ?? "cliente";

  await resend.emails.send({
    from: FROM,
    to: order.customerEmail,
    subject: `✓ Pago confirmado — Pedido #${order.id.slice(0, 8).toUpperCase()}`,
    html: baseTemplate({
      title: "Tu pago fue confirmado",
      greeting: `Hola${name !== "cliente" ? ` ${name}` : ""}, confirmamos el pago de tu pedido. ¡Ya está listo para retirar o enviamos en breve!`,
      body: `
        <!-- Badge confirmado -->
        <div style="background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:10px 16px;margin-bottom:24px;font-size:13px;color:#166534;font-weight:600;">
          ✓ Pago acreditado correctamente
        </div>
        ${orderDetailsBlock(order)}
        <p style="font-size:13px;color:#6b7280;margin:0;">
          ¡Gracias por elegir Pueblo Blanco!
        </p>
      `,
      orderId: order.id,
    }),
  });
}

export async function sendProofUploadedNotification(order: OrderEmailData) {
  const resend = getResend();
  if (!resend || !ADMIN_EMAIL) return;

  const adminUrl = `${SITE_URL}/admin/pedidos/${order.id}`;
  const shortId = order.id.slice(0, 8).toUpperCase();

  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Comprobante subido — Pedido #${shortId}`,
    html: baseTemplate({
      title: "Comprobante de transferencia recibido",
      greeting: `El cliente ${order.customerEmail} subió un comprobante para el pedido #${shortId}.`,
      body: `
        ${orderDetailsBlock(order)}
        <div style="margin-top:20px;text-align:center;">
          <a href="${adminUrl}"
             style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;
                    padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">
            Ver pedido en admin
          </a>
        </div>
      `,
      orderId: order.id,
      showOrderLink: false,
    }),
  });
}
