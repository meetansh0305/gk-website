// src/pages/AdminReorder.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const ADMIN_EMAIL = "meetansh0305@gmail.com";

type Category = { id: number; name: string };
type Subcategory = { id: number; name: string; category_id: number };
type Product = {
  id: number;
  image_url?: string | null;
  weight?: number | null;
  is_live_stock?: boolean;
  sort_order?: number | null;
};

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

  // check admin
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const email = data?.user?.email?.toLowerCase() || "";
      setOk(email === ADMIN_EMAIL.toLowerCase());
    })();
  }, []);

  useEffect(() => {
    loadCats();
  }, []);

  const loadCats = async () => {
    const { data: c } = await supabase.from("categories").select("*").order("name");
    setCats(c ?? []);
    const { data: s } = await supabase.from("subcategories").select("*").order("name");
    setSubs(s ?? []);
  };

  const loadProducts = async (subcatId?: number | "") => {
    if (!subcatId) {
      setProducts([]);
      return;
    }
    // order by sort_order asc, then id fallback
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("subcategory_id", Number(subcatId))
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }); // secondary
    setProducts((data as Product[] | null) ?? []);
  };

  // when subcategory changes
  useEffect(() => {
    if (!subcategoryId) {
      setProducts([]);
      return;
    }
    loadProducts(Number(subcategoryId));
  }, [subcategoryId]);

  // DnD handlers (HTML5)
  const onDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = "move";
    try {
      // required for firefox
      e.dataTransfer.setData("text/plain", String(index));
    } catch {}
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    // visual — optional: swap in memory as you drag
    if (dragIndex === null || dragIndex === index) return;
    const next = [...products];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setDragIndex(index);
    setProducts(next);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragIndex(null);
  };

  const onDragEnd = () => {
    setDragIndex(null);
  };

  // keyboard reordering: move up / down using buttons
  const moveIndex = (from: number, to: number) => {
    if (to < 0 || to >= products.length) return;
    const next = [...products];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    setProducts(next);
  };

  // Save new order: assign sort_order = index+1
  const saveOrder = async () => {
    if (products.length === 0) {
      setMsg("No products to save.");
      return;
    }
    setSaving(true);
    setMsg(null);

    // Prepare upsert payload
    const payload = products.map((p, i) => ({
      id: p.id,
      sort_order: i + 1,
    }));

    const { error } = await supabase.from("products").upsert(payload, { returning: "minimal" });
    setSaving(false);
    if (error) {
      setMsg("Save failed: " + error.message);
    } else {
      setMsg("Order saved successfully!");
      // refresh to ensure canonical ordering
      loadProducts(Number(subcategoryId));
    }
  };

  if (ok === null) return null;
  if (!ok) return <div className="container">No admin access.</div>;

  return (
    <div className="container">
      <h2 className="section-title">Admin — Reorder Products (by Subcategory)</h2>

      <div className="card" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ minWidth: 220 }}>
            <label style={{ fontSize: 12, opacity: 0.8 }}>Category</label>
            <select
              className="input"
              value={categoryId}
              onChange={(e) => {
                const v = e.target.value;
                setCategoryId(v ? Number(v) : "");
                setSubcategoryId("");
              }}
            >
              <option value="">Choose category</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ minWidth: 260 }}>
            <label style={{ fontSize: 12, opacity: 0.8 }}>Subcategory</label>
            <select
              className="input"
              value={subcategoryId}
              onChange={(e) => {
                const v = e.target.value;
                setSubcategoryId(v ? Number(v) : "");
              }}
              disabled={!categoryId}
            >
              <option value="">Choose subcategory</option>
              {subs
                .filter((s) => !categoryId || Number(s.category_id) === Number(categoryId))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button className="btn" onClick={() => loadProducts(Number(subcategoryId))} disabled={!subcategoryId}>
              Refresh
            </button>
            <button className="btn" onClick={saveOrder} disabled={saving || products.length === 0}>
              {saving ? "Saving…" : "Save Order"}
            </button>
          </div>
        </div>
        <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
          Tip: drag an item and drop it where you want. You can also use the Up / Down buttons.
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 800 }}>Products in subcategory</div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>{products.length} items</div>
        </div>

        {msg && (
          <div style={{ marginBottom: 12 }}>
            <strong>{msg}</strong>
          </div>
        )}

        {products.length === 0 && <div>No products found for selected subcategory.</div>}

        <div style={{ display: "grid", gap: 10 }}>
          {products.map((p, idx) => (
            <div
              key={p.id}
              draggable
              onDragStart={(e) => onDragStart(e, idx)}
              onDragOver={(e) => onDragOver(e, idx)}
              onDrop={onDrop}
              onDragEnd={onDragEnd}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "center",
                background: "#fff",
                padding: 10,
                borderRadius: 8,
                boxShadow: "0 6px 18px rgba(0,0,0,0.04)",
                border: "1px solid #eee",
              }}
            >
              <div style={{ width: 84, height: 84, borderRadius: 8, overflow: "hidden", flexShrink: 0, background: "#fafafa" }}>
                <img
                  src={p.image_url || "https://images.unsplash.com/photo-1606313564200-e75d5e30476e?q=80&w=1200&auto=format&fit=crop"}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>#{p.id} {p.is_live_stock ? <span style={{ color: "#c62828", fontWeight: 700, marginLeft: 8 }}>LIVE</span> : null}</div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>
                  Weight: {p.weight != null ? `${Number(p.weight).toFixed(2)} g` : "-"} • sort_order: {p.sort_order ?? "—"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn" onClick={() => moveIndex(idx, Math.max(0, idx - 1))} title="Move up">▲</button>
                <button className="btn" onClick={() => moveIndex(idx, Math.min(products.length - 1, idx + 1))} title="Move down">▼</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
