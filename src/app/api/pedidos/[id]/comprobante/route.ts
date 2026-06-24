import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendProofUploadedNotification } from "@/lib/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, status, payment_method, total, guest_email, user_id, order_items(quantity, unit_price, books(title))"
    )
    .eq("id", id)
    .single();

  if (
    !order ||
    order.payment_method !== "transferencia" ||
    order.status !== "pendiente_pago"
  ) {
    return NextResponse.json(
      { error: "Este pedido no admite subir comprobante." },
      { status: 400 }
    );
  }

  const ext = file.name.split(".").pop();
  const path = `${id}-${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("comprobantes")
    .upload(path, file);

  if (uploadError) {
    return NextResponse.json(
      { error: "No pudimos subir el comprobante." },
      { status: 500 }
    );
  }

  const { data: publicUrlData } = supabase.storage
    .from("comprobantes")
    .getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      payment_proof_url: publicUrlData.publicUrl,
      status: "esperando_confirmacion",
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: "No pudimos actualizar el pedido." },
      { status: 500 }
    );
  }

  let customerEmail = order.guest_email;
  if (!customerEmail && order.user_id) {
    const { data: userData } = await supabase.auth.admin.getUserById(
      order.user_id
    );
    customerEmail = userData.user?.email ?? null;
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

  await sendProofUploadedNotification({
    id: order.id,
    total: order.total,
    customerEmail: customerEmail ?? "",
    items,
  });

  return NextResponse.json({ ok: true, url: publicUrlData.publicUrl });
}
