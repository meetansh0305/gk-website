import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [cats, setCats] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [catId, setCatId] = useState<number | "">("");
  const [subId, setSubId] = useState<number | "">("");
  const [weightKeys, setWeightKeys] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"id" | "weight" | "name">("id");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const { add } = useCart();
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [sharing, setSharing] = useState(false);
  const [showShareInfo, setShowShareInfo] = useState(() => {
    const dismissed = localStorage.getItem('share-info-dismissed');
    return !dismissed;
  });

  // Get search from URL
  useEffect(() => {
    const search = searchParams.get("search");
    if (search) {
      setSearchTerm(search);
    }
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("categories").select("*").order("name");
      setCats(c ?? []);
      const { data: s } = await supabase.from("subcategories").select("*").order("name");
      setSubs(s ?? []);
      const { data: p } = await supabase.from("products").select("id, image_url, weight, is_live_stock, category_id, subcategory_id, name").order("id", { ascending: false });
      setProducts((p as any[]) ?? []);
    })();
  }, []);

  const filteredSubs = useMemo(() => (catId ? subs.filter(s => s.category_id === Number(catId)) : subs), [subs, catId]);

  const filteredProducts = useMemo(() => {
    let list = products;
    
    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(p => {
        const name = (p as any).name?.toLowerCase() || "";
        const id = String(p.id);
        return name.includes(term) || id.includes(term);
      });
    }
    
    // Category filter
    if (catId) list = list.filter(p => p.category_id === Number(catId));
    
    // Subcategory filter
    if (subId) list = list.filter(p => p.subcategory_id === Number(subId));
    
    // Weight filter
    if (weightKeys.length > 0) {
      list = list.filter(p => {
        const w = Number(p.weight ?? 0);
        return weightKeys.some(k => {
          const [a,b] = k.split("-").map(Number);
          return w >= a && w < b;
        });
      });
    }
    
    // Sorting
    list = [...list].sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortBy === "weight") {
        aVal = a.weight ?? 0;
        bVal = b.weight ?? 0;
      } else if (sortBy === "name") {
        aVal = (a as any).name || "";
        bVal = (b as any).name || "";
      } else {
        aVal = a.id;
        bVal = b.id;
      }
      
      if (sortOrder === "asc") {
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      } else {
        return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
      }
    });
    
    return list;
  }, [products, catId, subId, weightKeys, searchTerm, sortBy, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

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
    if (selectedProducts.size === paginatedProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(paginatedProducts.map(p => p.id)));
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
      // Get selected products with images
      const selected = products.filter(p => selectedProducts.has(p.id) && p.image_url);
      
      if (selected.length === 0) {
        alert("Selected products don't have images.");
        setSharing(false);
        return;
      }

      // Fetch images and convert to File objects
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

      // Check if Web Share API supports files
      if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
        // Use native share
        await navigator.share({
          files: files,
          title: "Product Images",
        });
        setSelectedProducts(new Set());
      } else if (navigator.share) {
        // Fallback: share text with links (for browsers that don't support file sharing)
        const message = `Check out these ${files.length} product images:\n${selected.map(p => `Product #${p.id}`).join('\n')}`;
        await navigator.share({
          title: "Product Images",
          text: message,
        });
        setSelectedProducts(new Set());
      } else {
        // Final fallback: download images as zip or show message
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

      {/* Search and Sort Bar */}
      <div className="card" style={{ marginBottom: 24, padding: 20, background: "#fff" }}>
        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
          gap: 16,
          alignItems: "end"
        }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ 
              display: "block", 
              fontSize: 12, 
              fontWeight: 600, 
              color: "#555", 
              marginBottom: 6 
            }}>
              Search Products
            </label>
            <input
              className="input"
              type="text"
              placeholder="Search by name or ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
                setSearchParams({ search: e.target.value });
              }}
              aria-label="Search products"
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <label style={{ 
              display: "block", 
              fontSize: 12, 
              fontWeight: 600, 
              color: "#555", 
              marginBottom: 6 
            }}>
              Sort By
            </label>
            <select
              className="input"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as any);
                setCurrentPage(1);
              }}
              aria-label="Sort by"
              style={{ width: "100%" }}
            >
              <option value="id">ID</option>
              <option value="weight">Weight</option>
              <option value="name">Name</option>
            </select>
          </div>
          <div>
            <label style={{ 
              display: "block", 
              fontSize: 12, 
              fontWeight: 600, 
              color: "#555", 
              marginBottom: 6 
            }}>
              Order
            </label>
            <select
              className="input"
              value={sortOrder}
              onChange={(e) => {
                setSortOrder(e.target.value as any);
                setCurrentPage(1);
              }}
              aria-label="Sort order"
              style={{ width: "100%" }}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
        </div>
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

          {/* Selection controls */}
          <div className="card" style={{ marginBottom: 20, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
                <input
                  type="checkbox"
                  checked={selectedProducts.size > 0 && selectedProducts.size === paginatedProducts.length}
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

          <div className="grid" style={{ justifyItems: "center" }}>
            {paginatedProducts.map(p => (
              <ProductCard 
                key={p.id} 
                p={p} 
                onClickAdd={() => add(p)}
                isSelected={selectedProducts.has(p.id)}
                onSelect={handleSelectProduct}
                showCheckbox={true}
              />
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 32, flexWrap: "wrap" }}>
              <button
                className="btn"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                Previous
              </button>
              <span style={{ display: "flex", alignItems: "center", padding: "0 16px", color: "var(--text-muted)" }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                className="btn"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          )}
          
          {filteredProducts.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "#666" }}>
              <p style={{ fontSize: 18, marginBottom: 8 }}>No products found</p>
              <p style={{ fontSize: 14 }}>Try adjusting your filters or search term</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
