import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendOrderConfirmation,
  sendPaymentConfirmed,
  sendNewOrderAdminNotification,
} from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { type } = await req.json();

  if (type !== "confirmacion" && type !== "pago_confirmado") {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, total, guest_email, guest_name, user_id, payment_method, delivery_method, shipping_address, order_items(quantity, unit_price, books(title, author, cover_url))"
    )
    .eq("id", id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  let customerEmail = order.guest_email;
  let customerName = order.guest_name;

  if (!customerEmail && order.user_id) {
    const { data: userData } = await supabase.auth.admin.getUserById(
      order.user_id
    );
    customerEmail = userData.user?.email ?? null;
    customerName =
      customerName ?? userData.user?.user_metadata?.full_name ?? null;
  }

  if (!customerEmail) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  type Item = {
    quantity: number;
    unit_price: number;
    books: { title: string; author: string; cover_url: string | null }[] | { title: string; author: string; cover_url: string | null } | null;
  };

  const items = (order.order_items as unknown as Item[]).map((item) => {
    const book = Array.isArray(item.books) ? item.books[0] : item.books;
    return {
      title: book?.title ?? "Libro",
      author: book?.author,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      coverUrl: book?.cover_url,
    };
  });

  const emailData = {
    id: order.id,
    total: order.total,
    customerEmail,
    customerName,
    items,
    paymentMethod: order.payment_method,
    deliveryMethod: order.delivery_method,
    shippingAddress: order.shipping_address,
  };

  if (type === "confirmacion") {
    // Mail al cliente + aviso al comercio de que se realizó una compra
    await Promise.all([
      sendOrderConfirmation(emailData),
      sendNewOrderAdminNotification(emailData),
    ]);
  } else {
    await sendPaymentConfirmed(emailData);
  }

  return NextResponse.json({ ok: true });
}
