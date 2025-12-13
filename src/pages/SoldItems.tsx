import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function SoldItems() {
  const [soldItems, setSoldItems] = useState<any[]>([]);
  const [filteredItems, setFilteredItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Filters
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterSubcategory, setFilterSubcategory] = useState<string>("");
  const [filterCustomer, setFilterCustomer] = useState<string>("");
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const [imageModal, setImageModal] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    
    // Check if we were redirected from customers page with a filter
    const customerFilter = sessionStorage.getItem("soldItemsCustomerFilter");
    if (customerFilter) {
      setFilterCustomer(customerFilter);
      sessionStorage.removeItem("soldItemsCustomerFilter");
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [soldItems, filterCategory, filterSubcategory, filterCustomer, filterDateFrom, filterDateTo, searchTerm]);

  async function loadData() {
    setLoading(true);

    // Load sold items with related data
    const { data: items, error } = await supabase
      .from("product_items")
      .select(`
        id,
        product_id,
        weight,
        image_url,
        sold_at,
        sold_to_user,
        sold_to_name,
        products:product_id (
          id,
          name,
          category_id,
          subcategory_id,
          category:category_id ( id, name ),
          subcategory:subcategory_id ( id, name )
        ),
        profile:sold_to_user (
          id,
          full_name,
          email,
          phone,
          city,
          state,
          balance_grams
        )
      `)
      .eq("sold", true)
      .order("sold_at", { ascending: false });

    if (error) {
      console.error("Error loading sold items:", error);
      setLoading(false);
      return;
    }

    // Clean and structure the data
    const cleaned = items?.map((item: any) => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.products?.name || "Unknown Product",
      category_id: item.products?.category_id,
      category_name: item.products?.category?.name || "-",
      subcategory_id: item.products?.subcategory_id,
      subcategory_name: item.products?.subcategory?.name || "-",
      weight: item.weight,
      image_url: item.image_url,
      sold_at: item.sold_at,
      sold_date: item.sold_at ? new Date(item.sold_at).toLocaleDateString() : "-",
      customer_id: item.sold_to_user,
      customer_name: item.profile?.full_name || item.sold_to_name || "-",
      customer_email: item.profile?.email || "-",
      customer_phone: item.profile?.phone || "-",
      customer_city: item.profile?.city || "-",
      customer_state: item.profile?.state || "-",
      customer_location: item.profile?.city && item.profile?.state 
        ? `${item.profile.city}, ${item.profile.state}`
        : item.profile?.city || item.profile?.state || "-",
      customer_balance: item.profile?.balance_grams || 0,
    })) || [];

    setSoldItems(cleaned);

    // Load categories
    const { data: cats } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    setCategories(cats || []);

    // Load subcategories
    const { data: subs } = await supabase
      .from("subcategories")
      .select("*")
      .order("name");
    setSubcategories(subs || []);

    // Load unique customers who have bought items
    const uniqueCustomers = cleaned
      .filter((item: any) => item.customer_id)
      .reduce((acc: any[], item: any) => {
        if (!acc.find(c => c.id === item.customer_id)) {
          acc.push({
            id: item.customer_id,
            name: item.customer_name,
            email: item.customer_email,
          });
        }
        return acc;
      }, []);
    setCustomers(uniqueCustomers);

    setLoading(false);
  }

  function applyFilters() {
    let filtered = [...soldItems];

    // Category filter
    if (filterCategory) {
      filtered = filtered.filter(item => 
        item.category_id?.toString() === filterCategory
      );
    }

    // Subcategory filter
    if (filterSubcategory) {
      filtered = filtered.filter(item => 
        item.subcategory_id?.toString() === filterSubcategory
      );
    }

    // Customer filter
    if (filterCustomer) {
      filtered = filtered.filter(item => 
        item.customer_id === filterCustomer
      );
    }

    // Date from filter
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom);
      filtered = filtered.filter(item => {
        if (!item.sold_at) return false;
        return new Date(item.sold_at) >= fromDate;
      });
    }

    // Date to filter
    if (filterDateTo) {
      const toDate = new Date(filterDateTo);
      toDate.setHours(23, 59, 59); // End of day
      filtered = filtered.filter(item => {
        if (!item.sold_at) return false;
        return new Date(item.sold_at) <= toDate;
      });
    }

    // Search term (product name, customer name, email)
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.product_name.toLowerCase().includes(search) ||
        item.customer_name.toLowerCase().includes(search) ||
        item.customer_email.toLowerCase().includes(search)
      );
    }

    setFilteredItems(filtered);
  }

  function exportToCSV() {
    if (filteredItems.length === 0) {
      alert("No items to export");
      return;
    }

    // Prepare CSV headers
    const headers = [
      "Item ID",
      "Date Sold",
      "Product Name",
      "Category",
      "Subcategory",
      "Weight (g)",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Customer Location",
      "Customer Balance (g)",
    ];

    // Prepare CSV rows
    const rows = filteredItems.map(item => [
      item.id,
      item.sold_date,
      item.product_name,
      item.category_name,
      item.subcategory_name,
      item.weight?.toFixed(3) || "0",
      item.customer_name,
      item.customer_email,
      item.customer_phone,
      item.customer_location,
      item.customer_balance?.toFixed(3) || "0",
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map(row => 
        row.map(cell => `"${cell}"`).join(",")
      )
    ].join("\n");

    // Create and download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `sold_items_${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function clearFilters() {
    setFilterCategory("");
    setFilterSubcategory("");
    setFilterCustomer("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearchTerm("");
  }

  // Calculate totals
  const totalWeight = filteredItems.reduce((sum, item) => sum + (item.weight || 0), 0);
  const totalItems = filteredItems.length;

  return (
    <div style={{ padding: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Sold Items</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={loadData} disabled={loading}>
            Refresh
          </button>
          <button className="btn" onClick={exportToCSV} disabled={filteredItems.length === 0}>
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, marginBottom: 4, display: "block" }}>Search</label>
            <input
              className="input"
              placeholder="Product, customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, marginBottom: 4, display: "block" }}>Category</label>
            <select
              className="input"
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setFilterSubcategory("");
              }}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, marginBottom: 4, display: "block" }}>Subcategory</label>
            <select
              className="input"
              value={filterSubcategory}
              onChange={(e) => setFilterSubcategory(e.target.value)}
              disabled={!filterCategory}
            >
              <option value="">All Subcategories</option>
              {subcategories
                .filter(s => !filterCategory || s.category_id?.toString() === filterCategory)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, marginBottom: 4, display: "block" }}>Customer</label>
            <select
              className="input"
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 12, marginBottom: 4, display: "block" }}>Date From</label>
            <input
              className="input"
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: 12, marginBottom: 4, display: "block" }}>Date To</label>
            <input
              className="input"
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button className="btn ghost" onClick={clearFilters}>
            Clear Filters
          </button>
          <div style={{ fontSize: 14, color: "#666" }}>
            Showing {totalItems} items • Total Weight: {totalWeight.toFixed(3)}g
          </div>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card">Loading sold items...</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Image</th>
                <th>Date</th>
                <th>Product</th>
                <th>Category</th>
                <th>Subcategory</th>
                <th style={{ textAlign: "right" }}>Weight (g)</th>
                <th>Customer Name</th>
                <th>Customer Email</th>
                <th>Customer Location</th>
                <th style={{ textAlign: "right" }}>Balance (g)</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        className="thumb"
                        alt=""
                        style={{ cursor: "pointer" }}
                        onClick={() => setImageModal(item.image_url)}
                      />
                    ) : (
                      <div className="thumb placeholder">—</div>
                    )}
                  </td>
                  <td style={{ minWidth: 100 }}>{item.sold_date}</td>
                  <td style={{ minWidth: 180 }}>{item.product_name}</td>
                  <td style={{ minWidth: 120 }}>{item.category_name}</td>
                  <td style={{ minWidth: 120 }}>{item.subcategory_name}</td>
                  <td style={{ textAlign: "right", minWidth: 100 }}>
                    {item.weight ? item.weight.toFixed(3) : "-"}
                  </td>
                  <td style={{ minWidth: 150 }}>{item.customer_name}</td>
                  <td style={{ minWidth: 180 }}>{item.customer_email}</td>
                  <td style={{ minWidth: 150 }}>{item.customer_location}</td>
                  <td style={{ textAlign: "right", minWidth: 100 }}>
                    {item.customer_balance.toFixed(3)}
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: 20 }}>
                    No sold items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Image Modal */}
      {imageModal && (
        <div className="modal-overlay" onClick={() => setImageModal(null)}>
          <div
            className="modal-body"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "90vh" }}
          >
            <img
              src={imageModal}
              alt=""
              style={{
                width: "100%",
                height: "auto",
                maxHeight: "80vh",
                objectFit: "contain",
              }}
            />
            <div
              style={{
                marginTop: 8,
                display: "flex",
                justifyContent: "flex-end",
              }}
            >
              <button className="btn" onClick={() => setImageModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}