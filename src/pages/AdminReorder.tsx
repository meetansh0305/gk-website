import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const ADMIN_EMAIL = "meetansh0305@gmail.com";

type Category = { id: number; name: string };
type Subcategory = { id: number; name: string; category_id: number };
type Product = { id: number; image_url?: string | null; weight?: number | null; is_live_stock?: boolean; sort_order?: number | null };

export default function AdminReorder() {
  const [ok, setOk] = useState<boolean | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [subcategoryId, setSubcategoryId] = useState<number | "">("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setOk(data?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
    })();
  }, []);

  useEffect(() => { loadCats(); }, []);

  const loadCats = async () => {
    const { data: c } = await supabase.from("categories").select("*").order("name");
    setCats((c as Category[]) ?? []);
    const { data: s } = await supabase.from("subcategories").select("*").order("name");
    setSubs((s as Subcategory[]) ?? []);
  };

  const loadProducts = async (subcatId?: number | "") => {
    if (!subcatId) { setProducts([]); return; }
    const { data } = await supabase.from("products").select("*").eq("subcategory_id", Number(subcatId)).order("sort_order", { ascending: true }).order("id", { ascending: true });
    setProducts((data as Product[] | null) ?? []);
  };

  useEffect(() => { if (subcategoryId) loadProducts(Number(subcategoryId)); else setProducts([]); }, [subcategoryId]);

  const onDragStart = (e: React.DragEvent, index: number) => { setDragIndex(index); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const next = [...products];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setDragIndex(index);
    setProducts(next);
  };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragIndex(null); };
  const moveIndex = (from: number, to: number) => {
    if (to < 0 || to >= products.length) return;
    const next = [...products];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setProducts(next);
  };

  const saveOrder = async () => {
    if (products.length === 0) { setMsg("No products to save."); return; }
    setSaving(true);
    setMsg(null);
    const payload = products.map((p, i) => ({ id: p.id, sort_order: i + 1 }));
    const { error } = await supabase.from("products").upsert(payload as any);
    setSaving(false);
    if (error) setMsg("Save failed: " + error.message);
    else { setMsg("Order saved successfully!"); loadProducts(Number(subcategoryId)); }
  };

  if (ok === null) return null;
  if (!ok) return <div className="container"><div className="card" style={{ textAlign: "center", padding: 40 }}>No admin access.</div></div>;

  return (
    <div>
      <h2 className="section-title" style={{ color: "var(--accent-dark)", marginBottom: 16 }}>Reorder Products</h2>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div style={{ minWidth: 220 }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Category</label>
            <select className="input" value={categoryId} onChange={(e) => { setCategoryId(e.target.value ? Number(e.target.value) : ""); setSubcategoryId(""); }}>
              <option value="">Choose category</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ minWidth: 260 }}>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Subcategory</label>
            <select className="input" value={subcategoryId} onChange={(e) => setSubcategoryId(e.target.value ? Number(e.target.value) : "")} disabled={!categoryId}>
              <option value="">Choose subcategory</option>
              {subs.filter((s) => !categoryId || Number(s.category_id) === Number(categoryId)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button className="btn" onClick={() => loadProducts(Number(subcategoryId))} disabled={!subcategoryId}>Refresh</button>
            <button className="btn primary" onClick={saveOrder} disabled={saving || products.length === 0}>{saving ? "Saving…" : "Save Order"}</button>
          </div>
        </div>
      </div>

      <div className="card">
        {msg && <div style={{ marginBottom: 16, padding: 12, background: msg.includes("failed") ? "#fee" : "#e8f9ee", borderRadius: 8, color: msg.includes("failed") ? "#c00" : "#2e7d32", fontWeight: 600 }}>{msg}</div>}
        {products.length === 0 && <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No products found.</div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {products.map((p, idx) => (
            <div key={p.id} draggable onDragStart={(e) => onDragStart(e, idx)} onDragOver={(e) => onDragOver(e, idx)} onDrop={onDrop} onDragEnd={() => setDragIndex(null)} style={{ display: "flex", gap: 16, alignItems: "center", background: "#fff", padding: 14, borderRadius: 10, boxShadow: "var(--shadow-soft)", border: "1px solid var(--border-light)", cursor: "grab" }}>
              <div style={{ width: 80, height: 80, borderRadius: 8, overflow: "hidden", background: "var(--bg-cream)" }}>
                <img src={p.image_url || ""} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: "var(--accent-dark)" }}>#{p.id}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Weight: {p.weight != null ? `${Number(p.weight).toFixed(2)} g` : "-"}</div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" onClick={() => moveIndex(idx, idx - 1)}>▲</button>
                <button className="btn" onClick={() => moveIndex(idx, idx + 1)}>▼</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
