"use client";

import { useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import { Button } from "@/components/Button";

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
    <Button
      onClick={handleClick}
      disabled={stock === 0}
      className="mt-4 w-full sm:w-auto px-7 py-3"
    >
      {stock === 0 ? "Sin stock" : added ? "Agregado ✓" : "Agregar al carrito"}
    </Button>
  );
}
