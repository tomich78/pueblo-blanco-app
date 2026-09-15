import { createClient } from "@/lib/supabase/server";
import { BookCard } from "@/components/BookCard";
import { Pagination } from "@/components/Pagination";
import type { Book, Category } from "@/lib/types";
import Link from "next/link";
import { CatalogControls } from "@/components/CatalogControls";
import { filterAndSortBooks, uniqueValues } from "@/lib/catalog";

const PAGE_SIZE = 24;

type SearchParams = {
  categoria?: string;
  q?: string;
  page?: string;
  orden?: string;
  author?: string;
  publisher?: string;
  precioMin?: string;
  precioMax?: string;
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const {
    categoria,
    q,
    page: pageParam,
    orden,
    author,
    publisher,
    precioMin,
    precioMax,
  } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug")
    .order("name");

  // El catálogo es chico: traemos todos los libros activos con stock y filtramos
  // en el server. Así la búsqueda ignora acentos y podemos filtrar por autor,
  // editorial y precio sin depender de la base de datos.
  let query = supabase
    .from("books")
    .select("*, category:categories(id, name, slug)")
    .eq("active", true)
    .gt("stock", 0)
    .limit(5000);

  if (categoria) {
    const cat = (categories as Category[] | null)?.find(
      (c) => c.slug === categoria
    );
    if (cat) query = query.eq("category_id", cat.id);
  }

  const { data: allBooks } = await query;
  const books = (allBooks as Book[] | null) ?? [];

  // Opciones para los filtros (autores y editoriales presentes en la categoría actual)
  const authors = uniqueValues(books, "author");
  const publishers = uniqueValues(books, "publisher");

  const filtered = filterAndSortBooks(books, {
    q,
    author,
    publisher,
    priceMin: precioMin ? parseFloat(precioMin) : undefined,
    priceMax: precioMax ? parseFloat(precioMax) : undefined,
    orden,
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const from = (currentPage - 1) * PAGE_SIZE;
  const pageBooks = filtered.slice(from, from + PAGE_SIZE);

  function buildHref(targetPage: number) {
    const params = new URLSearchParams();
    if (categoria) params.set("categoria", categoria);
    if (q) params.set("q", q);
    if (orden) params.set("orden", orden);
    if (author) params.set("author", author);
    if (publisher) params.set("publisher", publisher);
    if (precioMin) params.set("precioMin", precioMin);
    if (precioMax) params.set("precioMax", precioMax);
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
          placeholder="Buscar por título, autor o editorial..."
          className="flex-1 border border-border bg-surface rounded-full px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
        />
        {categoria && <input type="hidden" name="categoria" value={categoria} />}
        {orden && <input type="hidden" name="orden" value={orden} />}
        <button
          type="submit"
          className="rounded-full bg-accent text-white px-5 py-2.5 text-sm font-medium hover:bg-accent-hover"
        >
          Buscar
        </button>
      </form>

      {/* Filtros y ordenamiento */}
      <CatalogControls
        categoria={categoria}
        q={q}
        orden={orden}
        author={author}
        publisher={publisher}
        priceMin={precioMin}
        priceMax={precioMax}
        authors={authors}
        publishers={publishers}
      />

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

      {pageBooks.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {pageBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
          <Pagination page={currentPage} totalPages={totalPages} buildHref={buildHref} />
        </>
      ) : (
        <p className="text-center text-muted">No se encontraron libros.</p>
      )}
    </main>
  );
}
