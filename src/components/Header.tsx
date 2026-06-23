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
    <header className="border-b border-neutral-200">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg">
          Pueblo Blanco
        </Link>

        <div className="flex items-center gap-5">
          <Link href={loggedIn ? "/cuenta" : "/login"} className="text-sm font-medium">
            {loggedIn ? "Mi cuenta" : "Iniciar sesión"}
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
      </div>
    </header>
  );
}
