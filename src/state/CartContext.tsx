import React, { createContext, useContext, useEffect, useState } from "react";

type Product = {
  id: number;
  image_url?: string | null;
  weight?: number | null;
  is_live_stock?: boolean;
};

type Line = {
  product: Product;
  quantity: number;
};

type CartContextShape = {
  lines: Line[];
  add: (product: Product, qty?: number) => void;
  setQty: (productId: number, qty: number) => void;
  remove: (productId: number) => void;
  clear: () => void;
  totalItems: number;
};

const CartContext = createContext<CartContextShape | null>(null);

const STORAGE_KEY = "gj_cart_v1";

/* ============================================================
       ⭐ BEAUTIFUL TOAST — AMAZON STYLE (NO LIBRARY NEEDED)
============================================================ */
function showToast(message: string) {
  const toast = document.createElement("div");
  toast.innerText = message;

  Object.assign(toast.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    background: "#222",
    color: "#fff",
    padding: "12px 16px",
    borderRadius: "6px",
    fontSize: "14px",
    zIndex: 99999,
    opacity: "0",
    transform: "translateY(20px)",
    transition: "opacity .3s ease, transform .3s ease",
  });

  document.body.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0px)";
  });

  // Remove after 1.8s
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(20px)";
    setTimeout(() => toast.remove(), 300);
  }, 1800);
}

/* ============================================================
                  CART PROVIDER
============================================================ */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<Line[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw) as Line[];
    } catch (e) {
      console.warn("cart parse error", e);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch (e) {
      console.warn("cart persist error", e);
    }
  }, [lines]);

  /* ============================================================
                    ADD TO CART + TOAST
  ============================================================ */
  const add = (product: Product, qty = 1) => {
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.product.id === product.id);

      if (idx === -1) {
        showToast("Added to cart ✓");
        return [...prev, { product, quantity: qty }];
      } else {
        const copy = [...prev];
        copy[idx] = {
          product,
          quantity: Math.max(1, copy[idx].quantity + qty),
        };
        showToast("Updated quantity ✓");
        return copy;
      }
    });

    console.log("Cart: add", product.id, "qty", qty);
  };

  /* ============================================================
                    SET QUANTITY
  ============================================================ */
  const setQty = (productId: number, qty: number) => {
    setLines((prev) => {
      const copy = prev.map((l) =>
        l.product.id === productId
          ? { ...l, quantity: Math.max(1, qty) }
          : l
      );
      console.log("Cart: setQty", productId, qty);
      return copy;
    });
  };

  /* ============================================================
                    REMOVE ITEM
  ============================================================ */
  const remove = (productId: number) => {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
    console.log("Cart: remove", productId);
  };

  /* ============================================================
                    CLEAR CART
  ============================================================ */
  const clear = () => {
    setLines([]);
    console.log("Cart: clear");
  };

  /* ============================================================
                    TOTAL COUNT
  ============================================================ */
  const totalItems = lines.reduce((s, l) => s + l.quantity, 0);

  return (
    <CartContext.Provider
      value={{ lines, add, setQty, remove, clear, totalItems }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextShape {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
