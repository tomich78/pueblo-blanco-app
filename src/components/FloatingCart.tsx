"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useCartStore, cartCount, cartTotal } from "@/lib/cart-store";
import { Button, ButtonLink } from "@/components/Button";

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(price);
}

export function FloatingCart() {
  const pathname = usePathname();
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const [open, setOpen] = useState(false);

  const count = cartCount(items);
  const total = cartTotal(items);

  if (pathname.startsWith("/admin")) return null;

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-5 right-5 z-30 bg-accent text-white rounded-full w-14 h-14 shadow-lg flex items-center justify-center text-xl hover:bg-accent-hover transition-colors"
        aria-label="Ver carrito"
      >
        🛒
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-foreground text-white text-[11px] font-semibold rounded-full w-5 h-5 flex items-center justify-center">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)}>
          <div
            className="absolute bottom-24 right-5 w-80 max-h-[70vh] overflow-y-auto bg-surface border border-border rounded-xl shadow-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif font-semibold mb-3">Tu carrito</h3>

            {items.length === 0 ? (
              <p className="text-sm text-muted">Todavía no agregaste libros.</p>
            ) : (
              <>
                <ul className="flex flex-col gap-2 mb-3">
                  {items.map((item) => (
                    <li
                      key={item.bookId}
                      className="flex justify-between items-start text-sm gap-2"
                    >
                      <span>
                        {item.quantity}x {item.title}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span>{formatPrice(item.price * item.quantity)}</span>
                        <button
                          onClick={() => removeItem(item.bookId)}
                          className="text-accent text-xs hover:underline"
                        >
                          ✕
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="flex justify-between text-sm font-medium border-t border-border pt-2 mb-3">
                  <span>Total</span>
                  <span className="font-serif">{formatPrice(total)}</span>
                </div>

                <div className="flex flex-col gap-2">
                  <Link
                    href="/carrito"
                    onClick={() => setOpen(false)}
                    className="text-center text-sm text-muted hover:text-accent"
                  >
                    Ver carrito completo
                  </Link>
                  <ButtonLink href="/checkout" onClick={() => setOpen(false)}>
                    Continuar con la compra
                  </ButtonLink>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
