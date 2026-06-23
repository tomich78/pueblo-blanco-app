import { createClient } from "@/lib/supabase/server";
import { ButtonLink } from "@/components/Button";
import Link from "next/link";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

export default async function AdminBooksPage() {
  const supabase = await createClient();

  const { data: books } = await supabase
    .from("books")
    .select("id, title, author, price, stock, active, cover_url")
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif text-2xl font-semibold">Libros</h1>
        <ButtonLink href="/admin/libros/nuevo">+ Nuevo libro</ButtonLink>
      </div>

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
      </div>
    </div>
  );
}
