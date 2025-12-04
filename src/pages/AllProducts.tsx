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
    <div className="container" style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 16 }}>
      <div className="card" style={{ position: "sticky", top: 86, height: "fit-content" }}>
        <h3 style={{ marginTop: 0 }}>Filters</h3>

        <div style={{ fontWeight: 700, marginTop: 6 }}>Category</div>
        <select className="input" value={catId} onChange={(e)=>{ setCatId(e.target.value ? Number(e.target.value) : ""); setSubId(""); }}>
          <option value="">All</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <div style={{ fontWeight: 700, marginTop: 6 }}>Subcategory</div>
        <select className="input" value={subId} onChange={(e)=> setSubId(e.target.value ? Number(e.target.value) : "")}>
          <option value="">All</option>
          {filteredSubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <div style={{ fontWeight: 700, marginTop: 6, marginBottom: 6 }}>Weight</div>
        <div style={{ display: "grid", gap: 6, maxHeight: 280, overflow: "auto" }}>
          {WEIGHTS.map(([a,b])=>{
            const key = `${a}-${b}`;
            return (
              <label key={key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={weightKeys.includes(key)} onChange={()=>toggleWeight(key)} />
                {a}–{b} g
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <div className="grid">
          {filteredProducts.map(p => <ProductCard key={p.id} p={p} onClickAdd={() => add(p)} />)}
        </div>
        {filteredProducts.length === 0 && <p>No products found.</p>}
      </div>
    </div>
  );
}
