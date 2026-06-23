"use client";

import { useState } from "react";
import { useCartStore } from "@/lib/cart-store";

export function AddToCartButton({
  bookId,
  title,
  author,
  price,
  coverUrl,
  stock,
}: {
  bookId: string;
  title: string;
  author: string;
  price: number;
  coverUrl: string | null;
  stock: number;
}) {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  function handleClick() {
    addItem({ bookId, title, author, price, coverUrl, stock });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button
      onClick={handleClick}
      disabled={stock === 0}
      className="mt-4 bg-black text-white rounded-md px-6 py-3 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
    >
      {stock === 0 ? "Sin stock" : added ? "Agregado ✓" : "Agregar al carrito"}
    </button>
  );
}
