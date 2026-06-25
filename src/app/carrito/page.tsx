"use client";

import Link from "next/link";
import { useCartStore, cartTotal } from "@/lib/cart-store";
import { ButtonLink } from "@/components/Button";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const total = cartTotal(items);

  if (items.length === 0) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-semibold mb-2">
          Tu carrito está vacío
        </h1>
        <Link href="/" className="text-sm text-accent hover:underline">
          Ver catálogo
        </Link>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="font-serif text-2xl font-semibold mb-6">Tu carrito</h1>

      <ul className="flex flex-col gap-4">
        {items.map((item) => (
          <li
            key={item.bookId}
            className="flex gap-4 border border-border bg-surface rounded-xl p-3"
          >
            <div className="w-16 h-20 bg-border rounded-lg shrink-0 flex items-center justify-center overflow-hidden">
              {item.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.coverUrl}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[10px] text-muted">Sin portada</span>
              )}
            </div>

            <div className="flex-1 flex flex-col">
              <span className="font-medium text-sm">{item.title}</span>
              <span className="text-xs text-muted">{item.author}</span>
              <span className="font-serif font-semibold text-sm mt-1">
                {formatPrice(item.price)}
              </span>

              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs text-muted">Cant.</label>
                <input
                  type="number"
                  min={1}
                  max={item.stock}
                  value={item.quantity}
                  onChange={(e) =>
                    setQuantity(item.bookId, Number(e.target.value))
                  }
                  className="w-16 border border-border rounded-md px-2 py-1 text-sm focus:outline-none focus:border-accent"
                />
                <button
                  onClick={() => removeItem(item.bookId)}
                  className="text-xs text-accent ml-auto hover:underline"
                >
                  Quitar
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <span className="font-medium">Total</span>
        <span className="font-serif font-semibold text-xl">
          {formatPrice(total)}
        </span>
      </div>

      <ButtonLink href="/checkout" className="mt-6 w-full">
        Continuar con la compra
      </ButtonLink>
    </main>
  );
}
