// src/pages/Admin.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import StockManagement from "./StockManagement";
import RawGold from "./RawGold";
import ProductsAdmin from "./ProductsAdmin";


/**
 * Admin.tsx — Item-per-row table view
 * - Option 3: tabular layout where each product in an order is shown as its own row
 * - Filters for: status, category, subcategory, customer, city, state, date range, free-text
 * - Export visible rows to CSV
 * - Image click -> centered modal
 * - Update order status (updates the orders table for the order_id)
 *
 * Assumes these views/tables exist:
 * - v_order_items_detailed  (per-item: order_id, product_image_url, product_weight, category, subcategory, quantity, product_name, order_item_id, etc.)
 * - v_orders_with_customer  (order-level with customer fields: order_id, user_id, created_at, full_name, email, state, city, phone, balance_grams, status)
 *
 * If RLS blocks updates you will get an alert. Adjust Row-level policies accordingly.
 */

/* ---------------------- Types ---------------------- */
type ItemRow = {
  order_item_id: number | null;
  order_id: number;
  product_id?: number | null;
  product_name?: string | null;
  product_image_url?: string | null;
  product_weight?: number | null;
  quantity?: number | null;
  category?: string | null;
  subcategory?: string | null;
  // order-level fields (merged from orders view)
  created_at?: string | null;
  full_name?: string | null;
  email?: string | null;
  state?: string | null;
  city?: string | null;
  phone?: string | null;
  balance_grams?: number | null;
  status?: string | null;
};

const ADMIN_EMAIL = "meetansh0305@gmail.com";

/* ---------------------- Helpers ---------------------- */
function formatDate(iso?: string | null) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

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

/* ---------------------- Component ---------------------- */
export default function Admin() {
  const [ok, setOk] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"orders" | "customers" | "products">("orders");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const email = data?.user?.email?.toLowerCase() || "";
      setOk(email === ADMIN_EMAIL.toLowerCase());
    })();
  }, []);

  if (ok === null) return null;
  if (!ok) return <div className="container">No admin access.</div>;

  return (
    <div className="container">
      <style>{globalStyles}</style>

      <h2 className="section-title">Admin Panel</h2>

      <div className="tabs" style={{ marginBottom: 12 }}>
      <button className={`tab ${tab === "orders" ? "active" : ""}`} onClick={() => setTab("orders")}>
      Orders
     </button>
      <button className={`tab ${tab === "customers" ? "active" : ""}`} onClick={() => setTab("customers")}>
     Customers
    </button>
     <button className={`tab ${tab === "products" ? "active" : ""}`} onClick={() => setTab("products")}>
    Products
    </button>
    <button className={`tab ${tab === "reorder" ? "active" : ""}`} onClick={() => setTab("reorder")}>
     Reorder Images
    </button>
    <button className={`tab ${tab === "stock" ? "active" : ""}`} onClick={() => setTab("stock")}>
     Stock
    </button>
    <button
    className={`tab ${tab === "raw_gold" ? "active" : ""}`} onClick={() => setTab("raw_gold")}>
      Raw Gold
    </button>

      </div>

      {tab === "orders" && <OrdersTable />}
      {tab === "customers" && <CustomersTable />}
      {tab === "products" && <ProductsAdmin />}
      {tab === "reorder" && <ReorderImages />}
      {tab === "stock" && <StockManagement />}
      {tab === "raw_gold" && <RawGold />}

    </div>
  );
}

/* =====================================================
   ORDERS (per-item rows)
   ===================================================== */
function OrdersTable() {
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(false);

  // filters
  const [filterStatus, setFilterStatus] = useState<string>(""); // "", or in_progress/ready/delivered
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterSubcategory, setFilterSubcategory] = useState<string>("");
  const [filterCustomer, setFilterCustomer] = useState<string>("");
  const [filterCity, setFilterCity] = useState<string>("");
  const [filterState, setFilterState] = useState<string>("");
  const [search, setSearch] = useState<string>(""); // free text across name, email
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // modal image
  const [imgModal, setImgModal] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      // fetch per-item rows
      const { data: items, error: itemsErr } = await supabase
        .from("v_order_items_detailed")
        .select("*")
        .order("order_id", { ascending: false });
      if (itemsErr) {
        console.error("itemsErr", itemsErr);
        alert("Could not fetch order items.");
        setLoading(false);
        return;
      }

      // fetch order-level view to get customer fields and status
      const { data: orders, error: ordersErr } = await supabase
        .from("v_orders_with_customer")
        .select("*");
      if (ordersErr) {
        console.error("ordersErr", ordersErr);
      }

      // map order-level data by order_id
      const orderMap = new Map<number, any>();
      (orders ?? []).forEach((o: any) => orderMap.set(o.order_id, o));

      // merge item rows with order-level fields
      const merged: ItemRow[] = (items ?? []).map((it: any) => {
        const ord = orderMap.get(it.order_id) ?? {};
        return {
          order_item_id: it.order_item_id ?? null,
          order_id: it.order_id,
          product_id: it.product_id ?? null,
          product_name: it.product_name ?? null,
          product_image_url: it.product_image_url ?? it.product_image_url ?? null,
          product_weight: it.product_weight ?? it.weight_at_purchase ?? null,
          quantity: it.quantity ?? 1,
          category: it.category ?? null,
          subcategory: it.subcategory ?? null,
          created_at: ord.created_at ?? ord.created_at ?? null,
          full_name: ord.full_name ?? null,
          email: ord.email ?? null,
          state: ord.state ?? null,
          city: ord.city ?? null,
          phone: ord.phone ?? null,
          balance_grams: ord.balance_grams ?? null,
          status: ord.status ?? ord.status ?? null,
        };
      });

      setRows(merged);
    } catch (e) {
      console.error(e);
      alert("Failed loading admin data.");
    } finally {
      setLoading(false);
    }
  };

  // Derived dropdown options (unique)
  const statuses = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.status && set.add(r.status));
    // ensure common statuses present
    ["in_progress", "ready", "delivered"].forEach((s) => set.add(s));
    return Array.from(set).filter(Boolean);
  }, [rows]);

  const categories = useMemo(() => Array.from(new Set(rows.map((r) => r.category ?? "").filter(Boolean))), [rows]);
  const subcategories = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .filter((r) => (filterCategory ? r.category === filterCategory : true))
            .map((r) => r.subcategory ?? "")
            .filter(Boolean)
        )
      ),
    [rows, filterCategory]
  );
  const customers = useMemo(() => Array.from(new Set(rows.map((r) => r.full_name ?? "").filter(Boolean))), [rows]);
  const cities = useMemo(() => Array.from(new Set(rows.map((r) => r.city ?? "").filter(Boolean))), [rows]);
  const states = useMemo(() => Array.from(new Set(rows.map((r) => r.state ?? "").filter(Boolean))), [rows]);

  // Filtered rows based on filters
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterCategory && r.category !== filterCategory) return false;
      if (filterSubcategory && r.subcategory !== filterSubcategory) return false;
      if (filterCustomer && (r.full_name ?? "") !== filterCustomer) return false;
      if (filterCity && (r.city ?? "") !== filterCity) return false;
      if (filterState && (r.state ?? "") !== filterState) return false;
      if (dateFrom && r.created_at && new Date(r.created_at) < new Date(dateFrom)) return false;
      if (dateTo && r.created_at && new Date(r.created_at) > new Date(dateTo + "T23:59:59")) return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${r.product_name ?? ""} ${r.full_name ?? ""} ${r.email ?? ""} ${r.category ?? ""} ${r.subcategory ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [rows, filterStatus, filterCategory, filterSubcategory, filterCustomer, filterCity, filterState, dateFrom, dateTo, search]);

  const updateStatus = async (orderId: number, newStatus: string) => {
    // update order-level status (affects all items with same order_id)
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (error) {
      console.error("updateStatus error:", error);
      alert("Could not update status (RLS or server error).");
      return;
    }
    // reflect in UI by refreshing order view portion
    // We update local rows for the orderId for instant UI feedback
    setRows((prev) => prev.map((r) => (r.order_id === orderId ? { ...r, status: newStatus } : r)));
  };

  const clearFilters = () => {
    setFilterStatus("");
    setFilterCategory("");
    setFilterSubcategory("");
    setFilterCustomer("");
    setFilterCity("");
    setFilterState("");
    setDateFrom("");
    setDateTo("");
    setSearch("");
  };

  const exportCsv = () => {
    const out: Array<Array<string | number | null>> = [
      [
        "Order ID",
        "Order Item ID",
        "Date",
        "Customer",
        "Email",
        "City",
        "State",
        "Category",
        "Subcategory",
        "Product",
        "Weight (g)",
        "Qty",
        "Status",
        "Image URL",
      ],
    ];
    filtered.forEach((r) => {
      out.push([
        r.order_id,
        r.order_item_id,
        r.created_at ? formatDate(r.created_at) : "",
        r.full_name ?? "",
        r.email ?? "",
        r.city ?? "",
        r.state ?? "",
        r.category ?? "",
        r.subcategory ?? "",
        r.product_name ?? "",
        r.product_weight != null ? Number(r.product_weight).toFixed(3) : "",
        r.quantity ?? 1,
        r.status ?? "",
        r.product_image_url ?? "",
      ]);
    });
    downloadCsv(`orders-items-${new Date().toISOString().slice(0, 10)}.csv`, out);
  };

  return (
    <div>
      <div className="card filter-bar" style={{ marginBottom: 12 }}>
        <div className="filters-row">
          <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Status: All</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select className="input" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">Category: All</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select className="input" value={filterSubcategory} onChange={(e) => setFilterSubcategory(e.target.value)} disabled={!filterCategory}>
            <option value="">Subcategory: All</option>
            {subcategories.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select className="input" value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)}>
            <option value="">Customer: All</option>
            {customers.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select className="input" value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
            <option value="">City: All</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select className="input" value={filterState} onChange={(e) => setFilterState(e.target.value)}>
            <option value="">State: All</option>
            {states.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="filters-row" style={{ marginTop: 10 }}>
          <input className="input" placeholder="Product / Customer / Email contains..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1 }} />
          <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <button className="btn" onClick={loadAll}>
            Refresh
          </button>
          <button className="btn ghost" onClick={clearFilters}>
            Clear
          </button>
          <button className="btn" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Order</th>
              <th>Date</th>
              <th>Customer</th>
              <th>Email</th>
              <th>Location</th>
              <th>Balance (g)</th>
              <th>Category</th>
              <th>Subcategory</th>
              <th>Product & Weight</th>
              <th>Qty</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((r) => (
              <tr key={`${r.order_item_id ?? r.order_id}-${r.product_id ?? "p"}`}>
                <td style={{ width: 80 }}>
                  {r.product_image_url ? (
                    <img
                      src={r.product_image_url}
                      alt=""
                      className="thumb"
                      onClick={() => setImgModal(r.product_image_url ?? null)}
                    />
                  ) : (
                    <div className="thumb placeholder">—</div>
                  )}
                </td>

                <td>
                  <div style={{ fontWeight: 800 }}>Order #{r.order_id}</div>
                  <div style={{ fontSize: 12, opacity: 0.8 }}>Item #{r.order_item_id ?? "-"}</div>
                </td>

                <td style={{ minWidth: 160 }}>{r.created_at ? formatDate(r.created_at) : "-"}</td>

                <td style={{ minWidth: 180 }}>{r.full_name ?? "-"}</td>

                <td style={{ minWidth: 180 }}>{r.email ?? "-"}</td>

                <td style={{ minWidth: 160 }}>
                  {r.city ?? "-"}, {r.state ?? "-"}
                </td>

                <td style={{ minWidth: 120, fontWeight: 700 }}>{r.balance_grams != null ? Number(r.balance_grams).toFixed(3) : "0.000"}</td>

                <td style={{ minWidth: 160 }}>{r.category ?? "-"}</td>

                <td style={{ minWidth: 160 }}>{r.subcategory ?? "-"}</td>

                <td>
                  <div style={{ fontWeight: 700 }}>{r.product_name ?? "-"}</div>
                  <div style={{ fontSize: 12, opacity: 0.9 }}>Weight: {r.product_weight != null ? Number(r.product_weight).toFixed(2) + " g" : "-"}</div>
                </td>

                <td style={{ textAlign: "center", minWidth: 60 }}>{r.quantity ?? 1}</td>

                <td style={{ minWidth: 160 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={`status-badge ${r.status ?? ""}`}>{r.status ?? "-"}</span>
                    <select
                      className="input"
                      value={r.status ?? ""}
                      onChange={(e) => updateStatus(r.order_id, e.target.value)}
                    >
                      <option value="in_progress">in_progress</option>
                      <option value="ready">ready</option>
                      <option value="delivered">delivered</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} style={{ textAlign: "center", padding: 24 }}>
                  No items match filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Image modal centered */}
      {imgModal && (
        <div className="modal-overlay" onClick={() => setImgModal(null)}>
          <div className="modal-body" onClick={(e) => e.stopPropagation()}>
            <img src={imgModal} alt="" style={{ maxWidth: "90vw", maxHeight: "80vh", objectFit: "contain" }} />
            <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
              <button className="btn" onClick={() => setImgModal(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="card" style={{ marginTop: 12 }}>Loading...</div>}
    </div>
  );
}

/* =====================================================
   CUSTOMERS TABLE — simplified table + CSV export
   ===================================================== */
function CustomersTable() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("v_customers").select("*").order("orders_count", { ascending: false });
    setRows((data as any[]) ?? []);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (term) {
        const hay = `${r.full_name || ""} ${r.email || ""} ${r.city || ""} ${r.state || ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      // date filtering would require order-level date aggregation — skipping here for simplicity
      return true;
    });
  }, [q, rows, dateFrom, dateTo]);

  const exportCsv = () => {
    const out: Array<Array<string | number | null>> = [
      ["User ID", "Customer", "Email", "Contact", "State", "City", "Balance (g)", "Total Bought (g)", "Orders"],
    ];
    filtered.forEach((r) => {
      out.push([
        r.user_id,
        r.full_name ?? "",
        r.email ?? "",
        r.phone ?? "",
        r.state ?? "",
        r.city ?? "",
        r.balance_grams != null ? Number(r.balance_grams).toFixed(3) : "",
        r.total_weight_bought != null ? Number(r.total_weight_bought).toFixed(3) : "",
        String(r.orders_count ?? 0),
      ]);
    });
    downloadCsv(`customers-${new Date().toISOString().slice(0, 10)}.csv`, out);
  };

  const saveBalance = async (user_id: string, grams: number) => {
    const { error } = await supabase.from("profiles").update({ balance_grams: grams }).eq("id", user_id);
    if (error) {
      alert("Failed to save balance.");
      return;
    }
    load();
  };

  return (
    <div>
      <div className="card filter-bar" style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input className="input" placeholder="Search customers..." value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn" onClick={load}>
            Refresh
          </button>
          <button className="btn" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Email</th>
              <th>Contact</th>
              <th>State</th>
              <th>City</th>
              <th>Balance (g)</th>
              <th>Total Bought (g)</th>
              <th>Orders</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((c) => (
              <tr key={c.user_id}>
                <td style={{ minWidth: 180 }}>{c.full_name ?? c.email ?? c.user_id}</td>
                <td>{c.email ?? "-"}</td>
                <td>{c.phone ?? "-"}</td>
                <td>{c.state ?? "-"}</td>
                <td>{c.city ?? "-"}</td>
                <td style={{ fontWeight: 700 }}>{c.balance_grams != null ? Number(c.balance_grams).toFixed(3) : "0.000"}</td>
                <td>{c.total_weight_bought != null ? Number(c.total_weight_bought).toFixed(3) : "0.000"}</td>
                <td>{String(c.orders_count ?? 0)}</td>
                <td>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn" onClick={() => (window.location.href = `/orders?user=${c.user_id}`)}>View Orders</button>
                    <input
                      type="number"
                      step="0.001"
                      className="input"
                      defaultValue={(c.balance_grams ?? 0).toFixed(3)}
                      onBlur={(e) => saveBalance(c.user_id, Number(e.target.value))}
                      style={{ width: 120 }}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: 24 }}>
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && <div className="card" style={{ marginTop: 12 }}>Loading...</div>}
    </div>
  );
}

/* =====================================================
   REORDER IMAGES TAB (DRAG & DROP)
   ===================================================== */
function ReorderImages() {
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedSub, setSelectedSub] = useState<number | "">("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: c } = await supabase.from("categories").select("*").order("name");
    const { data: s } = await supabase.from("subcategories").select("*").order("name");
    setCategories(c ?? []);
    setSubcategories(s ?? []);
  };

  const loadProducts = async (sid: number) => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("subcategory_id", sid)
      .order("position", { ascending: true });
    setProducts(data ?? []);
  };

  const handleDrag = (e: any, index: number) => {
    e.dataTransfer.setData("index", index.toString());
  };

  const handleDrop = (e: any, index: number) => {
    const fromIndex = Number(e.dataTransfer.getData("index"));
    const toIndex = index;

    const updated = [...products];
    const moved = updated.splice(fromIndex, 1)[0];
    updated.splice(toIndex, 0, moved);

    setProducts(updated);
  };

  const saveOrder = async () => {
    for (let i = 0; i < products.length; i++) {
      await supabase.from("products").update({ position: i }).eq("id", products[i].id);
    }
    alert("Order saved!");
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 12 }}>
        <h3>Reorder Product Images</h3>

        <select
          className="input"
          value={selectedSub}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedSub(v);
            if (v) loadProducts(Number(v));
          }}
        >
          <option value="">Select Subcategory</option>
          {subcategories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid">
        {products.map((p, i) => (
          <div
            key={p.id}
            className="card"
            draggable
            onDragStart={(e) => handleDrag(e, i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, i)}
            style={{ border: "2px dashed #CBD5E1", cursor: "grab" }}
          >
            <img src={p.image_url} style={{ width: "100%", height: 200, objectFit: "cover" }} />
            <div style={{ marginTop: 8, fontWeight: 700 }}>{p.weight} g</div>
          </div>
        ))}
      </div>

      {products.length > 0 && (
        <button className="btn" style={{ marginTop: 16 }} onClick={saveOrder}>
          Save Order
        </button>
      )}
    </div>
  );
}


/* ---------------------- Styles ---------------------- */
const globalStyles = `
/* Layout */
.container { max-width: 1100px; margin: 18px auto; padding: 18px; font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; color: #0b2540; }
.section-title { font-size: 22px; font-weight: 800; margin-bottom: 12px; }

/* Tabs */
.tabs { display:flex; gap:8px; margin-bottom: 16px; }
.tab { padding: 8px 12px; border-radius: 8px; background: #f3f5f8; border: 1px solid #e6e9ee; cursor: pointer; }
.tab.active { background: #071E33; color: #fff; }

/* Card */
.card { background: #fff; border-radius: 12px; box-shadow: 0 8px 20px rgba(11,37,64,0.04); padding: 12px; border: 1px solid #eef2f6; }

/* Filter area */
.filter-bar .filters-row { display:flex; gap:10px; align-items:center; flex-wrap:wrap; }
.input { padding: 8px 10px; border: 1px solid #e0e6eb; border-radius: 8px; background: #fff; min-height: 40px; }
.input:disabled { background: #fafafa; opacity: 0.95; }
.btn { padding: 8px 12px; border-radius: 8px; background: #071E33; color: #fff; border: none; cursor: pointer; }
.btn.ghost { background: #fff; color: #071E33; border: 1px solid #e6e9ee; }

/* Table */
.admin-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
.admin-table thead th { text-align: left; background: #fafafa; padding: 12px; border-bottom: 1px solid #eef2f6; position: sticky; top: 0; z-index: 2; }
.admin-table th, .admin-table td { padding: 12px; border-bottom: 1px solid #f3f6f8; vertical-align: top; }
.admin-table tbody tr:hover { background: rgba(7,30,51,0.03); }

/* Thumb image */
.thumb { width: 64px; height: 64px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 1px solid #eef2f6; }
.thumb.placeholder { width: 64px; height: 64px; display:flex; align-items:center; justify-content:center; background:#fafafa; border-radius:8px; }

/* small status badge */
.status-badge { padding: 6px 8px; border-radius: 999px; font-weight:700; font-size: 12px; }
.status-badge.in_progress { background: #e8f4ff; color: #0d47a1; }
.status-badge.ready { background: #fff8e1; color: #f57f17; }
.status-badge.delivered { background: #e8f9ee; color: #2e7d32; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.6); z-index: 9999; }
.modal-body { background: #fff; padding: 16px; border-radius: 8px; max-width: 95vw; max-height: 90vh; overflow:auto; }

/* Grid helper */

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;               /* MORE SPACING */
  align-items: start;      /* FIX overlapping */
}


/* Product card small */
.image-wrap {
  position: relative;
  width: 100%;
  height: 320px;            /* increased height */
  overflow: hidden;
  border-radius: 12px;
  background: #f5f5f5;      /* fallback bg */
  display: flex;
  align-items: center;
  justify-content: center;
}

.product {
  width: 100%;
  height: 100%;
  object-fit: contain;      /* <— important */
}


/* Responsive tweaks */
@media (max-width: 900px) {
  .filters-row { flex-direction: column; align-items: stretch; }
  .admin-table thead th { font-size: 13px; }
}


.reorder-handle {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0,0,0,0.5);
  color: #fff;
  padding: 4px 6px;
  border-radius: 6px;
  font-size: 12px;
  cursor: grab;
  z-index: 5;
}
.reorder-handle:active {
  cursor: grabbing;
}

`;


