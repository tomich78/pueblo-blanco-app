"use client";

import { useState } from "react";
import Link from "next/link";
import type { Book } from "@/lib/types";
import { useCartStore } from "@/lib/cart-store";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

export function BookCard({ book }: { book: Book }) {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  function handleAddToCart(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      bookId: book.id,
      title: book.title,
      author: book.author,
      price: book.price,
      coverUrl: book.cover_url,
      stock: book.stock,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  return (
    <Link
      href={`/libros/${book.id}`}
      className="group flex flex-col rounded-xl border border-border bg-surface overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all"
    >
      <div className="aspect-[3/4] bg-border flex items-center justify-center overflow-hidden">
        {book.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <span className="text-muted text-sm">Sin portada</span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1">
        <h3 className="font-medium text-sm line-clamp-2 group-hover:text-accent">
          {book.title}
        </h3>
        <p className="text-muted text-xs">{book.author}</p>
        <p className="font-serif font-semibold mt-1">
          {formatPrice(book.price)}
        </p>
        {book.stock === 0 ? (
          <span className="text-xs text-accent font-medium">Sin stock</span>
        ) : (
          <button
            onClick={handleAddToCart}
            className="mt-2 text-xs font-medium rounded-full bg-accent text-white px-3 py-1.5 hover:bg-accent-hover transition-colors"
          >
            {added ? "Agregado ✓" : "Agregar al carrito"}
          </button>
        )}
      </div>
    </Link>
  );
}
