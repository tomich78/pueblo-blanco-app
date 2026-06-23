import { createClient } from "@/lib/supabase/server";
import { BookCard } from "@/components/BookCard";
import type { Book, Category } from "@/lib/types";
import Link from "next/link";

type SearchParams = { categoria?: string; q?: string };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { categoria, q } = await searchParams;
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name");

  let query = supabase
    .from("books")
    .select("*, category:categories(id, name, slug)")
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (categoria) {
    const cat = (categories as Category[] | null)?.find(
      (c) => c.slug === categoria
    );
    if (cat) query = query.eq("category_id", cat.id);
  }

  if (q) {
    query = query.or(`title.ilike.%${q}%,author.ilike.%${q}%`);
  }

  const { data: books } = await query;

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Pueblo Blanco</h1>
        <p className="text-neutral-600 mt-1">Libros para comprar online</p>
      </header>

      <form className="mb-6 flex gap-2 max-w-md mx-auto" action="/">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por título o autor..."
          className="flex-1 border border-neutral-300 rounded-md px-3 py-2 text-sm"
        />
        {categoria && <input type="hidden" name="categoria" value={categoria} />}
        <button
          type="submit"
          className="bg-black text-white rounded-md px-4 py-2 text-sm"
        >
          Buscar
        </button>
      </form>

      <nav className="flex flex-wrap gap-2 justify-center mb-8">
        <Link
          href="/"
          className={`px-3 py-1.5 rounded-full text-sm border ${
            !categoria
              ? "bg-black text-white border-black"
              : "border-neutral-300"
          }`}
        >
          Todas
        </Link>
        {(categories as Category[] | null)?.map((cat) => (
          <Link
            key={cat.id}
            href={`/?categoria=${cat.slug}`}
            className={`px-3 py-1.5 rounded-full text-sm border ${
              categoria === cat.slug
                ? "bg-black text-white border-black"
                : "border-neutral-300"
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </nav>

      {books && books.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {(books as Book[]).map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <p className="text-center text-neutral-500">
          No se encontraron libros.
        </p>
      )}
    </main>
  );
}
