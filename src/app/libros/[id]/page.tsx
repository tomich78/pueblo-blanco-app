import { createClient } from "@/lib/supabase/server";
import type { Book } from "@/lib/types";
import { notFound } from "next/navigation";
import Link from "next/link";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: book } = await supabase
    .from("books")
    .select("*, category:categories(id, name, slug)")
    .eq("id", id)
    .eq("active", true)
    .single();

  if (!book) notFound();

  const b = book as Book;

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <Link href="/" className="text-sm text-neutral-500 hover:underline">
        ← Volver al catálogo
      </Link>

      <div className="mt-4 grid md:grid-cols-2 gap-8">
        <div className="aspect-[3/4] bg-neutral-100 rounded-lg flex items-center justify-center overflow-hidden">
          {b.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={b.cover_url}
              alt={b.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-neutral-400">Sin portada</span>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {b.category && (
            <span className="text-xs uppercase text-neutral-500 tracking-wide">
              {b.category.name}
            </span>
          )}
          <h1 className="text-2xl font-bold">{b.title}</h1>
          <p className="text-neutral-600">{b.author}</p>
          <p className="text-2xl font-bold mt-2">{formatPrice(b.price)}</p>

          {b.stock > 0 ? (
            <span className="text-sm text-green-700">
              {b.stock} disponibles
            </span>
          ) : (
            <span className="text-sm text-red-600 font-medium">
              Sin stock
            </span>
          )}

          <button
            disabled={b.stock === 0}
            className="mt-4 bg-black text-white rounded-md px-6 py-3 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
          >
            Agregar al carrito
          </button>

          {b.description && (
            <p className="text-neutral-700 mt-4 whitespace-pre-line">
              {b.description}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
