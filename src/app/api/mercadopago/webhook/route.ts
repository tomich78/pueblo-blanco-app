import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPaymentConfirmed } from "@/lib/email";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);

  const paymentId = body?.data?.id ?? req.nextUrl.searchParams.get("data.id");
  const type = body?.type ?? req.nextUrl.searchParams.get("type");

  if (type !== "payment" || !paymentId) {
    return NextResponse.json({ received: true });
  }

  const payment = new Payment(client);
  const paymentInfo = await payment.get({ id: paymentId });

  const orderId = paymentInfo.external_reference;
  if (!orderId) {
    return NextResponse.json({ received: true });
  }

  const supabase = createAdminClient();

  if (paymentInfo.status === "approved") {
    const { data: order } = await supabase
      .from("orders")
      .select(
        "id, status, total, guest_email, user_id, order_items(id, book_id, quantity, unit_price, books(title))"
      )
      .eq("id", orderId)
      .single();

    if (order && order.status !== "pagado") {
      await supabase
        .from("orders")
        .update({ status: "pagado" })
        .eq("id", orderId);

      for (const item of order.order_items as {
        id: string;
        book_id: string;
        quantity: number;
      }[]) {
        const { data: cajas } = await supabase
          .from("ubicaciones")
          .select("caja, cantidad")
          .eq("producto_id", item.book_id)
          .gt("cantidad", 0)
          .order("cantidad", { ascending: false });

        let restante = item.quantity;
        for (const c of cajas ?? []) {
          if (restante <= 0) break;
          const toma = Math.min(c.cantidad, restante);
          await supabase.rpc("decrement_ubicacion_stock", {
            p_producto_id: item.book_id,
            p_caja: c.caja,
            p_cantidad: toma,
          });
          await supabase.from("order_item_cajas").insert({
            order_item_id: item.id,
            caja: c.caja,
            cantidad: toma,
          });
          restante -= toma;
        }
      }

      let customerEmail = order.guest_email;
      if (!customerEmail && order.user_id) {
        const { data: userData } = await supabase.auth.admin.getUserById(
          order.user_id
        );
        customerEmail = userData.user?.email ?? null;
      }

      if (customerEmail) {
        type Item = {
          quantity: number;
          unit_price: number;
          books: { title: string }[] | { title: string } | null;
        };

        const items = (
          order.order_items as unknown as Item[]
        ).map((item) => {
          const book = Array.isArray(item.books) ? item.books[0] : item.books;
          return {
            title: book?.title ?? "Libro",
            quantity: item.quantity,
            unitPrice: item.unit_price,
          };
        });

        await sendPaymentConfirmed({
          id: order.id,
          total: order.total,
          customerEmail,
          items,
        });
      }
    }
  } else if (paymentInfo.status === "rejected") {
    await supabase
      .from("orders")
      .update({ status: "cancelado" })
      .eq("id", orderId);
  }

  return NextResponse.json({ received: true });
}
