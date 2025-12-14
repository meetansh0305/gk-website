// src/pages/SoldItems.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type SoldItem = {
  id: number;
  weight: number | null;
  image_url: string | null;
  sold_at: string | null;
  products: {
    id: number;
    name: string;
    image_url: string | null;
    weight: number | null;
    categories: { name: string } | null;
    subcategories: { name: string } | null;
  } | null;
  profiles: {
    full_name: string;
    phone: string;
    city: string;
    state: string;
  } | null;
};

export default function SoldItems() {
  const [items, setItems] = useState<SoldItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [subcategoryFilter, setSubcategoryFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  const [stateFilter, setStateFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [modalImage, setModalImage] = useState<string | null>(null);

  // Get unique values for filters
  const [categories, setCategories] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);
  const [customers, setCustomers] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_items")
      .select(`
        *,
        products (
          id,
          name,
          image_url,
          weight,
          categories ( name ),
          subcategories ( name )
        ),
        profiles!sold_to_user ( full_name, phone, city, state )
      `)
      .eq("sold", true)
      .order("sold_at", { ascending: false });

    if (error) {
      console.error("Error loading sold items:", error);
    }

    const itemsData = (data as any) ?? [];
    setItems(itemsData);

    // Extract unique values for filters
    const uniqueCategories = [...new Set(itemsData.map((i: any) => i.products?.categories?.name).filter(Boolean))];
    const uniqueSubcategories = [...new Set(itemsData.map((i: any) => i.products?.subcategories?.name).filter(Boolean))];
    const uniqueCustomers = [...new Set(itemsData.map((i: any) => i.profiles?.full_name).filter(Boolean))];
    const uniqueCities = [...new Set(itemsData.map((i: any) => i.profiles?.city).filter(Boolean))];
    const uniqueStates = [...new Set(itemsData.map((i: any) => i.profiles?.state).filter(Boolean))];

    setCategories(uniqueCategories as string[]);
    setSubcategories(uniqueSubcategories as string[]);
    setCustomers(uniqueCustomers as string[]);
    setCities(uniqueCities as string[]);
    setStates(uniqueStates as string[]);

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleClear = () => {
    setSearch("");
    setCategoryFilter("all");
    setSubcategoryFilter("all");
    setCustomerFilter("all");
    setCityFilter("all");
    setStateFilter("all");
    setDateFrom("");
    setDateTo("");
  };

  const filtered = items.filter((item) => {
    // Search filter
    if (search.trim()) {
      const s = search.toLowerCase();
      const hay = `${item.products?.name ?? ""} ${item.profiles?.full_name ?? ""} ${item.profiles?.phone ?? ""} ${item.id}`.toLowerCase();
      if (!hay.includes(s)) return false;
    }

    // Category filter
    if (categoryFilter !== "all" && item.products?.categories?.name !== categoryFilter) return false;

    // Subcategory filter
    if (subcategoryFilter !== "all" && item.products?.subcategories?.name !== subcategoryFilter) return false;

    // Customer filter
    if (customerFilter !== "all" && item.profiles?.full_name !== customerFilter) return false;

    // City filter
    if (cityFilter !== "all" && item.profiles?.city !== cityFilter) return false;

    // State filter
    if (stateFilter !== "all" && item.profiles?.state !== stateFilter) return false;

    // Date range filter
    if (dateFrom && item.sold_at) {
      const soldDate = new Date(item.sold_at);
      const fromDate = new Date(dateFrom);
      if (soldDate < fromDate) return false;
    }

    if (dateTo && item.sold_at) {
      const soldDate = new Date(item.sold_at);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (soldDate > toDate) return false;
    }

    return true;
  });

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ margin: "0 0 20px 0", fontSize: 28, fontWeight: 700, color: "#8B6F47" }}>
        Sold Items
      </h2>

      {/* Filters */}
      <div style={{ background: "white", padding: 20, borderRadius: 8, marginBottom: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: "white" }}
          >
            <option value="all">Category: All</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={subcategoryFilter}
            onChange={(e) => setSubcategoryFilter(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: "white" }}
          >
            <option value="all">Subcategory: All</option>
            {subcategories.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>

          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: "white" }}
          >
            <option value="all">Customer: All</option>
            {customers.map(cust => (
              <option key={cust} value={cust}>{cust}</option>
            ))}
          </select>

          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: "white" }}
          >
            <option value="all">City: All</option>
            {cities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          <select
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", background: "white" }}
          >
            <option value="all">State: All</option>
            {states.map(state => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>

        <input
          type="text"
          placeholder="Search product/customer/email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ 
            width: "100%", 
            padding: "10px 12px", 
            borderRadius: 6, 
            border: "1px solid #ddd",
            marginBottom: 12,
            fontSize: 14
          }}
        />

        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd" }}
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd" }}
          />
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={load}
            style={{
              padding: "8px 20px",
              background: "#8B6F47",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Refresh
          </button>
          <button
            onClick={handleClear}
            style={{
              padding: "8px 20px",
              background: "white",
              color: "#333",
              border: "1px solid #ddd",
              borderRadius: 6,
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, background: "white", borderRadius: 8 }}>
          Loading...
        </div>
      ) : (
        <div style={{ overflowX: "auto", background: "white", borderRadius: 8, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9f7f4", borderBottom: "2px solid #e5e5e5" }}>
                <th style={{ padding: 14, textAlign: "left", fontWeight: 700, fontSize: 13 }}>Image</th>
                <th style={{ padding: 14, textAlign: "left", fontWeight: 700, fontSize: 13 }}>Item</th>
                <th style={{ padding: 14, textAlign: "left", fontWeight: 700, fontSize: 13 }}>Date</th>
                <th style={{ padding: 14, textAlign: "left", fontWeight: 700, fontSize: 13 }}>Customer</th>
                <th style={{ padding: 14, textAlign: "left", fontWeight: 700, fontSize: 13 }}>Location</th>
                <th style={{ padding: 14, textAlign: "left", fontWeight: 700, fontSize: 13 }}>Category</th>
                <th style={{ padding: 14, textAlign: "left", fontWeight: 700, fontSize: 13 }}>Subcategory</th>
                <th style={{ padding: 14, textAlign: "right", fontWeight: 700, fontSize: 13 }}>Weight (g)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #e5e5e5" }}>
                  <td style={{ padding: 12 }}>
                    {item.image_url || item.products?.image_url ? (
                      <img
                        src={item.image_url || item.products?.image_url || ""}
                        alt=""
                        onClick={() => setModalImage(item.image_url || item.products?.image_url || "")}
                        style={{ 
                          width: 50, 
                          height: 50, 
                          objectFit: "cover", 
                          borderRadius: 6,
                          cursor: "pointer"
                        }}
                      />
                    ) : (
                      <div style={{ width: 50, height: 50, background: "#f5f5f5", borderRadius: 6 }} />
                    )}
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ fontWeight: 700, color: "#8B6F47" }}>#{item.id}</div>
                    <div style={{ fontSize: 11, color: "#999" }}>Item #{item.id}</div>
                  </td>
                  <td style={{ padding: 12, fontSize: 13 }}>
                    {item.sold_at ? new Date(item.sold_at).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric"
                    }) + ", " + new Date(item.sold_at).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true
                    }) : "-"}
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ fontWeight: 600 }}>{item.profiles?.full_name ?? "-"}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>{item.profiles?.phone ?? ""}</div>
                  </td>
                  <td style={{ padding: 12, fontSize: 13 }}>
                    {item.profiles?.city && item.profiles?.state
                      ? `${item.profiles.city}, ${item.profiles.state}`
                      : "-"}
                  </td>
                  <td style={{ padding: 12, fontSize: 13 }}>
                    {item.products?.categories?.name ?? "-"}
                  </td>
                  <td style={{ padding: 12, fontSize: 13 }}>
                    {item.products?.subcategories?.name ?? "-"}
                  </td>
                  <td style={{ padding: 12, textAlign: "right", fontWeight: 600, color: "#8B6F47" }}>
                    {item.weight != null ? Number(item.weight).toFixed(3) : "-"}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: 40, color: "#999" }}>
                    No sold items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Image Modal */}
      {modalImage && (
        <div
          onClick={() => setModalImage(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
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
              onClick={() => setModalImage(null)}
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
                justifyContent: "center"
              }}
            >
              ×
            </button>
            <img
              src={modalImage}
              alt="Full size"
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: 8
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}