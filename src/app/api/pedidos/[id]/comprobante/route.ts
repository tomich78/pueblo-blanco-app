import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
    .select("id, status, payment_method")
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

  return NextResponse.json({ ok: true, url: publicUrlData.publicUrl });
}
