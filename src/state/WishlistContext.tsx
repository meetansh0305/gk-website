import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";

type Product = {
  id: number;
  image_url: string | null;
  weight?: number | null;
  name?: string | null;
  is_live_stock?: boolean;
};

type WishlistContextType = {
  wishlist: Product[];
  addToWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: number) => Promise<void>;
  isInWishlist: (productId: number) => boolean;
  loading: boolean;
};

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        setWishlist([]);
        setLoading(false);
        return;
      }

      // Load from localStorage (simple implementation)
      const stored = localStorage.getItem(`wishlist_${authData.user.id}`);
      if (stored) {
        const productIds = JSON.parse(stored) as number[];
        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from("products")
            .select("id, image_url, weight, name, is_live_stock")
            .in("id", productIds);
          setWishlist((products as Product[]) ?? []);
        }
      }
    } catch (e) {
      console.error("Load wishlist error:", e);
    } finally {
      setLoading(false);
    }
  };

  const addToWishlist = async (product: Product) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        alert("Please login to add items to wishlist");
        return;
      }

      const stored = localStorage.getItem(`wishlist_${authData.user.id}`);
      const productIds = stored ? JSON.parse(stored) : [];
      
      if (!productIds.includes(product.id)) {
        productIds.push(product.id);
        localStorage.setItem(`wishlist_${authData.user.id}`, JSON.stringify(productIds));
        setWishlist((prev) => [...prev, product]);
      }
    } catch (e) {
      console.error("Add to wishlist error:", e);
    }
  };

  const removeFromWishlist = async (productId: number) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;

      const stored = localStorage.getItem(`wishlist_${authData.user.id}`);
      const productIds = stored ? JSON.parse(stored) : [];
      const updated = productIds.filter((id: number) => id !== productId);
      
      localStorage.setItem(`wishlist_${authData.user.id}`, JSON.stringify(updated));
      setWishlist((prev) => prev.filter((p) => p.id !== productId));
    } catch (e) {
      console.error("Remove from wishlist error:", e);
    }
  };

  const isInWishlist = (productId: number) => {
    return wishlist.some((p) => p.id === productId);
  };

  return (
    <WishlistContext.Provider value={{ wishlist, addToWishlist, removeFromWishlist, isInWishlist, loading }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within WishlistProvider");
  }
  return context;
}

