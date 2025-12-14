import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const DEFAULT_MUMBAI_LOCATION_ID = 2;

export default function ProductsAdmin() {
  const [products, setProducts] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  const [q, setQ] = useState("");

  const [weight, setWeight] = useState("");
  const [stockQty, setStockQty] = useState("1");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [subcategoryId, setSubcategoryId] = useState<number | "">("");
  const [isLive, setIsLive] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showOnWebsite, setShowOnWebsite] = useState(true);
  const [locationId, setLocationId] = useState<number | "">(DEFAULT_MUMBAI_LOCATION_ID);

  const [addingCat, setAddingCat] = useState(false);
  const [newCat, setNewCat] = useState("");
  const [addingSub, setAddingSub] = useState(false);
  const [newSub, setNewSub] = useState("");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const { data: p } = await supabase.from("products").select("*").order("id", { ascending: false });
      setProducts((p as any[]) ?? []);

      const { data: c } = await supabase.from("categories").select("*").order("name");
      setCats(c ?? []);

      const { data: s } = await supabase.from("subcategories").select("*").order("name");
      setSubs(s ?? []);

      const { data: locs } = await supabase.from("locations").select("*").order("id");
      setLocations(locs ?? []);

      if (!locationId && locs && locs.length) {
        const mum = (locs as any[]).find((x: any) => (x.code || "").toUpperCase() === "MUM") ?? locs[0];
        setLocationId(mum?.id ?? locs[0]?.id ?? "");
      }
    } catch (err) {
      console.error("loadAll error", err);
      alert("Failed to load products or meta.");
    } finally {
      setLoading(false);
    }
  }

  async function addCategory() {
    const nm = newCat.trim();
    if (!nm) return alert("Enter category name");
    setLoading(true);
    try {
      const { error } = await supabase.from("categories").insert({ name: nm });
      if (error) throw error;
      setNewCat("");
      setAddingCat(false);
      await loadAll();
      alert("Category added");
    } catch (err: any) {
      alert("Failed to create category: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function addSubcategory() {
    const nm = newSub.trim();
    if (!nm) return alert("Enter subcategory name");
    if (!categoryId) return alert("Select category first");
    setLoading(true);
    try {
      const { error } = await supabase.from("subcategories").insert({
        name: nm,
        category_id: Number(categoryId),
      });
      if (error) throw error;
      setNewSub("");
      setAddingSub(false);
      await loadAll();
      alert("Subcategory added");
    } catch (err: any) {
      alert("Failed to create subcategory: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  async function addProduct() {
    if (!weight || isNaN(Number(weight))) return alert("Enter valid weight (grams)");
    if (!categoryId) return alert("Select category");
    if (!subcategoryId) return alert("Select subcategory");
    if (!imageFile) return alert("Please choose an image file");
    if (isNaN(Number(stockQty)) || Number(stockQty) <= 0) return alert("Enter stock quantity >= 1");
    if (!locationId) return alert("Select location");

    const stockN = Math.floor(Number(stockQty));
    if (stockN > 200) {
      if (!confirm(`You're adding ${stockN} items. Continue?`)) return;
    }

    setLoading(true);
    try {
      const ext = imageFile.name.split(".").pop();
      const fileName = `${Date.now()}.${ext}`;
      const uploadRes = await supabase.storage.from("Products").upload(fileName, imageFile);
      if (uploadRes.error) throw uploadRes.error;
      const { data: pub } = supabase.storage.from("Products").getPublicUrl(fileName);
      const image_url = pub?.publicUrl ?? null;

      const productInsert = {
        name: `P-${Math.floor(Math.random() * 90000) + 10000}`,
        image_url,
        weight: Number(weight),
        is_live_stock: Boolean(isLive),
        category_id: Number(categoryId),
        subcategory_id: Number(subcategoryId),
        sort_order: null,
        position: null,
      };

      const { data: prodData, error: prodErr } = await supabase.from("products").insert(productInsert).select().single();
      if (prodErr) throw prodErr;
      const createdProduct = prodData;

      const itemsToInsert: any[] = [];
      for (let i = 0; i < stockN; i++) {
        itemsToInsert.push({
          product_id: createdProduct.id,
          sku: null,
          weight: Number(weight),
          image_url,
          is_live_stock: Boolean(isLive),
          stock_qty: 1,
          sort_order: null,
          current_location_id: Number(locationId),
          show_on_website: Boolean(showOnWebsite),
          sold: false,
          sold_at: null,
          location_history_note: null,
          position: null,
        });
      }

      const { data: itemsData, error: itemsErr } = await supabase.from("product_items").insert(itemsToInsert).select();
      await supabase.from("products").update({ stock_qty: stockN }).eq("id", createdProduct.id);
      if (itemsErr) throw itemsErr;

      alert(`Product and ${itemsData?.length ?? stockN} item(s) added successfully.`);
      setWeight("");
      setStockQty("1");
      setCategoryId("");
      setSubcategoryId("");
      setIsLive(false);
      setImageFile(null);
      setShowOnWebsite(true);
      await loadAll();
    } catch (err: any) {
      alert("Failed to add product: " + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct(p: any) {
    if (!confirm(`Delete product #${p.id}? This will also delete product_items.`)) return;
    setLoading(true);
    try {
      await supabase.from("product_items").delete().eq("product_id", p.id);
      await supabase.from("products").delete().eq("id", p.id);
      alert("Deleted.");
      await loadAll();
    } catch (err: any) {
      alert("Failed to delete product: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  }

  const filtered = products.filter((p) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return String(p.id).includes(t) || (p.name || "").toLowerCase().includes(t);
  });

  return (
    <div>
      <h2 className="section-title" style={{ color: "var(--accent-dark)", marginBottom: 16 }}>Products — Admin</h2>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ margin: "0 0 16px 0", color: "var(--primary-dark)", fontWeight: 700 }}>Add Product</h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <input className="input" placeholder="Weight (grams)" type="number" step="0.01" value={weight} onChange={(e) => setWeight(e.target.value)} />
          <input className="input" placeholder="Stock quantity" type="number" min={1} value={stockQty} onChange={(e) => setStockQty(e.target.value)} />

          <select className="input" value={categoryId} onChange={(e) => {
            const v = e.target.value;
            if (v === "__add_new__") { setAddingCat(true); setCategoryId(""); }
            else { setCategoryId(v ? Number(v) : ""); setAddingCat(false); }
            setSubcategoryId("");
          }}>
            <option value="">Select category</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            <option value="__add_new__">+ Add new category...</option>
          </select>

          {addingCat && (
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input" placeholder="New category" value={newCat} onChange={(e) => setNewCat(e.target.value)} style={{ flex: 1 }} />
              <button className="btn primary" onClick={addCategory}>Save</button>
            </div>
          )}

          <select className="input" value={subcategoryId} onChange={(e) => {
            const v = e.target.value;
            if (v === "__add_new_sub__") { setAddingSub(true); setSubcategoryId(""); }
            else { setSubcategoryId(v ? Number(v) : ""); setAddingSub(false); }
          }} disabled={!categoryId}>
            <option value="">Select subcategory</option>
            {subs.filter((s) => !categoryId || Number(s.category_id) === Number(categoryId)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            <option value="__add_new_sub__">+ Add new subcategory...</option>
          </select>

          {addingSub && (
            <div style={{ display: "flex", gap: 8 }}>
              <input className="input" placeholder="New subcategory" value={newSub} onChange={(e) => setNewSub(e.target.value)} style={{ flex: 1 }} />
              <button className="btn primary" onClick={addSubcategory}>Save</button>
            </div>
          )}

          <select className="input" value={locationId} onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : "")}>
            <option value="">Select location</option>
            {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name} {l.code ? `(${l.code})` : ""}</option>)}
          </select>

          <input className="input" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: 16, flexWrap: "wrap", alignItems: "center" }}>
          <label className="filter-checkbox">
            <input type="checkbox" checked={isLive} onChange={(e) => setIsLive(e.target.checked)} />
            Mark as Live Stock
          </label>
          <label className="filter-checkbox">
            <input type="checkbox" checked={showOnWebsite} onChange={(e) => setShowOnWebsite(e.target.checked)} />
            Show on website
          </label>
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
          <button className="btn primary" onClick={addProduct} disabled={loading}>{loading ? "Working..." : "Add Product"}</button>
          <button className="btn" onClick={() => { setWeight(""); setStockQty("1"); setCategoryId(""); setSubcategoryId(""); setIsLive(false); setImageFile(null); setShowOnWebsite(true); }}>Clear</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <input className="input" placeholder="Search products by ID or name…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: "100%", maxWidth: 400 }} />
      </div>

      <div className="grid">
        {filtered.map((p) => (
          <div key={p.id} className="card">
            <div className="image-wrap">
              <img src={p.image_url ?? ""} alt={p.name ?? ""} className="product" />
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 800, color: "var(--accent-dark)", fontSize: 16 }}>#{p.id}</div>
              <div style={{ fontSize: 14, color: "var(--accent)", fontWeight: 600 }}>{p.weight ? Number(p.weight).toFixed(2) : "-"} g</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Cat: {p.category_id}, Sub: {p.subcategory_id}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Items: {p.stock_qty ?? 0}</div>
            </div>
            <div style={{ marginTop: 12 }}>
              <button className="btn danger" onClick={() => deleteProduct(p)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && <div className="card" style={{ marginTop: 16, textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No products found.</div>}
    </div>
  );
}
