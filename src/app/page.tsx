import { createClient } from "@/lib/supabase/server";
import { BookCard } from "@/components/BookCard";
import { Pagination } from "@/components/Pagination";
import type { Book, Category } from "@/lib/types";
import Link from "next/link";
import { Button } from "@/components/Button";

const PAGE_SIZE = 24;

type SearchParams = { categoria?: string; q?: string; page?: string };

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { categoria, q, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name");

  let query = supabase
    .from("books")
    .select("*, category:categories(id, name, slug)", { count: "exact" })
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

  const from = (page - 1) * PAGE_SIZE;
  const { data: books, count } = await query.range(from, from + PAGE_SIZE - 1);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  function buildHref(targetPage: number) {
    const params = new URLSearchParams();
    if (categoria) params.set("categoria", categoria);
    if (q) params.set("q", q);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <header className="mb-10 text-center">
        <h1 className="font-serif text-4xl font-semibold tracking-tight">
          Pueblo Blanco
        </h1>
        <p className="text-muted mt-2">Libros para comprar online</p>
      </header>

      <form className="mb-6 flex gap-2 max-w-md mx-auto" action="/">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por título o autor..."
          className="flex-1 border border-border bg-surface rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
        />
        {categoria && <input type="hidden" name="categoria" value={categoria} />}
        <Button type="submit">Buscar</Button>
      </form>

      <nav className="flex flex-wrap gap-2 justify-center mb-10">
        <Link
          href="/"
          className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
            !categoria
              ? "bg-accent text-white border-accent"
              : "border-border text-muted hover:border-accent hover:text-accent"
          }`}
        >
          Todas
        </Link>
        {(categories as Category[] | null)?.map((cat) => (
          <Link
            key={cat.id}
            href={`/?categoria=${cat.slug}`}
            className={`px-4 py-1.5 rounded-full text-sm border transition-colors ${
              categoria === cat.slug
                ? "bg-accent text-white border-accent"
                : "border-border text-muted hover:border-accent hover:text-accent"
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </nav>

      {books && books.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {(books as Book[]).map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
        </>
      ) : (
        <p className="text-center text-muted">No se encontraron libros.</p>
      )}
    </main>
  );
}
