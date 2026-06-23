"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCartStore, cartCount } from "@/lib/cart-store";
import { createClient } from "@/lib/supabase/client";

export function Header() {
  const items = useCartStore((s) => s.items);
  const count = cartCount(items);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setLoggedIn(!!data.user);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setLoggedIn(!!session?.user);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="font-serif text-xl font-semibold tracking-tight hover:text-accent"
        >
          Pueblo Blanco
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href={loggedIn ? "/cuenta" : "/login"}
            className="text-sm font-medium text-muted hover:text-accent"
          >
            {loggedIn ? "Mi cuenta" : "Iniciar sesión"}
          </Link>

          <Link
            href="/carrito"
            className="relative flex items-center gap-1.5 text-sm font-medium text-muted hover:text-accent"
          >
            <span aria-hidden>🛒</span> Carrito
            {count > 0 && (
              <span className="absolute -top-2.5 -right-3 bg-accent text-white text-[11px] font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
