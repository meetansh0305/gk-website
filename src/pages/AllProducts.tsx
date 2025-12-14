import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import ProductCard from "../components/ProductCard";
import { useCart } from "../state/CartContext";

type Category = { id: number; name: string };
type Subcategory = { id: number; name: string; category_id: number };
type Product = { id: number; image_url: string | null; weight: number | null; is_live_stock?: boolean; category_id: number; subcategory_id: number | null };

const WEIGHTS = [
  [0,5],[5,10],[10,15],[15,20],[20,25],[25,30],[30,35],[35,40],[40,45],[45,50],[50,55],[55,60],[60,65],[65,70],[70,75],[75,80]
];

export default function AllProducts() {
  const [cats, setCats] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [catId, setCatId] = useState<number | "">("");
  const [subId, setSubId] = useState<number | "">("");
  const [weightKeys, setWeightKeys] = useState<string[]>([]);
  const { add } = useCart();

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("categories").select("*").order("name");
      setCats(c ?? []);
      const { data: s } = await supabase.from("subcategories").select("*").order("name");
      setSubs(s ?? []);
      const { data: p } = await supabase.from("products").select("*").order("id", { ascending: false });
      setProducts((p as any[]) ?? []);
    })();
  }, []);

  const filteredSubs = useMemo(() => (catId ? subs.filter(s => s.category_id === Number(catId)) : subs), [subs, catId]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (catId) list = list.filter(p => p.category_id === Number(catId));
    if (subId) list = list.filter(p => p.subcategory_id === Number(subId));
    if (weightKeys.length > 0) {
      list = list.filter(p => {
        const w = Number(p.weight ?? 0);
        return weightKeys.some(k => {
          const [a,b] = k.split("-").map(Number);
          return w >= a && w < b;
        });
      });
    }
    return list;
  }, [products, catId, subId, weightKeys]);

  const toggleWeight = (key: string) => setWeightKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  return (
    <div className="container">
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ 
          fontSize: 28, 
          fontWeight: 700, 
          color: "#071E33", 
          margin: 0,
          fontFamily: "'Playfair Display', Georgia, serif",
        }}>
          All Products
        </h1>
        <p style={{ color: "#666", fontSize: 14, marginTop: 4 }}>
          {filteredProducts.length} products found
        </p>
      </div>

      <div className="page-layout">
        {/* FILTERS SIDEBAR */}
        <div className="filter-sidebar">
          <h3>Filters</h3>

          <div className="filter-label">Category</div>
          <select 
            className="input" 
            value={catId} 
            onChange={(e) => { setCatId(e.target.value ? Number(e.target.value) : ""); setSubId(""); }}
            style={{ marginBottom: 12 }}
          >
            <option value="">All Categories</option>
            {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <div className="filter-label">Subcategory</div>
          <select 
            className="input" 
            value={subId} 
            onChange={(e) => setSubId(e.target.value ? Number(e.target.value) : "")}
            style={{ marginBottom: 16 }}
          >
            <option value="">All Subcategories</option>
            {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <div className="filter-label">Weight Range</div>
          <div style={{ maxHeight: 300, overflowY: "auto", paddingRight: 8 }}>
            {WEIGHTS.map(([a,b]) => {
              const key = `${a}-${b}`;
              return (
                <label key={key} className="filter-checkbox">
                  <input 
                    type="checkbox" 
                    checked={weightKeys.includes(key)} 
                    onChange={() => toggleWeight(key)} 
                  />
                  {a}–{b} grams
                </label>
              );
            })}
          </div>

          {(catId || subId || weightKeys.length > 0) && (
            <button
              className="btn"
              style={{ width: "100%", marginTop: 16 }}
              onClick={() => { setCatId(""); setSubId(""); setWeightKeys([]); }}
            >
              Clear All Filters
            </button>
          )}
        </div>

        {/* PRODUCTS GRID */}
        <div>
          <div className="grid" style={{ justifyItems: "center" }}>
            {filteredProducts.map(p => <ProductCard key={p.id} p={p} onClickAdd={() => add(p)} />)}
          </div>
          {filteredProducts.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "#666" }}>
              <p style={{ fontSize: 18, marginBottom: 8 }}>No products found</p>
              <p style={{ fontSize: 14 }}>Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
