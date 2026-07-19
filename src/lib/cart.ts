import { useEffect, useState, useCallback } from "react";

export type CartItem = {
  product_id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
};

const KEY = "fmk_cart_v1";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("fmk-cart-changed"));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setItems(read());
    setReady(true);
    const h = () => setItems(read());
    window.addEventListener("fmk-cart-changed", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("fmk-cart-changed", h);
      window.removeEventListener("storage", h);
    };
  }, []);

  const add = useCallback((item: Omit<CartItem, "quantity">, qty = 1) => {
    const cur = read();
    const idx = cur.findIndex((i) => i.product_id === item.product_id);
    if (idx >= 0) cur[idx].quantity += qty;
    else cur.push({ ...item, quantity: qty });
    write(cur);
  }, []);

  const setQty = useCallback((product_id: string, qty: number) => {
    const cur = read().map((i) => (i.product_id === product_id ? { ...i, quantity: qty } : i)).filter((i) => i.quantity > 0);
    write(cur);
  }, []);

  const remove = useCallback((product_id: string) => {
    write(read().filter((i) => i.product_id !== product_id));
  }, []);

  const clear = useCallback(() => write([]), []);

  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return { items, add, setQty, remove, clear, subtotal, count, ready };
}
