// Borra los libros de prueba (legacy_id null) y todo lo que dependa de ellos:
// order_item_cajas, order_items, orders, ubicaciones, y los libros mismos.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, "..");

function loadEnvLocal() {
  const text = fs.readFileSync(path.join(WEB_DIR, ".env.local"), "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) process.env[m[1]] = m[2];
  }
}

async function main() {
  loadEnvLocal();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const { data: testBooks, error: booksErr } = await supabase
    .from("books")
    .select("id, title")
    .is("legacy_id", null);
  if (booksErr) throw booksErr;

  const bookIds = testBooks.map((b) => b.id);
  console.log("Libros de prueba a borrar:", testBooks.map((b) => b.title));

  const { data: items, error: itemsErr } = await supabase
    .from("order_items")
    .select("id, order_id")
    .in("book_id", bookIds);
  if (itemsErr) throw itemsErr;

  const orderIds = [...new Set(items.map((i) => i.order_id))];
  console.log(`Pedidos de prueba a borrar: ${orderIds.length}`);

  if (items.length) {
    const itemIds = items.map((i) => i.id);
    await supabase.from("order_item_cajas").delete().in("order_item_id", itemIds);
    const { error } = await supabase.from("order_items").delete().in("id", itemIds);
    if (error) throw error;
  }

  if (orderIds.length) {
    const { error } = await supabase.from("orders").delete().in("id", orderIds);
    if (error) throw error;
  }

  await supabase.from("ubicaciones").delete().in("producto_id", bookIds);

  const { error: delBooksErr } = await supabase.from("books").delete().in("id", bookIds);
  if (delBooksErr) throw delBooksErr;

  console.log("✓ Datos de prueba eliminados.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
