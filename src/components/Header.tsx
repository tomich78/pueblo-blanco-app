"use client";

import Link from "next/link";
import { useCartStore, cartCount } from "@/lib/cart-store";

export function Header() {
  const items = useCartStore((s) => s.items);
  const count = cartCount(items);

  return (
    <header className="border-b border-neutral-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">
          Pueblo Blanco
        </Link>
        <Link
          href="/carrito"
          className="relative flex items-center gap-1 text-sm font-medium"
        >
          🛒 Carrito
          {count > 0 && (
            <span className="absolute -top-2 -right-3 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {count}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
