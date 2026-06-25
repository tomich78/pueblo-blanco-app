import { createClient } from "@/lib/supabase/server";
import { ButtonLink, Button } from "@/components/Button";
import { Pagination } from "@/components/Pagination";
import Link from "next/link";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

const PAGE_SIZE = 30;

type SearchParams = { q?: string; page?: string };

export default async function AdminBooksPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("books")
    .select("id, title, author, price, stock, active, cover_url", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(`title.ilike.%${q}%,author.ilike.%${q}%`);
  }

  const from = (page - 1) * PAGE_SIZE;
  const { data: books, count } = await query.range(from, from + PAGE_SIZE - 1);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  function buildHref(targetPage: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (targetPage > 1) params.set("page", String(targetPage));
    const qs = params.toString();
    return qs ? `/admin/libros?${qs}` : "/admin/libros";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-semibold">Libros</h1>
        <ButtonLink href="/admin/libros/nuevo">+ Nuevo libro</ButtonLink>
      </div>

      <form className="mb-4 flex gap-2 max-w-sm" action="/admin/libros">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Buscar por título o autor..."
          className="flex-1 border border-border bg-surface rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
        />
        <Button type="submit">Buscar</Button>
      </form>

      {count != null && (
        <p className="text-xs text-muted mb-3">{count} libros</p>
      )}

      <div className="flex flex-col gap-2">
        {books?.map((book) => (
          <Link
            key={book.id}
            href={`/admin/libros/${book.id}`}
            className="flex items-center gap-4 border border-border bg-surface rounded-xl p-3 hover:border-accent"
          >
            <div className="w-12 h-16 bg-[#f1ece4] rounded shrink-0 flex items-center justify-center overflow-hidden">
              {book.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[9px] text-muted">Sin portada</span>
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium text-sm">{book.title}</p>
              <p className="text-xs text-muted">{book.author}</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-serif font-semibold">
                {formatPrice(book.price)}
              </p>
              <p className="text-xs text-muted">Stock: {book.stock}</p>
            </div>
            {!book.active && (
              <span className="text-xs text-accent font-medium">
                Inactivo
              </span>
            )}
          </Link>
        ))}
        {books?.length === 0 && (
          <p className="text-sm text-muted">No se encontraron libros.</p>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
    </div>
  );
}
