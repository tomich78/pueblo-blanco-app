import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOrderConfirmation, sendPaymentConfirmed } from "@/lib/email";

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
      "id, total, guest_email, user_id, order_items(quantity, unit_price, books(title))"
    )
    .eq("id", id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }

  let customerEmail = order.guest_email;
  if (!customerEmail && order.user_id) {
    const { data: userData } = await supabase.auth.admin.getUserById(
      order.user_id
    );
    customerEmail = userData.user?.email ?? null;
  }

  if (!customerEmail) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  type Item = {
    quantity: number;
    unit_price: number;
    books: { title: string }[] | { title: string } | null;
  };

  const items = (order.order_items as unknown as Item[]).map((item) => {
    const book = Array.isArray(item.books) ? item.books[0] : item.books;
    return {
      title: book?.title ?? "Libro",
      quantity: item.quantity,
      unitPrice: item.unit_price,
    };
  });

  const emailData = {
    id: order.id,
    total: order.total,
    customerEmail,
    items,
  };

  if (type === "confirmacion") {
    await sendOrderConfirmation(emailData);
  } else {
    await sendPaymentConfirmed(emailData);
  }

  return NextResponse.json({ ok: true });
}
