import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";

export type CartItem = {
  bookId: string;
  title: string;
  author: string;
  price: number;
  coverUrl: string | null;
  quantity: number;
  stock: number;
};

type CartState = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (bookId: string) => void;
  setQuantity: (bookId: string, quantity: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, quantity = 1) => {
        const items = get().items;
        const existing = items.find((i) => i.bookId === item.bookId);
        if (existing) {
          set({
            items: items.map((i) =>
              i.bookId === item.bookId
                ? {
                    ...i,
                    quantity: Math.min(i.quantity + quantity, i.stock),
                  }
                : i
            ),
          });
        } else {
          set({
            items: [
              ...items,
              { ...item, quantity: Math.min(quantity, item.stock) },
            ],
          });
        }
      },
      removeItem: (bookId) => {
        set({ items: get().items.filter((i) => i.bookId !== bookId) });
      },
      setQuantity: (bookId, quantity) => {
        set({
          items: get().items.map((i) =>
            i.bookId === bookId
              ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) }
              : i
          ),
        });
      },
      clear: () => set({ items: [] }),
    }),
    {
      name: "pueblo-blanco-cart",
    }
  )
);

export function useCartHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useCartStore.persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useCartStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}

export function cartTotal(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function cartCount(items: CartItem[]) {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
