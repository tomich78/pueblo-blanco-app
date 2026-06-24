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
  const [quantity, setQuantity] = useState(1);

  function handleClick() {
    addItem({ bookId, title, author, price, coverUrl, stock }, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  if (stock === 0) {
    return (
      <Button disabled className="mt-4 w-full sm:w-auto px-7 py-3">
        Sin stock
      </Button>
    );
  }

  return (
    <div className="mt-4 flex items-center gap-3">
      <div className="flex items-center border border-border rounded-full">
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          className="w-9 h-9 flex items-center justify-center text-lg hover:text-accent"
          aria-label="Restar cantidad"
        >
          −
        </button>
        <span className="w-8 text-center text-sm font-medium">
          {quantity}
        </span>
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.min(stock, q + 1))}
          className="w-9 h-9 flex items-center justify-center text-lg hover:text-accent"
          aria-label="Sumar cantidad"
        >
          +
        </button>
      </div>

      <Button onClick={handleClick} className="flex-1 sm:flex-none px-7 py-3">
        {added ? "Agregado ✓" : "Agregar al carrito"}
      </Button>
    </div>
  );
}
