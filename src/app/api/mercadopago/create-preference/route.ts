import { NextRequest, NextResponse } from "next/server";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { createAdminClient } from "@/lib/supabase/admin";

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

export async function POST(req: NextRequest) {
  const { orderId } = await req.json();

  if (!orderId) {
    return NextResponse.json({ error: "orderId requerido" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, total, status, order_items(quantity, unit_price, book_id, books(title))")
    .eq("id", orderId)
    .single();

  if (!order || order.status !== "pendiente_pago") {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!;

  type OrderItemRow = {
    quantity: number;
    unit_price: number;
    book_id: string;
    books: { title: string }[] | { title: string } | null;
  };

  const preference = new Preference(client);
  const result = await preference.create({
    body: {
      items: (order.order_items as unknown as OrderItemRow[]).map((item) => {
        const book = Array.isArray(item.books) ? item.books[0] : item.books;
        return {
          id: item.book_id,
          title: book?.title ?? "Libro",
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency_id: "ARS",
        };
      }),
      external_reference: order.id,
      back_urls: {
        success: `${siteUrl}/pedido/${order.id}`,
        pending: `${siteUrl}/pedido/${order.id}`,
        failure: `${siteUrl}/pedido/${order.id}`,
      },
      // auto_return requiere una URL pública HTTPS; en localhost lo omitimos.
      ...(siteUrl.startsWith("https://") ? { auto_return: "approved" as const } : {}),
      notification_url: `${siteUrl}/api/mercadopago/webhook`,
    },
  });

  return NextResponse.json({ initPoint: result.init_point });
}
