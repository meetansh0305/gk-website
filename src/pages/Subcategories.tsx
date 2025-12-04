import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import ProductCard from "../components/ProductCard";
import { useCart } from "../state/CartContext";

type Subcategory = { id: number; name: string; category_id: number };
type Product = { id: number; image_url: string | null; weight: number | null; is_live_stock?: boolean; };

const WEIGHT_BUCKETS = [
  [0,5],[5,10],[10,15],[15,20],[20,25],[25,30],[30,35],[35,40],[40,45],[45,50],[50,55],[55,60],[60,65],[65,70],[70,75],[75,80]
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
      const { data: s } = await supabase.from("subcategories").select("*").eq("id", Number(subcategoryId)).single();
      setSub(s ?? null);

      const { data: prods } = await supabase
        .from("products")
        .select("*")
        .eq("subcategory_id", Number(subcategoryId))
        .order("id", { ascending: false });

      setProducts((prods as any[]) ?? []);
    })();
  }, [subcategoryId]);

  const filtered = useMemo(() => {
    if (selectedRanges.length === 0) return products;
    return products.filter((p) => {
      const w = Number(p.weight ?? 0);
      return selectedRanges.some((key) => {
        const [a, b] = key.split("-").map(Number);
        return w >= a && w < b;
      });
    });
  }, [products, selectedRanges]);

  const toggleRange = (rangeKey: string) => setSelectedRanges(prev => prev.includes(rangeKey) ? prev.filter(k=>k!==rangeKey) : [...prev, rangeKey]);

  const bannerUrl = products[0]?.image_url ?? "https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?q=80&w=1600&auto=format&fit=crop";

  return (
    <div>
      <div style={{ width: "100%", height: 360, background: `url('${bannerUrl}') center/cover no-repeat`, display: "flex", alignItems: "center" }}>
        <div style={{ marginLeft: "6%", background: "rgba(255,255,255,.9)", padding: "12px 16px", borderRadius: 12, fontWeight: 800 }}>
          {sub?.name}
        </div>
      </div>

      <div className="container" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
        <div className="card" style={{ position: "sticky", top: 86, height: "fit-content" }}>
          <h3 style={{ marginTop: 0 }}>Filters</h3>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Weight</div>
          <div style={{ display: "grid", gap: 6 }}>
            {WEIGHT_BUCKETS.map(([a,b]) => {
              const key = `${a}-${b}`;
              return (
                <label key={key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="checkbox" checked={selectedRanges.includes(key)} onChange={()=>toggleRange(key)} />
                  {a}–{b} g
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <div className="grid">
            {filtered.map((p) => (
              <ProductCard key={p.id} p={p} onClickAdd={() => add(p)} />
            ))}
            {filtered.length === 0 && <p>No products match the selected weight.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
