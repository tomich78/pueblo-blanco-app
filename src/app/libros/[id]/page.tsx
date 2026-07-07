import { createClient } from "@/lib/supabase/server";
import type { Book } from "@/lib/types";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AddToCartButton } from "@/components/AddToCartButton";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: book } = await supabase
    .from("books")
    .select("title, author, description, cover_url")
    .eq("id", id)
    .single();

  if (!book) return { title: "Libro no encontrado" };

  return {
    title: book.title,
    description:
      book.description ?? `${book.title}, de ${book.author}. Disponible en Pueblo Blanco.`,
    openGraph: book.cover_url ? { images: [book.cover_url] } : undefined,
  };
}

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
      <Link href="/" className="text-sm text-muted hover:text-accent">
        ← Volver al catálogo
      </Link>

      <div className="mt-4 grid md:grid-cols-2 gap-10">
        <div className="aspect-[3/4] bg-border rounded-xl flex items-center justify-center overflow-hidden">
          {b.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={b.cover_url}
              alt={b.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-muted">Sin portada</span>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {b.category && (
            <span className="text-xs uppercase text-accent font-medium tracking-wide">
              {b.category.name}
            </span>
          )}
          <h1 className="font-serif text-3xl font-semibold">{b.title}</h1>
          <p className="text-muted">{b.author}</p>
          {b.publisher && (
            <p className="text-sm text-muted">{b.publisher}</p>
          )}
          <p className="font-serif text-2xl font-semibold mt-2">
            {formatPrice(b.price)}
          </p>

          {b.stock > 0 ? (
            <span className="text-sm text-green-700 dark:text-green-400">
              {b.stock} disponibles
            </span>
          ) : (
            <span className="text-sm text-accent font-medium">
              Sin stock
            </span>
          )}

          <AddToCartButton
            bookId={b.id}
            title={b.title}
            author={b.author}
            price={b.price}
            coverUrl={b.cover_url}
            stock={b.stock}
          />

          {b.description && (
            <p className="text-foreground/80 mt-4 whitespace-pre-line leading-relaxed">
              {b.description}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
