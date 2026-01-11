import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import ProductCard from "../components/ProductCard";
import { useCart } from "../state/CartContext";

type Category = { id: number; name: string; banner_url?: string | null };
type Subcategory = { id: number; name: string; category_id: number };
type Product = {
  id: number;
  image_url: string | null;
  weight: number | null;
  is_live_stock?: boolean;
  category_id: number;
  subcategory_id: number | null;
  name: string | null;
  category_name: string | null;
  subcategory_name: string | null;
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

export default function CategoryPage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [cat, setCat] = useState<Category | null>(null);
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSubId, setSelectedSubId] = useState<number | "">(
    searchParams.get("subcategory") ? Number(searchParams.get("subcategory")) : ""
  );
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
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [mobileSortOpen, setMobileSortOpen] = useState(false);

  useEffect(() => {
    if (!categoryId) return;
    (async () => {
      const { data: c } = await supabase
        .from("categories")
        .select("id, name, banner_url")
        .eq("id", Number(categoryId))
        .single();
      setCat(c ?? null);

      const { data: s } = await supabase
        .from("subcategories")
        .select("*")
        .eq("category_id", Number(categoryId))
        .order("name");
      setSubs(s ?? []);

      // Fetch products with category/subcategory names
      const { data: p } = await supabase
        .from("products")
        .select(`
          id, image_url, weight, is_live_stock, category_id, subcategory_id, name,
          category:category_id (name),
          subcategory:subcategory_id (name)
        `)
        .eq("category_id", Number(categoryId))
        .order("id", { ascending: false });

      const productsWithNames = (p as any[]).map(prod => ({
        ...prod,
        category_name: prod.category?.name || null,
        subcategory_name: prod.subcategory?.name || null,
      }));
      setProducts(productsWithNames ?? []);
    })();
  }, [categoryId]);

  // Update URL when subcategory filter changes
  useEffect(() => {
    if (selectedSubId) {
      searchParams.set("subcategory", String(selectedSubId));
    } else {
      searchParams.delete("subcategory");
    }
    setSearchParams(searchParams, { replace: true });
  }, [selectedSubId, searchParams, setSearchParams]);

  // Check if coming from subcategory link
  useEffect(() => {
    const subParam = searchParams.get("subcategory");
    if (subParam) {
      setSelectedSubId(Number(subParam));
    }
  }, [searchParams]);

  const filtered = useMemo(() => {
    let result = [...products];

    // Subcategory filter
    if (selectedSubId) {
      result = result.filter((p) => p.subcategory_id === Number(selectedSubId));
    }

    // Weight filter
    if (weightKeys.length > 0) {
      result = result.filter((p) => {
        const w = Number(p.weight ?? 0);
        return weightKeys.some((k) => {
          const [a, b] = k.split("-").map(Number);
          return w >= a && w < b;
        });
      });
    }

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      result = result.filter(
        (p) =>
          String(p.id).includes(term) ||
          (p.name && p.name.toLowerCase().includes(term)) ||
          (p.category_name && p.category_name.toLowerCase().includes(term)) ||
          (p.subcategory_name && p.subcategory_name.toLowerCase().includes(term))
      );
    }

    // Sort
    result.sort((a, b) => {
      let aVal: any, bVal: any;
      if (sortBy === "weight") {
        aVal = a.weight ?? 0;
        bVal = b.weight ?? 0;
      } else if (sortBy === "name") {
        aVal = a.name ?? "";
        bVal = b.name ?? "";
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

    return result;
  }, [products, selectedSubId, weightKeys, searchTerm, sortBy, sortOrder]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSelectProduct = (productId: number, selected: boolean) => {
    setSelectedProducts((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  };

  const shareSelectedImages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Please login to share products via WhatsApp.");
      navigate("/auth");
      return;
    }

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
      const selected = filtered.filter(
        (p) => selectedProducts.has(p.id) && p.image_url
      );

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
          const fileName = `product-${product.id}.${blob.type.split("/")[1] || "jpg"}`;
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
        const message = `Check out these ${files.length} product images:\n${selected.map((p) => `Product #${p.id}`).join("\n")}`;
        await navigator.share({
          title: "Product Images",
          text: message,
        });
        setSelectedProducts(new Set());
      } else {
        alert(
          `Web Share API not available. Selected ${files.length} products. Please use a mobile browser with WhatsApp installed for best experience.`
        );
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        console.error("Share error:", error);
        alert("Failed to share images. Please try again.");
      }
    } finally {
      setSharing(false);
    }
  };

  const bannerUrl =
    cat?.banner_url ??
    "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1600&auto=format&fit=crop";

  return (
    <>
      <div>
        {/* Banner */}
        <div
          style={{
            width: "100%",
            height: "40vh",
            minHeight: 300,
            background: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.4)), url('${bannerUrl}') center/cover`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            textAlign: "center",
            padding: "60px 24px",
          }}
        >
          <div>
            <h1 style={{ fontSize: 48, fontWeight: 700, marginBottom: 16 }}>
              {cat?.name ?? "Category"}
            </h1>
            <p style={{ fontSize: 18, opacity: 0.9 }}>
              Explore our exquisite collection
            </p>
          </div>
        </div>

        <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
          {/* Mobile Filter/Sort Button - Sticky Top */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 100,
              background: "#fff",
              borderBottom: "1px solid #e8e8e8",
              padding: "12px 0",
              marginBottom: 20,
              display: "flex",
              gap: 12,
              justifyContent: "center",
            }}
            className="mobile-only"
          >
            <button
              className="btn"
              onClick={() => setMobileFilterOpen(true)}
              style={{
                background: "#8B6F47",
                color: "#fff",
                borderColor: "#8B6F47",
                minHeight: 44,
                flex: 1,
                maxWidth: 200,
              }}
            >
              Filters
              {weightKeys.length > 0 || selectedSubId
                ? ` (${weightKeys.length + (selectedSubId ? 1 : 0)})`
                : ""}
            </button>
            <button
              className="btn"
              onClick={() => setMobileSortOpen(true)}
              style={{
                background: "#8B6F47",
                color: "#fff",
                borderColor: "#8B6F47",
                minHeight: 44,
                flex: 1,
                maxWidth: 200,
              }}
            >
              Sort
            </button>
          </div>

          {/* Desktop Filters Sidebar */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "280px 1fr",
              gap: 32,
              alignItems: "start",
            }}
            className="desktop-only"
          >
            <div className="card filter-sidebar" style={{ position: "sticky", top: 100 }}>
              <h3 style={{ marginBottom: 20, color: "var(--accent-dark)" }}>
                Filters
              </h3>

              {/* Subcategory Filter */}
              <div style={{ marginBottom: 24 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: "var(--text-dark)",
                  }}
                >
                  Subcategory
                </label>
                <select
                  className="input"
                  value={selectedSubId}
                  onChange={(e) =>
                    setSelectedSubId(e.target.value ? Number(e.target.value) : "")
                  }
                  style={{ width: "100%" }}
                >
                  <option value="">All Subcategories</option>
                  {subs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Weight Filter */}
              <div style={{ marginBottom: 24 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: "var(--text-dark)",
                  }}
                >
                  Weight Range (grams)
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {WEIGHT_BUCKETS.map(([min, max]) => {
                    const key = `${min}-${max}`;
                    return (
                      <label
                        key={key}
                        className="filter-checkbox"
                        style={{ fontSize: 13 }}
                      >
                        <input
                          type="checkbox"
                          checked={weightKeys.includes(key)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setWeightKeys([...weightKeys, key]);
                            } else {
                              setWeightKeys(weightKeys.filter((k) => k !== key));
                            }
                          }}
                        />
                        <span>
                          {min} - {max} g
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Search */}
              <div style={{ marginBottom: 24 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: "var(--text-dark)",
                  }}
                >
                  Search
                </label>
                <input
                  className="input"
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Sort */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 8,
                    color: "var(--text-dark)",
                  }}
                >
                  Sort By
                </label>
                <select
                  className="input"
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [by, order] = e.target.value.split("-");
                    setSortBy(by as "id" | "weight" | "name");
                    setSortOrder(order as "asc" | "desc");
                    setCurrentPage(1);
                  }}
                  style={{ width: "100%", marginBottom: 8 }}
                >
                  <option value="id-desc">Newest First</option>
                  <option value="id-asc">Oldest First</option>
                  <option value="weight-desc">Heaviest First</option>
                  <option value="weight-asc">Lightest First</option>
                  <option value="name-asc">Name A-Z</option>
                  <option value="name-desc">Name Z-A</option>
                </select>
              </div>
            </div>

            {/* Products Grid */}
            <div>
              {/* Selection Controls */}
              {showShareInfo && (
                <div
                  className="card"
                  style={{
                    marginBottom: 8,
                    background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
                    border: "1.5px solid #4caf50",
                    padding: "6px 10px",
                    borderRadius: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 6 }}>
                    <div style={{ flex: 1 }}>
                      <strong style={{ color: "#2e7d32", fontSize: 13, display: "block", marginBottom: 2, fontWeight: 600 }}>
                        Share Products via WhatsApp
                      </strong>
                      <div style={{ fontSize: 11, color: "#1b5e20", lineHeight: 1.3 }}>
                        Select products and share images on WhatsApp.
                        <strong style={{ display: "block", marginTop: 2, fontSize: 10 }}>
                          No links shared.
                        </strong>
                      </div>
                    </div>
                    <button
                      className="btn"
                      onClick={() => {
                        setShowShareInfo(false);
                        localStorage.setItem("share-info-dismissed", "true");
                      }}
                      style={{
                        background: "transparent",
                        border: "none",
                        fontSize: 18,
                        cursor: "pointer",
                        padding: "0 2px",
                        flexShrink: 0,
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <h2 style={{ margin: 0, color: "var(--accent-dark)" }}>
                    {cat?.name ?? "Category"}
                  </h2>
                  <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
                    {filtered.length} product{filtered.length !== 1 ? "s" : ""} found
                  </p>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <label
                    className="filter-checkbox"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={
                        selectedProducts.size > 0 &&
                        selectedProducts.size === filtered.length
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts(new Set(filtered.map((p) => p.id)));
                        } else {
                          setSelectedProducts(new Set());
                        }
                      }}
                      style={{ width: 18, height: 18, cursor: "pointer" }}
                    />
                    <span>
                      Select All ({selectedProducts.size} selected)
                    </span>
                  </label>
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
                          📱 Share {selectedProducts.size} Image
                          {selectedProducts.size !== 1 ? "s" : ""} via WhatsApp
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {paginated.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: 60 }}>
                  <p style={{ fontSize: 16, color: "var(--text-muted)" }}>
                    No products found.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid">
                    {paginated.map((p) => (
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
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 8,
                        marginTop: 40,
                      }}
                    >
                      <button
                        className="btn"
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          padding: "0 16px",
                          fontSize: 14,
                        }}
                      >
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        className="btn"
                        onClick={() =>
                          setCurrentPage((p) => Math.min(totalPages, p + 1))
                        }
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Mobile Products Grid */}
          <div className="mobile-only">
            {/* Selection Controls */}
            {showShareInfo && (
              <div
                className="card"
                style={{
                  marginBottom: 8,
                  background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
                  border: "1.5px solid #4caf50",
                  padding: "6px 10px",
                  borderRadius: 6,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 6 }}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ color: "#2e7d32", fontSize: 13, display: "block", marginBottom: 2, fontWeight: 600 }}>
                      Share Products via WhatsApp
                    </strong>
                    <div style={{ fontSize: 11, color: "#1b5e20", lineHeight: 1.3 }}>
                      Select products and share images on WhatsApp.
                      <strong style={{ display: "block", marginTop: 2, fontSize: 10 }}>
                        No links shared.
                      </strong>
                    </div>
                  </div>
                  <button
                    className="btn"
                    onClick={() => {
                      setShowShareInfo(false);
                      localStorage.setItem("share-info-dismissed", "true");
                    }}
                    style={{
                      background: "transparent",
                      border: "none",
                      fontSize: 18,
                      cursor: "pointer",
                      padding: "0 2px",
                      flexShrink: 0,
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <h2 style={{ margin: 0, color: "var(--accent-dark)" }}>
                  {cat?.name ?? "Category"}
                </h2>
                <p style={{ fontSize: 14, color: "var(--text-muted)", marginTop: 4 }}>
                  {filtered.length} product{filtered.length !== 1 ? "s" : ""} found
                </p>
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
                      📱 Share {selectedProducts.size} Image
                      {selectedProducts.size !== 1 ? "s" : ""} via WhatsApp
                    </>
                  )}
                </button>
              )}
            </div>

            {paginated.length === 0 ? (
              <div className="card" style={{ textAlign: "center", padding: 60 }}>
                <p style={{ fontSize: 16, color: "var(--text-muted)" }}>
                  No products found.
                </p>
              </div>
            ) : (
              <>
                <div className="grid">
                  {paginated.map((p) => (
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
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      gap: 8,
                      marginTop: 32,
                      flexWrap: "wrap",
                    }}
                  >
                    <button
                      className="btn"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        padding: "0 16px",
                        color: "var(--text-muted)",
                      }}
                    >
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      className="btn"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Bottom Sheet */}
      {mobileFilterOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={() => setMobileFilterOpen(false)}
        >
          <div
            style={{
              background: "#fff",
              width: "100%",
              maxHeight: "80vh",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <h3 style={{ margin: 0 }}>Filters</h3>
              <button
                className="btn"
                onClick={() => setMobileFilterOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 24,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            {/* Subcategory Filter */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                Subcategory
              </label>
              <select
                className="input"
                value={selectedSubId}
                onChange={(e) =>
                  setSelectedSubId(e.target.value ? Number(e.target.value) : "")
                }
                style={{ width: "100%" }}
              >
                <option value="">All Subcategories</option>
                {subs.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Weight Filter */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 12,
                }}
              >
                Weight Range (grams)
              </label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 8,
                }}
              >
                {WEIGHT_BUCKETS.map(([min, max]) => {
                  const key = `${min}-${max}`;
                  return (
                    <label
                      key={key}
                      className="filter-checkbox"
                      style={{ fontSize: 13 }}
                    >
                      <input
                        type="checkbox"
                        checked={weightKeys.includes(key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setWeightKeys([...weightKeys, key]);
                          } else {
                            setWeightKeys(weightKeys.filter((k) => k !== key));
                          }
                        }}
                      />
                      <span>
                        {min} - {max} g
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Search */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 600,
                  marginBottom: 8,
                }}
              >
                Search
              </label>
              <input
                className="input"
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ width: "100%" }}
              />
            </div>

            <button
              className="btn primary"
              onClick={() => setMobileFilterOpen(false)}
              style={{ width: "100%", minHeight: 44 }}
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Mobile Sort Bottom Sheet */}
      {mobileSortOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "flex",
            alignItems: "flex-end",
          }}
          onClick={() => setMobileSortOpen(false)}
        >
          <div
            style={{
              background: "#fff",
              width: "100%",
              maxHeight: "50vh",
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 24,
              }}
            >
              <h3 style={{ margin: 0 }}>Sort By</h3>
              <button
                className="btn"
                onClick={() => setMobileSortOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: 24,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <select
              className="input"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [by, order] = e.target.value.split("-");
                setSortBy(by as "id" | "weight" | "name");
                setSortOrder(order as "asc" | "desc");
                setCurrentPage(1);
                setMobileSortOpen(false);
              }}
              style={{ width: "100%", minHeight: 44 }}
            >
              <option value="id-desc">Newest First</option>
              <option value="id-asc">Oldest First</option>
              <option value="weight-desc">Heaviest First</option>
              <option value="weight-asc">Lightest First</option>
              <option value="name-asc">Name A-Z</option>
              <option value="name-desc">Name Z-A</option>
            </select>
          </div>
        </div>
      )}
    </>
  );
}
