import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import ProductCard from "../components/ProductCard";
import { useCart } from "../state/CartContext";

type Subcategory = { id: number; name: string; category_id: number };
type Product = {
  id: number;
  image_url: string | null;
  weight: number | null;
  is_live_stock?: boolean;
  stock_qty?: number | null;
};

const WEIGHT_BUCKETS = [
  [0, 5],
  [5, 10],
  [10, 15],
  [15, 20],
  [20, 25],
  [25, 30],
  [30, 35],
  [35, 40],
  [40, 45],
  [45, 50],
  [50, 55],
  [55, 60],
  [60, 65],
  [65, 70],
  [70, 75],
  [75, 80],
];

export default function SubcategoryPage() {
  const { subcategoryId } = useParams();
  const [sub, setSub] = useState<Subcategory | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedRanges, setSelectedRanges] = useState<string[]>([]);
  const { add } = useCart();

  useEffect(() => {
    if (!subcategoryId) return;

    (async () => {
      const { data: s } = await supabase
        .from("subcategories")
        .select("*")
        .eq("id", Number(subcategoryId))
        .single();

      setSub(s ?? null);

      const { data: prods } = await supabase
        .from("products")
        .select("*")
        .eq("subcategory_id", Number(subcategoryId))
        .order("id", { ascending: false });

      setProducts((prods as Product[]) ?? []);
    })();
  }, [subcategoryId]);

  const ordered = useMemo(() => {
    const live = products.filter((p) => p.is_live_stock);
    const normal = products.filter((p) => !p.is_live_stock);
    return [...live, ...normal];
  }, [products]);

  const filtered = useMemo(() => {
    if (selectedRanges.length === 0) return ordered;
    return ordered.filter((p) => {
      const w = Number(p.weight ?? 0);
      return selectedRanges.some((key) => {
        const [a, b] = key.split("-").map(Number);
        return w >= a && w < b;
      });
    });
  }, [ordered, selectedRanges]);

  const toggleRange = (key: string) =>
    setSelectedRanges((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );

  const bannerUrl =
    products[0]?.image_url ??
    "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1600&auto=format&fit=crop";

  return (
    <div>
      {/* Premium Banner */}
      <div
        style={{
          width: "100%",
          height: 300,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `url('${bannerUrl}') center/cover no-repeat`,
            filter: "blur(2px)",
            transform: "scale(1.05)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(7, 30, 51, 0.7) 0%, rgba(7, 30, 51, 0.3) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "6%",
            bottom: 40,
            zIndex: 1,
          }}
        >
          <h1
            style={{
              color: "#fff",
              fontSize: 36,
              fontWeight: 700,
              margin: 0,
              fontFamily: "'Playfair Display', Georgia, serif",
              textShadow: "0 2px 20px rgba(0,0,0,0.3)",
            }}
          >
            {sub?.name}
          </h1>
          <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, marginTop: 8 }}>
            {filtered.length} products available
          </p>
        </div>
      </div>

      <div className="container">
        <div className="page-layout" style={{ marginTop: 24 }}>
          {/* FILTERS */}
          <div className="filter-sidebar">
            <h3>Filters</h3>
            <div className="filter-label">Weight Range</div>

            <div style={{ maxHeight: 400, overflowY: "auto" }}>
              {WEIGHT_BUCKETS.map(([a, b]) => {
                const key = `${a}-${b}`;
                return (
                  <label key={key} className="filter-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedRanges.includes(key)}
                      onChange={() => toggleRange(key)}
                    />
                    {a}–{b} grams
                  </label>
                );
              })}
            </div>

            {selectedRanges.length > 0 && (
              <button
                className="btn"
                style={{ width: "100%", marginTop: 16 }}
                onClick={() => setSelectedRanges([])}
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* PRODUCTS */}
          <div>
            <div className="grid" style={{ justifyItems: "center" }}>
              {filtered.map((p) => (
                <ProductCard key={p.id} p={p} onClickAdd={() => add(p)} />
              ))}
            </div>

            {filtered.length === 0 && (
              <div style={{ textAlign: "center", padding: 60, color: "#666" }}>
                <p style={{ fontSize: 18, marginBottom: 8 }}>No products found</p>
                <p style={{ fontSize: 14 }}>Try adjusting your filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
