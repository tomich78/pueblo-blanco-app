import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";

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
      .select("id, status, order_items(book_id, quantity)")
      .eq("id", orderId)
      .single();

    if (order && order.status !== "pagado") {
      await supabase
        .from("orders")
        .update({ status: "pagado" })
        .eq("id", orderId);

      for (const item of order.order_items as {
        book_id: string;
        quantity: number;
      }[]) {
        await supabase.rpc("decrement_book_stock", {
          p_book_id: item.book_id,
          p_quantity: item.quantity,
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
