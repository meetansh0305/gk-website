import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Product } from "../types";
import ProductCard from "../components/ProductCard";
import { useCart } from "../state/CartContext";

export default function LiveStock() {
  const [items, setItems] = useState<Product[]>([]);
  const { add } = useCart(); // <-- USE CART CONTEXT

  useEffect(() => {
    supabase
      .from("products")
      .select("*")
      .eq("is_live_stock", true)
      .order("id", { ascending: false })
      .then(({ data }) => setItems(data ?? []));
  }, []);

  return (
    <div>
      <div
        style={{
          width: "100%",
          height: 220,
          background:
            "url('https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1600&auto=format&fit=crop') center/cover no-repeat",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 36,
          fontWeight: 800,
          textShadow: "0 4px 18px rgba(0,0,0,0.5)",
        }}
      >
        Live Stock
      </div>

      <div className="container" style={{ marginTop: 30 }}>
        {/* Title + Live Dot */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>Available Live Stock</div>
          <div style={{ display: "flex", alignItems: "center", marginLeft: 12, gap: 4 }}>
            <span style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "red",
              display: "inline-block",
            }}/>
            <span style={{ fontSize: 13, fontWeight: 700, color: "red" }}>Live</span>
          </div>
        </div>

        {/* Grid */}
        <div className="grid">
          {items.map((product) => (
            <ProductCard key={product.id} p={product} onClickAdd={() => add(product)} />
          ))}
        </div>

        {items.length === 0 && (
          <p style={{ opacity: 0.6, marginTop: 20 }}>No live stock items available.</p>
        )}
      </div>
    </div>
  );
}
