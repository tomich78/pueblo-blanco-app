import Link from "next/link";
import type { Book } from "@/lib/types";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

export function BookCard({ book }: { book: Book }) {
  return (
    <Link
      href={`/libros/${book.id}`}
      className="group flex flex-col rounded-lg border border-neutral-200 overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="aspect-[3/4] bg-neutral-100 flex items-center justify-center overflow-hidden">
        {book.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <span className="text-neutral-400 text-sm">Sin portada</span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1">
        <h3 className="font-semibold text-sm line-clamp-2">{book.title}</h3>
        <p className="text-neutral-500 text-xs">{book.author}</p>
        <p className="font-bold mt-1">{formatPrice(book.price)}</p>
        {book.stock === 0 && (
          <span className="text-xs text-red-600 font-medium">Sin stock</span>
        )}
      </div>
    </Link>
  );
}
