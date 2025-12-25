import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { createWorker } from "tesseract.js";

function downloadCsv(filename: string, rows: Array<Array<string | number | null>>) {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          if (cell == null) return "";
          const s = String(cell).replace(/"/g, '""');
          if (s.search(/,|\n|"/) >= 0) return `"${s}"`;
          return s;
        })
        .join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const DEFAULT_MUMBAI_LOCATION_ID = 2;

export default function ProductsAdmin() {
  const [products, setProducts] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  const [q, setQ] = useState("");
  const [filterCatId, setFilterCatId] = useState<number | "">("");
  const [filterSubId, setFilterSubId] = useState<number | "">("");
  const [weightKeys, setWeightKeys] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [sharing, setSharing] = useState(false);
  const [showShareInfo, setShowShareInfo] = useState(() => {
    const dismissed = localStorage.getItem('share-info-dismissed');
    return !dismissed;
  });

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

  // Bulk add state
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [bulkImages, setBulkImages] = useState<File[]>([]);
  const [bulkProducts, setBulkProducts] = useState<Array<{
    file: File;
    imagePreview: string;
    detectedWeight: string;
    weight: string;
    category_id: number | "";
    subcategory_id: number | "";
    location_id: number | "";
    is_live_stock: boolean;
    show_on_website: boolean;
    location_history_note: string;
  }>>([]);
  const [processingOCR, setProcessingOCR] = useState(false);
  const [bulkCategoryId, setBulkCategoryId] = useState<number | "">("");
  const [bulkSubcategoryId, setBulkSubcategoryId] = useState<number | "">("");
  const [bulkLocationId, setBulkLocationId] = useState<number | "">(DEFAULT_MUMBAI_LOCATION_ID);
  const [bulkIsLive, setBulkIsLive] = useState(false);
  const [bulkShowOnWebsite, setBulkShowOnWebsite] = useState(true);
  const [bulkLocationNote, setBulkLocationNote] = useState("");
  const [bulkModalImage, setBulkModalImage] = useState<string | null>(null);
  const [productModalImage, setProductModalImage] = useState<string | null>(null);

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
          image_url, // Each product_item can have its own image_url (currently same as product, but can be updated individually)
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

  const WEIGHTS = [
    [0,5],[5,10],[10,15],[15,20],[20,25],[25,30],[30,35],[35,40],[40,45],[45,50],[50,55],[55,60],[60,65],[65,70],[70,75],[75,80]
  ];

  const filteredSubs = subs.filter(s => !filterCatId || Number(s.category_id) === Number(filterCatId));

  const filtered = products.filter((p) => {
    // Search filter
    const t = q.trim().toLowerCase();
    if (t) {
      const name = (p.name || "").toLowerCase();
      const id = String(p.id);
      if (!name.includes(t) && !id.includes(t)) return false;
    }
    
    // Category filter
    if (filterCatId && p.category_id !== Number(filterCatId)) return false;
    
    // Subcategory filter
    if (filterSubId && p.subcategory_id !== Number(filterSubId)) return false;
    
    // Weight filter
    if (weightKeys.length > 0) {
      const w = Number(p.weight ?? 0);
      const matches = weightKeys.some(k => {
        const [a, b] = k.split("-").map(Number);
        return w >= a && w < b;
      });
      if (!matches) return false;
    }
    
    return true;
  });

  const handleSelectProduct = (productId: number, selected: boolean) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === filtered.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filtered.map(p => p.id)));
    }
  };

  // OCR function to detect weight from image
  const detectWeightFromImage = async (imageFile: File): Promise<string> => {
    try {
      const worker = await createWorker('eng');
      const { data: { text } } = await worker.recognize(imageFile);
      await worker.terminate();

      // Extract weight from text - look for patterns like "5.250 g", "5.250g", "5.25 grams", etc.
      const weightPatterns = [
        /(\d+\.?\d*)\s*g(?:rams?)?/gi,  // "5.250 g" or "5.25 grams"
        /weight[:\s]*(\d+\.?\d*)/gi,    // "Weight: 5.250"
        /(\d+\.?\d*)\s*gm/gi,           // "5.250 gm"
        /(\d+\.?\d*)\s*gr/gi,           // "5.250 gr"
      ];

      for (const pattern of weightPatterns) {
        const matches = [...text.matchAll(pattern)];
        for (const match of matches) {
          if (match[1]) {
            const weight = match[1];
            if (weight && !isNaN(Number(weight))) {
              return Number(weight).toFixed(3);
            }
          }
        }
      }

      // Fallback: find any decimal number that looks like a weight (between 0.1 and 1000)
      const numbers = text.match(/\d+\.\d{1,3}/g) || text.match(/\d+\.\d+/g) || [];
      for (const num of numbers) {
        const val = Number(num);
        if (val >= 0.1 && val <= 1000) {
          return val.toFixed(3);
        }
      }

      return "";
    } catch (error) {
      console.error("OCR error:", error);
      return "";
    }
  };

  // Process bulk images with OCR
  const processBulkImages = async () => {
    if (bulkImages.length === 0) {
      alert("Please select images first.");
      return;
    }

    if (!bulkCategoryId || !bulkSubcategoryId || !bulkLocationId) {
      alert("Please select Category, Subcategory, and Location first.");
      return;
    }

    setProcessingOCR(true);
    const processed: typeof bulkProducts = [];

    for (const file of bulkImages) {
      const imagePreview = URL.createObjectURL(file);
      const detectedWeight = await detectWeightFromImage(file);
      
      processed.push({
        file,
        imagePreview,
        detectedWeight,
        weight: detectedWeight || "",
        category_id: bulkCategoryId,
        subcategory_id: bulkSubcategoryId,
        location_id: bulkLocationId,
        is_live_stock: bulkIsLive,
        show_on_website: bulkShowOnWebsite,
        location_history_note: bulkLocationNote,
      });
    }

    setBulkProducts(processed);
    setProcessingOCR(false);
  };

  // Add all bulk products
  const addBulkProducts = async () => {
    if (bulkProducts.length === 0) {
      alert("No products to add.");
      return;
    }

    // Validate all weights
    const invalid = bulkProducts.filter(p => !p.weight || isNaN(Number(p.weight)));
    if (invalid.length > 0) {
      alert(`Please enter valid weights for all products. ${invalid.length} product(s) have invalid weights.`);
      return;
    }

    if (!confirm(`Add ${bulkProducts.length} products?`)) return;

    setLoading(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const product of bulkProducts) {
        try {
          // Upload image
          const ext = product.file.name.split(".").pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
          const uploadRes = await supabase.storage.from("Products").upload(fileName, product.file);
          if (uploadRes.error) throw uploadRes.error;
          const { data: pub } = supabase.storage.from("Products").getPublicUrl(fileName);
          const image_url = pub?.publicUrl ?? null;

          // Create product
          const productInsert = {
            name: `P-${Math.floor(Math.random() * 90000) + 10000}`,
            image_url,
            weight: Number(product.weight),
            is_live_stock: Boolean(product.is_live_stock),
            category_id: Number(product.category_id),
            subcategory_id: Number(product.subcategory_id),
            sort_order: null,
            position: null,
          };

          const { data: prodData, error: prodErr } = await supabase.from("products").insert(productInsert).select().single();
          if (prodErr) throw prodErr;

          // Create product item
          const itemInsert = {
            product_id: prodData.id,
            sku: null,
            weight: Number(product.weight),
            image_url,
            is_live_stock: Boolean(product.is_live_stock),
            stock_qty: 1,
            sort_order: null,
            current_location_id: Number(product.location_id),
            show_on_website: Boolean(product.show_on_website),
            sold: false,
            sold_at: null,
            location_history_note: product.location_history_note || null,
            position: null,
          };

          await supabase.from("product_items").insert(itemInsert);
          await supabase.from("products").update({ stock_qty: 1 }).eq("id", prodData.id);
          
          successCount++;
        } catch (err: any) {
          console.error("Error adding product:", err);
          errorCount++;
        }
      }

      alert(`Bulk add complete! ${successCount} products added successfully.${errorCount > 0 ? ` ${errorCount} failed.` : ''}`);
      
      // Reset bulk add
      setBulkImages([]);
      setBulkProducts([]);
      setShowBulkAdd(false);
      setBulkCategoryId("");
      setBulkSubcategoryId("");
      setBulkLocationNote("");
      await loadAll();
    } catch (err: any) {
      alert("Bulk add error: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const shareSelectedImages = async () => {
    if (selectedProducts.size === 0) {
      alert("Please select at least one product to share.");
      return;
    }

    if (selectedProducts.size > 20) {
      alert("Please select maximum 20 products.");
      return;
    }

    setSharing(true);

    try {
      const selected = filtered.filter(p => selectedProducts.has(p.id) && p.image_url);
      
      if (selected.length === 0) {
        alert("Selected products don't have images.");
        setSharing(false);
        return;
      }

      const files: File[] = [];
      
      for (const product of selected) {
        try {
          const response = await fetch(product.image_url!);
          const blob = await response.blob();
          const fileName = `product-${product.id}.${blob.type.split('/')[1] || 'jpg'}`;
          const file = new File([blob], fileName, { type: blob.type });
          files.push(file);
        } catch (error) {
          console.error(`Failed to fetch image for product ${product.id}:`, error);
        }
      }

      if (files.length === 0) {
        alert("Failed to load images. Please try again.");
        setSharing(false);
        return;
      }

      if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({
          files: files,
          title: "Product Images",
        });
        setSelectedProducts(new Set());
      } else if (navigator.share) {
        const message = `Check out these ${files.length} product images:\n${selected.map(p => `Product #${p.id}`).join('\n')}`;
        await navigator.share({
          title: "Product Images",
          text: message,
        });
        setSelectedProducts(new Set());
      } else {
        alert(`Web Share API not available. Selected ${files.length} products. Please use a mobile browser with WhatsApp installed for best experience.`);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Share error:", error);
        alert("Failed to share images. Please try again.");
      }
    } finally {
      setSharing(false);
    }
  };

  const exportCsv = () => {
    const out: Array<Array<string | number | null>> = [
      ["Product ID", "Name", "Weight (g)", "Category ID", "Subcategory ID", "Stock Qty", "Is Live Stock", "Image URL"],
    ];
    filtered.forEach((p) => {
      out.push([
        p.id,
        p.name ?? "",
        p.weight != null ? Number(p.weight).toFixed(3) : "",
        p.category_id ?? "",
        p.subcategory_id ?? "",
        p.stock_qty ?? 0,
        p.is_live_stock ? "Yes" : "No",
        p.image_url ?? "",
      ]);
    });
    downloadCsv(`products-${new Date().toISOString().slice(0, 10)}.csv`, out);
  };

  return (
    <div>
      <h2 className="section-title" style={{ color: "var(--accent-dark)", marginBottom: 16 }}>Products — Admin</h2>

      {/* Toggle between single and bulk add */}
      <div className="card" style={{ marginBottom: 20, padding: 16 }}>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            className={`btn ${!showBulkAdd ? "primary" : ""}`}
            onClick={() => setShowBulkAdd(false)}
            style={{ minHeight: 44 }}
          >
            Add Single Product
          </button>
          <button
            className={`btn ${showBulkAdd ? "primary" : ""}`}
            onClick={() => setShowBulkAdd(true)}
            style={{ minHeight: 44 }}
          >
            Bulk Add Products (OCR)
          </button>
        </div>
      </div>

      {/* SINGLE PRODUCT ADD FORM */}
      {!showBulkAdd && (
      <div className="card" style={{ marginBottom: 20, padding: 24 }}>
        <h3 style={{ margin: "0 0 24px 0", color: "var(--primary-dark)", fontWeight: 700, fontSize: 20 }}>Add Product</h3>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
              Weight (grams) <span style={{ color: "#c62828" }}>*</span>
            </label>
            <input 
              className="input" 
              placeholder="Enter weight in grams" 
              type="number" 
              step="0.01" 
              value={weight} 
              onChange={(e) => setWeight(e.target.value)}
              aria-label="Product weight in grams"
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
              Stock Quantity <span style={{ color: "#c62828" }}>*</span>
            </label>
            <input 
              className="input" 
              placeholder="Number of items" 
              type="number" 
              min={1} 
              value={stockQty} 
              onChange={(e) => setStockQty(e.target.value)}
              aria-label="Stock quantity"
              required
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
              Category <span style={{ color: "#c62828" }}>*</span>
            </label>
            <select 
              className="input" 
              value={categoryId} 
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__add_new__") { setAddingCat(true); setCategoryId(""); }
                else { setCategoryId(v ? Number(v) : ""); setAddingCat(false); }
                setSubcategoryId("");
              }}
              aria-label="Select category"
              required
            >
              <option value="">Select category</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="__add_new__">+ Add new category...</option>
            </select>
          </div>

          {addingCat && (
            <div style={{ display: "flex", gap: 8, alignItems: "end", gridColumn: "1 / -1" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
                  New Category Name
                </label>
                <input 
                  className="input" 
                  placeholder="Enter category name" 
                  value={newCat} 
                  onChange={(e) => setNewCat(e.target.value)} 
                  style={{ width: "100%" }}
                  aria-label="New category name"
                />
              </div>
              <button className="btn primary" onClick={addCategory} style={{ minHeight: 44 }}>Save</button>
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
              Subcategory <span style={{ color: "#c62828" }}>*</span>
            </label>
            <select 
              className="input" 
              value={subcategoryId} 
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__add_new_sub__") { setAddingSub(true); setSubcategoryId(""); }
                else { setSubcategoryId(v ? Number(v) : ""); setAddingSub(false); }
              }} 
              disabled={!categoryId}
              aria-label="Select subcategory"
              required
            >
              <option value="">{categoryId ? "Select subcategory" : "Select category first"}</option>
              {subs.filter((s) => !categoryId || Number(s.category_id) === Number(categoryId)).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              <option value="__add_new_sub__">+ Add new subcategory...</option>
            </select>
          </div>

          {addingSub && (
            <div style={{ display: "flex", gap: 8, alignItems: "end", gridColumn: "1 / -1" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
                  New Subcategory Name
                </label>
                <input 
                  className="input" 
                  placeholder="Enter subcategory name" 
                  value={newSub} 
                  onChange={(e) => setNewSub(e.target.value)} 
                  style={{ width: "100%" }}
                  aria-label="New subcategory name"
                />
              </div>
              <button className="btn primary" onClick={addSubcategory} style={{ minHeight: 44 }}>Save</button>
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
              Location <span style={{ color: "#c62828" }}>*</span>
            </label>
            <select 
              className="input" 
              value={locationId} 
              onChange={(e) => setLocationId(e.target.value ? Number(e.target.value) : "")}
              aria-label="Select location"
              required
            >
              <option value="">Select location</option>
              {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name} {l.code ? `(${l.code})` : ""}</option>)}
            </select>
          </div>

          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
              Product Image <span style={{ color: "#c62828" }}>*</span>
            </label>
            <div style={{ 
              border: "2px dashed var(--border-light)", 
              borderRadius: 8, 
              padding: 20, 
              textAlign: "center",
              background: imageFile ? "#f0f7ff" : "#fafafa",
              transition: "all 0.2s"
            }}>
              <input 
                className="input" 
                type="file" 
                accept="image/*" 
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                style={{ 
                  width: "100%", 
                  padding: "12px",
                  cursor: "pointer"
                }}
                aria-label="Upload product image"
                id="product-image-input"
              />
              {imageFile && (
                <div style={{ marginTop: 12, fontSize: 13, color: "var(--accent)", fontWeight: 600 }}>
                  ✓ Selected: {imageFile.name}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{ 
          display: "flex", 
          gap: 24, 
          marginTop: 24, 
          flexWrap: "wrap", 
          alignItems: "center",
          padding: 16,
          background: "var(--bg-cream)",
          borderRadius: 8
        }}>
          <label className="filter-checkbox" style={{ minHeight: 44, display: "flex", alignItems: "center" }}>
            <input 
              type="checkbox" 
              checked={isLive} 
              onChange={(e) => setIsLive(e.target.checked)}
              style={{ width: 18, height: 18 }}
              aria-label="Mark as live stock"
            />
            <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 500 }}>Mark as Live Stock</span>
          </label>
          <label className="filter-checkbox" style={{ minHeight: 44, display: "flex", alignItems: "center" }}>
            <input 
              type="checkbox" 
              checked={showOnWebsite} 
              onChange={(e) => setShowOnWebsite(e.target.checked)}
              style={{ width: 18, height: 18 }}
              aria-label="Show on website"
            />
            <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 500 }}>Show on website</span>
          </label>
        </div>

        <div style={{ marginTop: 24, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button 
            className="btn primary" 
            onClick={addProduct} 
            disabled={loading}
            style={{ minHeight: 44, minWidth: 140 }}
            aria-label="Add product"
          >
            {loading ? "Working..." : "Add Product"}
          </button>
          <button 
            className="btn" 
            onClick={() => { 
              setWeight(""); 
              setStockQty("1"); 
              setCategoryId(""); 
              setSubcategoryId(""); 
              setIsLive(false); 
              setImageFile(null); 
              setShowOnWebsite(true);
              setAddingCat(false);
              setAddingSub(false);
            }}
            style={{ minHeight: 44, minWidth: 100 }}
            aria-label="Clear form"
          >
            Clear
          </button>
        </div>
      </div>
      )}

      {/* BULK ADD FORM */}
      {showBulkAdd && (
        <div className="card" style={{ marginBottom: 20, padding: 24 }}>
          <h3 style={{ margin: "0 0 24px 0", color: "var(--primary-dark)", fontWeight: 700, fontSize: 20 }}>
            Bulk Add Products (Auto-detect Weight from Images)
          </h3>

          {/* Common fields for all products */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 20, marginBottom: 24 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
                Category <span style={{ color: "#c62828" }}>*</span>
              </label>
              <select 
                className="input" 
                value={bulkCategoryId} 
                onChange={(e) => {
                  const v = e.target.value;
                  setBulkCategoryId(v ? Number(v) : "");
                  setBulkSubcategoryId("");
                }}
                aria-label="Select category"
                required
              >
                <option value="">Select category</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
                Subcategory <span style={{ color: "#c62828" }}>*</span>
              </label>
              <select 
                className="input" 
                value={bulkSubcategoryId} 
                onChange={(e) => setBulkSubcategoryId(e.target.value ? Number(e.target.value) : "")}
                disabled={!bulkCategoryId}
                aria-label="Select subcategory"
                required
              >
                <option value="">{bulkCategoryId ? "Select subcategory" : "Select category first"}</option>
                {subs.filter((s) => !bulkCategoryId || Number(s.category_id) === Number(bulkCategoryId)).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
                Location <span style={{ color: "#c62828" }}>*</span>
              </label>
              <select 
                className="input" 
                value={bulkLocationId} 
                onChange={(e) => setBulkLocationId(e.target.value ? Number(e.target.value) : "")}
                aria-label="Select location"
                required
              >
                <option value="">Select location</option>
                {locations.map((l: any) => <option key={l.id} value={l.id}>{l.name} {l.code ? `(${l.code})` : ""}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
                Location Note (Optional)
              </label>
              <input 
                className="input" 
                placeholder="Add note for all products..."
                value={bulkLocationNote}
                onChange={(e) => setBulkLocationNote(e.target.value)}
                aria-label="Location note"
              />
            </div>
          </div>

          <div style={{ 
            display: "flex", 
            gap: 24, 
            marginBottom: 24, 
            flexWrap: "wrap", 
            alignItems: "center",
            padding: 16,
            background: "var(--bg-cream)",
            borderRadius: 8
          }}>
            <label className="filter-checkbox" style={{ minHeight: 44, display: "flex", alignItems: "center" }}>
              <input 
                type="checkbox" 
                checked={bulkIsLive} 
                onChange={(e) => setBulkIsLive(e.target.checked)}
                style={{ width: 18, height: 18 }}
                aria-label="Mark as live stock"
              />
              <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 500 }}>Mark as Live Stock</span>
            </label>
            <label className="filter-checkbox" style={{ minHeight: 44, display: "flex", alignItems: "center" }}>
              <input 
                type="checkbox" 
                checked={bulkShowOnWebsite} 
                onChange={(e) => setBulkShowOnWebsite(e.target.checked)}
                style={{ width: 18, height: 18 }}
                aria-label="Show on website"
              />
              <span style={{ marginLeft: 10, fontSize: 14, fontWeight: 500 }}>Show on website</span>
            </label>
          </div>

          {/* Image upload */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
              Select Product Images <span style={{ color: "#c62828" }}>*</span>
            </div>
            
            {/* Direct file input button */}
            <div style={{ marginBottom: 12 }}>
              <input 
                id="bulk-image-input"
                type="file" 
                accept="image/*" 
                multiple
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    const newFiles = Array.from(files);
                    // If there are existing images, append new ones (avoid duplicates by name)
                    if (bulkImages.length > 0) {
                      const existingNames = new Set(bulkImages.map(f => f.name));
                      const uniqueNewFiles = newFiles.filter(f => !existingNames.has(f.name));
                      setBulkImages([...bulkImages, ...uniqueNewFiles]);
                    } else {
                      setBulkImages(newFiles);
                    }
                    setBulkProducts([]); // Clear previous results
                  }
                  // Reset input to allow selecting same files again
                  e.target.value = '';
                }}
                style={{ 
                  width: "100%",
                  padding: "12px",
                  cursor: "pointer",
                  fontSize: 14
                }}
                aria-label="Upload product images"
              />
            </div>

            {/* Visual drop zone (alternative) */}
            <label
              htmlFor="bulk-image-input"
              style={{ 
                display: "block",
                border: "2px dashed var(--border-light)", 
                borderRadius: 8, 
                padding: 20, 
                textAlign: "center",
                background: bulkImages.length > 0 ? "#f0f7ff" : "#fafafa",
                transition: "all 0.2s",
                cursor: "pointer"
              }}
            >
              <div>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
                  Or click here to select multiple images
                </div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Hold Ctrl (Windows) or Cmd (Mac) to select multiple files
                </div>
                {bulkImages.length > 0 && (
                  <div style={{ marginTop: 16, fontSize: 14, color: "var(--accent)", fontWeight: 600 }}>
                    ✓ {bulkImages.length} image{bulkImages.length !== 1 ? 's' : ''} selected
                  </div>
                )}
              </div>
            </label>
            {bulkImages.length > 0 && (
              <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  className="btn"
                  onClick={() => {
                    setBulkImages([]);
                    setBulkProducts([]);
                    const input = document.getElementById('bulk-image-input') as HTMLInputElement;
                    if (input) input.value = '';
                  }}
                  style={{ minHeight: 36, fontSize: 13 }}
                >
                  Clear Selection
                </button>
                <label
                  htmlFor="bulk-image-input"
                  className="btn"
                  style={{ minHeight: 36, fontSize: 13, cursor: "pointer", display: "inline-block" }}
                >
                  Add More Images
                </label>
              </div>
            )}
          </div>

          {/* Process button */}
          {bulkImages.length > 0 && bulkProducts.length === 0 && (
            <button
              className="btn primary"
              onClick={processBulkImages}
              disabled={processingOCR || !bulkCategoryId || !bulkSubcategoryId || !bulkLocationId}
              style={{ minHeight: 44, minWidth: 200, marginBottom: 24 }}
            >
              {processingOCR ? "⏳ Detecting weights from images..." : "🔍 Detect Weights from Images"}
            </button>
          )}

          {/* Confirmation table */}
          {bulkProducts.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h4 style={{ margin: "0 0 16px 0", color: "var(--accent-dark)", fontWeight: 700 }}>
                Review Detected Weights ({bulkProducts.length} products)
              </h4>
              <div style={{ overflowX: "auto", maxHeight: 500, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
                  <thead>
                    <tr style={{ background: "var(--bg-cream)", borderBottom: "2px solid var(--border-light)", position: "sticky", top: 0 }}>
                      <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>Image</th>
                      <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>Detected Weight</th>
                      <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>Weight (grams) *</th>
                      <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>File Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bulkProducts.map((product, index) => (
                      <tr key={index} style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <td style={{ padding: 12 }}>
                          <img 
                            src={product.imagePreview} 
                            alt="" 
                            onClick={() => setBulkModalImage(product.imagePreview)}
                            style={{ 
                              width: 80, 
                              height: 80, 
                              objectFit: "cover", 
                              borderRadius: 6,
                              cursor: "zoom-in",
                              transition: "transform 0.2s"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = "scale(1.05)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "scale(1)";
                            }}
                          />
                        </td>
                        <td style={{ padding: 12 }}>
                          {product.detectedWeight ? (
                            <span style={{ color: "#2e7d32", fontWeight: 600 }}>✓ {product.detectedWeight} g</span>
                          ) : (
                            <span style={{ color: "#c62828" }}>⚠ Not detected</span>
                          )}
                        </td>
                        <td style={{ padding: 12 }}>
                          <input
                            type="number"
                            step="0.001"
                            value={product.weight}
                            onChange={(e) => {
                              const updated = [...bulkProducts];
                              updated[index].weight = e.target.value;
                              setBulkProducts(updated);
                            }}
                            className="input"
                            style={{ width: 120 }}
                            placeholder="Enter weight"
                            required
                          />
                        </td>
                        <td style={{ padding: 12, fontSize: 12, color: "var(--text-muted)" }}>
                          {product.file.name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
                <button
                  className="btn primary"
                  onClick={addBulkProducts}
                  disabled={loading}
                  style={{ minHeight: 44, minWidth: 200 }}
                >
                  {loading ? "⏳ Adding Products..." : `✅ Add All ${bulkProducts.length} Products`}
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setBulkImages([]);
                    setBulkProducts([]);
                    setBulkCategoryId("");
                    setBulkSubcategoryId("");
                    setBulkLocationNote("");
                  }}
                  style={{ minHeight: 44 }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Image Modal for Bulk Add */}
      {bulkModalImage && (
        <div
          onClick={() => setBulkModalImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            cursor: "pointer"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
              cursor: "default"
            }}
          >
            <button
              onClick={() => setBulkModalImage(null)}
              style={{
                position: "absolute",
                top: -40,
                right: 0,
                background: "white",
                border: "none",
                borderRadius: "50%",
                width: 36,
                height: 36,
                cursor: "pointer",
                fontSize: 20,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
              }}
            >
              ×
            </button>
            <img
              src={bulkModalImage}
              alt="Full size product image"
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: 8,
                background: "#fff",
                padding: 8
              }}
            />
          </div>
        </div>
      )}

      {/* Info Banner */}
      {showShareInfo && (
        <div className="card" style={{ 
          marginBottom: 20, 
          padding: 16, 
          background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
          border: "2px solid #4caf50",
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          position: "relative"
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <svg width={20} height={20} viewBox="0 0 24 24" fill="#2e7d32">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
              <strong style={{ color: "#2e7d32", fontSize: 15 }}>Share Products via WhatsApp</strong>
            </div>
            <p style={{ color: "#1b5e20", fontSize: 13, margin: 0, lineHeight: 1.6 }}>
              Select products and share only images on WhatsApp in your community group and your loved ones.
              <strong style={{ display: "block", marginTop: 6 }}>No links or source details are shared.</strong>
            </p>
          </div>
          <button
            onClick={() => {
              setShowShareInfo(false);
              localStorage.setItem('share-info-dismissed', 'true');
            }}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
              color: "#2e7d32",
            }}
            aria-label="Dismiss info"
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
      )}

      {/* Filters and Search */}
      <div className="card" style={{ marginBottom: 16, padding: 20 }}>
        <h4 style={{ margin: "0 0 16px 0", color: "var(--accent-dark)", fontWeight: 700 }}>Filters & Search</h4>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-dark)", marginBottom: 6 }}>
              Search
            </label>
            <input 
              className="input" 
              placeholder="Search by ID or name…" 
              value={q} 
              onChange={(e) => setQ(e.target.value)} 
              style={{ width: "100%" }}
              aria-label="Search products"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-dark)", marginBottom: 6 }}>
              Category
            </label>
            <select 
              className="input" 
              value={filterCatId} 
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : "";
                setFilterCatId(val);
                setFilterSubId(""); // Reset subcategory when category changes
              }}
              style={{ width: "100%" }}
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-dark)", marginBottom: 6 }}>
              Subcategory
            </label>
            <select 
              className="input" 
              value={filterSubId} 
              onChange={(e) => setFilterSubId(e.target.value ? Number(e.target.value) : "")}
              disabled={!filterCatId}
              style={{ width: "100%" }}
              aria-label="Filter by subcategory"
            >
              <option value="">All Subcategories</option>
              {filteredSubs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
        
        {/* Weight Range Filters */}
        {weightKeys.length > 0 && (
          <div style={{ marginTop: 12, padding: 12, background: "var(--bg-cream)", borderRadius: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
              Selected Weight Ranges:
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {weightKeys.map((key) => {
                const [a, b] = key.split("-").map(Number);
                return (
                  <span
                    key={key}
                    style={{
                      padding: "6px 12px",
                      background: "#fff",
                      border: "1px solid var(--border-light)",
                      borderRadius: 6,
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {a}–{b} g
                    <button
                      onClick={() => setWeightKeys(prev => prev.filter(k => k !== key))}
                      style={{
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        color: "#999",
                      }}
                      aria-label="Remove filter"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-dark)", marginBottom: 8 }}>
            Weight Range (Click to filter)
          </div>
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", 
            gap: 8,
            maxHeight: 200,
            overflowY: "auto",
            padding: 8,
            background: "#fafafa",
            borderRadius: 8
          }}>
            {WEIGHTS.map(([a, b]) => {
              const key = `${a}-${b}`;
              const isSelected = weightKeys.includes(key);
              return (
                <label
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 12px",
                    background: isSelected ? "#e8f5e9" : "#fff",
                    border: `1px solid ${isSelected ? "#4caf50" : "#ddd"}`,
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 12,
                    transition: "all 0.2s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setWeightKeys(prev => [...prev, key]);
                      } else {
                        setWeightKeys(prev => prev.filter(k => k !== key));
                      }
                    }}
                    style={{ width: 16, height: 16, cursor: "pointer" }}
                  />
                  <span>{a}–{b} g</span>
                </label>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button 
            className="btn" 
            onClick={exportCsv} 
            style={{ background: "var(--accent)", borderColor: "var(--accent)", color: "#fff", minHeight: 44 }}
            aria-label="Export products to CSV"
          >
            Export CSV
          </button>
          {(filterCatId || filterSubId || weightKeys.length > 0 || q) && (
            <button 
              className="btn" 
              onClick={() => {
                setQ("");
                setFilterCatId("");
                setFilterSubId("");
                setWeightKeys([]);
              }}
              style={{ minHeight: 44 }}
              aria-label="Clear filters"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Selection controls */}
      {filtered.length > 0 && (
        <div className="card" style={{ marginBottom: 20, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
              <input
                type="checkbox"
                checked={selectedProducts.size > 0 && selectedProducts.size === filtered.length}
                onChange={handleSelectAll}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <span>Select All ({selectedProducts.size} selected)</span>
            </label>
          </div>
          {selectedProducts.size > 0 && (
            <button
              className="btn primary"
              onClick={shareSelectedImages}
              disabled={sharing}
              style={{
                background: "#25D366",
                borderColor: "#25D366",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 8,
                minHeight: 44,
              }}
            >
              {sharing ? (
                <>⏳ Sharing...</>
              ) : (
                <>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Share {selectedProducts.size} Image{selectedProducts.size !== 1 ? 's' : ''} via WhatsApp
                </>
              )}
            </button>
          )}
        </div>
      )}

      <div className="grid">
        {filtered.map((p) => (
          <div key={p.id} className="card" style={{ position: "relative" }}>
            {/* Selection checkbox */}
            <button
              onClick={() => handleSelectProduct(p.id, !selectedProducts.has(p.id))}
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                width: 28,
                height: 28,
                borderRadius: 6,
                border: `2px solid ${selectedProducts.has(p.id) ? "#b08d57" : "#fff"}`,
                background: selectedProducts.has(p.id) ? "#b08d57" : "rgba(255,255,255,0.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 3,
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                transition: "all 0.2s ease",
              }}
              aria-label={selectedProducts.has(p.id) ? "Deselect product" : "Select product"}
            >
              {selectedProducts.has(p.id) && (
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <div 
              className="image-wrap"
              onClick={() => p.image_url && setProductModalImage(p.image_url)}
              style={{ cursor: "zoom-in" }}
            >
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

      {/* Image Modal for Products Table */}
      {productModalImage && (
        <div
          onClick={() => setProductModalImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            cursor: "pointer"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "90vw",
              maxHeight: "90vh",
              cursor: "default"
            }}
          >
            <button
              onClick={() => setProductModalImage(null)}
              style={{
                position: "absolute",
                top: -40,
                right: 0,
                background: "white",
                border: "none",
                borderRadius: "50%",
                width: 36,
                height: 36,
                cursor: "pointer",
                fontSize: 20,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
              }}
            >
              ×
            </button>
            <img
              src={productModalImage}
              alt="Full size product image"
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: 8,
                background: "#fff",
                padding: 8
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
