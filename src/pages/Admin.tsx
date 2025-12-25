import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import StockManagement from "./StockManagement";
import RawGold from "./RawGold";
import ProductsAdmin from "./ProductsAdmin";
import SoldItems from "./SoldItems";
import AdminDashboard from "./AdminDashboard";

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
  created_at?: string | null;
  full_name?: string | null;
  email?: string | null;
  state?: string | null;
  city?: string | null;
  phone?: string | null;
  balance_grams?: number | null;
  status?: string | null;
};

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
  const [tab, setTab] = useState<"dashboard" | "orders" | "customers" | "products" | "reorder" | "stock" | "raw_gold" | "sold" | "admin_users" | "contact_messages">("dashboard");

  useEffect(() => {
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) {
        setOk(false);
        return;
      }
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", authData.user.id)
        .single();
      
      setOk(profile?.is_admin === true);
    })();
  }, []);

  if (ok === null) return null;
  if (!ok) return <div className="container"><div className="card" style={{ textAlign: "center", padding: 40 }}>No admin access.</div></div>;

  return (
    <div className="container">
      <h2 className="section-title" style={{ color: "var(--accent-dark)", borderBottom: "2px solid var(--accent)", paddingBottom: 12 }}>
        Admin Panel
      </h2>

      <div className="tabs" style={{ marginBottom: 16, flexWrap: "wrap" }}>
        {[
          { key: "dashboard", label: "Dashboard" },
          { key: "orders", label: "Orders" },
          { key: "customers", label: "Customers" },
          { key: "sold", label: "Sold Items" },
          { key: "products", label: "Products" },
          { key: "reorder", label: "Reorder Images" },
          { key: "stock", label: "Stock" },
          { key: "raw_gold", label: "Raw Gold" },
          { key: "admin_users", label: "Admin Users" },
          { key: "contact_messages", label: "Contact Messages" },
        ].map((t) => (
          <button
            key={t.key}
            className={`tab ${tab === t.key ? "active" : ""}`}
            onClick={() => setTab(t.key as any)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <AdminDashboard />}
      {tab === "orders" && <OrdersTable />}
      {tab === "customers" && <CustomersTable />}
      {tab === "sold" && <SoldItems />}
      {tab === "products" && <ProductsAdmin />}
      {tab === "reorder" && <ReorderImages />}
      {tab === "stock" && <StockManagement />}
      {tab === "raw_gold" && <RawGold />}
      {tab === "admin_users" && <AdminUsersManagement />}
    </div>
  );
}

/* =====================================================
   ORDERS (per-item rows)
   ===================================================== */
function OrdersTable() {
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<number>>(new Set());

  // filters
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterSubcategory, setFilterSubcategory] = useState<string>("");
  const [filterCustomer, setFilterCustomer] = useState<string>("");
  const [filterCity, setFilterCity] = useState<string>("");
  const [filterState, setFilterState] = useState<string>("");
  const [search, setSearch] = useState<string>("");
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

      const { data: orders, error: ordersErr } = await supabase
        .from("v_orders_with_customer")
        .select("*");
      if (ordersErr) {
        console.error("ordersErr", ordersErr);
      }

      const orderMap = new Map<number, any>();
      (orders ?? []).forEach((o: any) => orderMap.set(o.order_id, o));

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

  const statuses = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => r.status && set.add(r.status));
    ["in_progress", "ready", "delivered", "cancelled"].forEach((s) => set.add(s));
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

  const updateStatus = async (orderId: number, currentStatus: string, newStatus: string) => {
    // Validate status transition
    const validTransitions: Record<string, string[]> = {
      "in_progress": ["ready", "cancelled"],
      "ready": ["delivered", "cancelled"],
      "delivered": [], // Cannot change from delivered
      "cancelled": [], // Cannot change from cancelled
    };

    const allowedStatuses = validTransitions[currentStatus] || [];
    if (!allowedStatuses.includes(newStatus)) {
      alert(`Cannot change status from "${currentStatus}" to "${newStatus}".\n\nValid transitions:\n${allowedStatuses.length > 0 ? allowedStatuses.map(s => `- ${s}`).join("\n") : "None (this status is final)"}`);
      return;
    }

    const { error } = await (supabase.from("orders").update({ status: newStatus } as any).eq("id", orderId) as unknown as Promise<{ error: any }>);
    if (error) {
      console.error("updateStatus error:", error);
      alert("Could not update status (RLS or server error).");
      return;
    }
    
    // Send email notification if status changed to ready/delivered
    if ((newStatus === "ready" || newStatus === "delivered" || newStatus === "cancelled") && currentStatus !== newStatus) {
      const orderRow = rows.find(r => r.order_id === orderId);
      if (orderRow?.email) {
        try {
          const { sendOrderStatusUpdate } = await import("../utils/emailNotifications");
          await sendOrderStatusUpdate(orderRow.email, orderId, currentStatus, newStatus);
        } catch (e) {
          console.log("Email notification skipped (service not configured)");
        }
      }
    }
    
    setRows((prev) => prev.map((r) => (r.order_id === orderId ? { ...r, status: newStatus } : r)));
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    if (selectedOrderIds.size === 0) {
      alert("Select at least one order");
      return;
    }

    if (!confirm(`Update ${selectedOrderIds.size} order(s) to "${newStatus}"?`)) return;

    const orderIds = Array.from(selectedOrderIds);
    let successCount = 0;
    let failCount = 0;

    for (const orderId of orderIds) {
      const order = rows.find(r => r.order_id === orderId);
      if (!order) continue;

      const validTransitions: Record<string, string[]> = {
        "in_progress": ["ready", "cancelled"],
        "ready": ["delivered", "cancelled"],
        "delivered": [],
        "cancelled": [],
      };

      const allowedStatuses = validTransitions[order.status || ""] || [];
      if (!allowedStatuses.includes(newStatus)) {
        failCount++;
        continue;
      }

      const { error } = await (supabase.from("orders").update({ status: newStatus } as any).eq("id", orderId) as unknown as Promise<{ error: any }>);
      if (!error) {
        successCount++;
      } else {
        failCount++;
      }
    }

    await loadAll();
    setSelectedOrderIds(new Set());
    alert(`Updated ${successCount} order(s). ${failCount > 0 ? `${failCount} failed.` : ""}`);
  };

  const toggleOrderSelection = (orderId: number) => {
    const newSet = new Set(selectedOrderIds);
    if (newSet.has(orderId)) {
      newSet.delete(orderId);
    } else {
      newSet.add(orderId);
    }
    setSelectedOrderIds(newSet);
  };

  const selectAllOrders = () => {
    const uniqueOrderIds = new Set(rows.map(r => r.order_id));
    setSelectedOrderIds(uniqueOrderIds);
  };

  const clearSelection = () => {
    setSelectedOrderIds(new Set());
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
        "Phone",
        "City",
        "State",
        "Category",
        "Subcategory",
        "Product ID",
        "Product Name",
        "Weight (g)",
        "Weight at Purchase (g)",
        "Qty",
        "Total Weight (g)",
        "Status",
        "Customer Balance (g)",
        "Image URL",
      ],
    ];
    
    // Group by order_id to calculate order totals
    const orderGroups = new Map<number, typeof filtered>();
    filtered.forEach((r) => {
      if (!orderGroups.has(r.order_id)) {
        orderGroups.set(r.order_id, []);
      }
      orderGroups.get(r.order_id)!.push(r);
    });
    
    filtered.forEach((r) => {
      const orderItems = orderGroups.get(r.order_id) || [];
      const orderTotalWeight = orderItems.reduce((sum, item) => {
        const itemWeight = (item.product_weight ?? 0) * (item.quantity ?? 1);
        return sum + itemWeight;
      }, 0);
      
      out.push([
        r.order_id,
        r.order_item_id,
        r.created_at ? formatDate(r.created_at) : "",
        r.full_name ?? "",
        r.email ?? "",
        r.phone ?? "",
        r.city ?? "",
        r.state ?? "",
        r.category ?? "",
        r.subcategory ?? "",
        r.product_id ?? "",
        r.product_name ?? "",
        r.product_weight != null ? Number(r.product_weight).toFixed(3) : "",
        r.product_weight != null ? Number(r.product_weight).toFixed(3) : "",
        r.quantity ?? 1,
        ((r.product_weight ?? 0) * (r.quantity ?? 1)).toFixed(3),
        r.status ?? "",
        r.balance_grams != null ? Number(r.balance_grams).toFixed(3) : "",
        r.product_image_url ?? "",
      ]);
    });
    downloadCsv(`orders-items-${new Date().toISOString().slice(0, 10)}.csv`, out);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "in_progress":
        return { background: "rgba(176, 141, 87, 0.15)", color: "var(--accent-dark)" };
      case "ready":
        return { background: "#fff8e1", color: "#f57f17" };
      case "delivered":
        return { background: "#e8f9ee", color: "#2e7d32" };
      case "cancelled":
        return { background: "#ffebee", color: "#c62828" };
      default:
        return { background: "var(--bg-cream)", color: "var(--text-muted)" };
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 16, padding: 20 }}>
        <h4 style={{ margin: "0 0 20px 0", color: "var(--accent-dark)", fontWeight: 700 }}>Filters & Search</h4>
        
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-dark)", marginBottom: 6 }}>
              Status
            </label>
            <select 
              className="input" 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              aria-label="Filter by status"
            >
              <option value="">All Statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-dark)", marginBottom: 6 }}>
              Category
            </label>
            <select 
              className="input" 
              value={filterCategory} 
              onChange={(e) => setFilterCategory(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-dark)", marginBottom: 6 }}>
              Subcategory
            </label>
            <select 
              className="input" 
              value={filterSubcategory} 
              onChange={(e) => setFilterSubcategory(e.target.value)} 
              disabled={!filterCategory}
              aria-label="Filter by subcategory"
            >
              <option value="">All Subcategories</option>
              {subcategories.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-dark)", marginBottom: 6 }}>
              Customer
            </label>
            <select 
              className="input" 
              value={filterCustomer} 
              onChange={(e) => setFilterCustomer(e.target.value)}
              aria-label="Filter by customer"
            >
              <option value="">All Customers</option>
              {customers.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-dark)", marginBottom: 6 }}>
              City
            </label>
            <select 
              className="input" 
              value={filterCity} 
              onChange={(e) => setFilterCity(e.target.value)}
              aria-label="Filter by city"
            >
              <option value="">All Cities</option>
              {cities.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-dark)", marginBottom: 6 }}>
              State
            </label>
            <select 
              className="input" 
              value={filterState} 
              onChange={(e) => setFilterState(e.target.value)}
              aria-label="Filter by state"
            >
              <option value="">All States</option>
              {states.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 16 }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-dark)", marginBottom: 6 }}>
              Search
            </label>
            <input 
              className="input" 
              placeholder="Search product/customer/email..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              aria-label="Search orders"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-dark)", marginBottom: 6 }}>
              Date From
            </label>
            <input 
              className="input" 
              type="date" 
              value={dateFrom} 
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="Filter from date"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-dark)", marginBottom: 6 }}>
              Date To
            </label>
            <input 
              className="input" 
              type="date" 
              value={dateTo} 
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="Filter to date"
            />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "end", flexWrap: "wrap" }}>
            <button 
              className="btn primary" 
              onClick={loadAll}
              style={{ minHeight: 44, flex: 1, minWidth: 100 }}
              aria-label="Refresh orders"
            >
              Refresh
            </button>
            <button 
              className="btn" 
              onClick={clearFilters}
              style={{ minHeight: 44, flex: 1, minWidth: 100 }}
              aria-label="Clear all filters"
            >
              Clear
            </button>
            <button 
              className="btn" 
              onClick={exportCsv} 
              style={{ background: "var(--accent)", borderColor: "var(--accent)", color: "#fff", minHeight: 44, flex: 1, minWidth: 120 }}
              aria-label="Export to CSV"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24, marginBottom: 24, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-cream)", borderBottom: "2px solid var(--border-light)" }}>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-dark)" }}>
                <input
                  type="checkbox"
                  checked={selectedOrderIds.size > 0 && selectedOrderIds.size === new Set(rows.map(r => r.order_id)).size}
                  onChange={(e) => e.target.checked ? selectAllOrders() : clearSelection()}
                />
              </th>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-dark)" }}>Image</th>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-dark)" }}>Order</th>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-dark)" }}>Date</th>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-dark)" }}>Customer</th>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-dark)" }}>Location</th>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-dark)" }}>Balance (g)</th>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-dark)" }}>Category</th>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-dark)" }}>Product</th>
              <th style={{ padding: 14, textAlign: "center", fontWeight: 700, color: "var(--text-dark)" }}>Qty</th>
              <th style={{ padding: 14, textAlign: "right", fontWeight: 700, color: "var(--text-dark)" }}>Total Weight</th>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-dark)" }}>Status</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((r) => (
              <tr key={`${r.order_item_id ?? r.order_id}-${r.product_id ?? "p"}`} style={{ borderBottom: "1px solid var(--border-light)" }}>
                <td style={{ padding: 12 }}>
                  <input
                    type="checkbox"
                    checked={selectedOrderIds.has(r.order_id)}
                    onChange={() => toggleOrderSelection(r.order_id)}
                  />
                </td>
                <td style={{ padding: 12 }}>
                  {r.product_image_url ? (
                    <img
                      src={r.product_image_url}
                      alt=""
                      style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, cursor: "pointer", border: "1px solid var(--border-light)" }}
                      onClick={() => setImgModal(r.product_image_url ?? null)}
                    />
                  ) : (
                    <div style={{ width: 56, height: 56, background: "var(--bg-cream)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>—</div>
                  )}
                </td>

                <td style={{ padding: 12 }}>
                  <div style={{ fontWeight: 700, color: "var(--accent-dark)" }}>#{r.order_id}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Item #{r.order_item_id ?? "-"}</div>
                </td>

                <td style={{ padding: 12, minWidth: 140, color: "var(--text-muted)", fontSize: 13 }}>{r.created_at ? formatDate(r.created_at) : "-"}</td>

                <td style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>{r.full_name ?? "-"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.email ?? ""}</div>
                </td>

                <td style={{ padding: 12, color: "var(--text-muted)" }}>{r.city ?? "-"}, {r.state ?? "-"}</td>

                <td style={{ padding: 12, fontWeight: 700, color: "var(--accent)" }}>{r.balance_grams != null ? Number(r.balance_grams).toFixed(3) : "0.000"}</td>

                <td style={{ padding: 12 }}>
                  <div style={{ fontSize: 13 }}>{r.category ?? "-"}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{r.subcategory ?? ""}</div>
                </td>

                <td style={{ padding: 12 }}>
                  <div style={{ fontWeight: 600 }}>{r.product_name ?? "-"}</div>
                  <div style={{ fontSize: 12, color: "var(--accent)" }}>{r.product_weight != null ? Number(r.product_weight).toFixed(2) + " g" : "-"}</div>
                </td>

                <td style={{ padding: 12, textAlign: "center", fontWeight: 600 }}>{r.quantity ?? 1}</td>

                <td style={{ padding: 12, textAlign: "right", fontWeight: 600, color: "var(--accent)" }}>
                  {r.product_weight != null && r.quantity ? ((r.product_weight * r.quantity).toFixed(3) + " g") : "-"}
                </td>

                <td style={{ padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="badge" style={{ ...getStatusStyle(r.status ?? ""), padding: "6px 12px", borderRadius: 20, fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>
                      {r.status ?? "-"}
                    </span>
                    <select
                      className="input"
                      value={r.status ?? ""}
                      onChange={(e) => updateStatus(r.order_id, r.status ?? "", e.target.value)}
                      style={{ width: 130, fontSize: 12 }}
                    >
                      <option value="in_progress">in_progress</option>
                      <option value="ready">ready</option>
                      <option value="delivered">delivered</option>
                      <option value="cancelled">cancelled</option>
                    </select>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={12} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                  No items match filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {imgModal && (
        <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)", zIndex: 9999 }} onClick={() => setImgModal(null)}>
          <div className="card" onClick={(e) => e.stopPropagation()} style={{ padding: 16, maxWidth: "90vw" }}>
            <img src={imgModal} alt="" style={{ maxWidth: "85vw", maxHeight: "75vh", objectFit: "contain", borderRadius: 8 }} />
            <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
              <button className="btn primary" onClick={() => setImgModal(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {loading && <div className="card" style={{ marginTop: 16, textAlign: "center", padding: 24, color: "var(--accent)" }}>Loading...</div>}
    </div>
  );
}

/* =====================================================
   CUSTOMERS TABLE
   ===================================================== */
function CustomersTable() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("full_name", { ascending: true });

    const { data: soldItems } = await supabase
      .from("product_items")
      .select("sold_to_user, weight")
      .eq("sold", true)
      .not("sold_to_user", "is", null);

    const { data: orderStats } = await supabase
      .from("v_customers")
      .select("user_id, orders_count, total_weight_bought");

    const soldWeightMap = new Map<string, number>();
    (soldItems ?? []).forEach((item: any) => {
      const userId = item.sold_to_user;
      const weight = Number(item.weight) || 0;
      soldWeightMap.set(userId, (soldWeightMap.get(userId) || 0) + weight);
    });

    const orderStatsMap = new Map<string, any>();
    (orderStats ?? []).forEach((stat: any) => {
      orderStatsMap.set(stat.user_id, stat);
    });

    const combined = (profiles ?? []).map((profile: any) => {
      const soldWeight = soldWeightMap.get(profile.id) || 0;
      const stats = orderStatsMap.get(profile.id);
      const orderWeight = Number(stats?.total_weight_bought) || 0;

      return {
        user_id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone,
        city: profile.city,
        state: profile.state,
        balance_grams: profile.balance_grams,
        sold_weight: soldWeight,
        order_weight: orderWeight,
        orders_count: stats?.orders_count || 0,
      };
    });

    setRows(combined);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (term) {
        const hay = `${r.full_name || ""} ${r.email || ""} ${r.city || ""} ${r.state || ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [q, rows]);

  const exportCsv = () => {
    const out: Array<Array<string | number | null>> = [
      ["User ID", "Customer", "Email", "Contact", "State", "City", "Balance (g)", "Sold Weight (g)", "Order Weight (g)", "Orders Count"],
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
        r.sold_weight.toFixed(3),
        r.order_weight.toFixed(3),
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
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-dark)", marginBottom: 6 }}>
              Search Customers
            </label>
            <input 
              className="input" 
              placeholder="Search by name or email..." 
              value={q} 
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search customers"
            />
          </div>
          <button className="btn primary" onClick={load}>Refresh</button>
          <button className="btn" onClick={exportCsv} style={{ background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" }}>Export CSV</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 24, marginBottom: 24, padding: 0, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-cream)", borderBottom: "2px solid var(--border-light)" }}>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700 }}>Customer</th>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700 }}>Email</th>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700 }}>Contact</th>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700 }}>Location</th>
              <th style={{ padding: 14, textAlign: "right", fontWeight: 700 }}>Balance (g)</th>
              <th style={{ padding: 14, textAlign: "right", fontWeight: 700 }}>Sold (g)</th>
              <th style={{ padding: 14, textAlign: "right", fontWeight: 700 }}>Orders (g)</th>
              <th style={{ padding: 14, textAlign: "center", fontWeight: 700 }}>Count</th>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700 }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((c) => (
              <tr key={c.user_id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                <td style={{ padding: 12, fontWeight: 600 }}>{c.full_name ?? c.email ?? c.user_id}</td>
                <td style={{ padding: 12, color: "var(--text-muted)", fontSize: 13 }}>{c.email ?? "-"}</td>
                <td style={{ padding: 12, color: "var(--text-muted)" }}>{c.phone ?? "-"}</td>
                <td style={{ padding: 12, color: "var(--text-muted)" }}>{c.city ?? "-"}, {c.state ?? "-"}</td>
                <td style={{ padding: 12, textAlign: "right", fontWeight: 700, color: "var(--accent)" }}>{c.balance_grams != null ? Number(c.balance_grams).toFixed(3) : "0.000"}</td>
                <td style={{ padding: 12, textAlign: "right", fontWeight: 600, color: "#2e7d32" }}>{c.sold_weight.toFixed(3)}</td>
                <td style={{ padding: 12, textAlign: "right", fontWeight: 600, color: "#0d47a1" }}>{c.order_weight.toFixed(3)}</td>
                <td style={{ padding: 12, textAlign: "center" }}>{String(c.orders_count ?? 0)}</td>
                <td style={{ padding: 12 }}>
                  <input
                    type="number"
                    step="0.001"
                    className="input"
                    defaultValue={(c.balance_grams ?? 0).toFixed(3)}
                    onBlur={(e) => saveBalance(c.user_id, Number(e.target.value))}
                    style={{ width: 100 }}
                  />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                  No customers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {loading && <div className="card" style={{ marginTop: 16, textAlign: "center", padding: 24, color: "var(--accent)" }}>Loading...</div>}
    </div>
  );
}

/* =====================================================
   REORDER IMAGES TAB
   ===================================================== */
function ReorderImages() {
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedSub, setSelectedSub] = useState<number | "">("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data: s } = await supabase.from("subcategories").select("*").order("name");
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
    const updated = [...products];
    const moved = updated.splice(fromIndex, 1)[0];
    updated.splice(index, 0, moved);
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
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 12px 0", color: "var(--accent-dark)" }}>Reorder Product Images</h3>
        <select
          className="input"
          value={selectedSub}
          onChange={(e) => {
            const v = e.target.value;
            setSelectedSub(v as any);
            if (v) loadProducts(Number(v));
          }}
          style={{ maxWidth: 300 }}
        >
          <option value="">Select Subcategory</option>
          {subcategories.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
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
            style={{ cursor: "grab", border: "2px dashed var(--border-light)" }}
          >
            <div className="image-wrap">
              <img src={p.image_url} className="product" alt="" />
            </div>
            <div style={{ marginTop: 12, fontWeight: 700, color: "var(--accent)" }}>{p.weight} g</div>
          </div>
        ))}
      </div>

      {products.length > 0 && (
        <button className="btn primary" style={{ marginTop: 20 }} onClick={saveOrder}>Save Order</button>
      )}
    </div>
  );
}

/* =====================================================
   CONTACT MESSAGES TAB
   ===================================================== */
function ContactMessagesTable() {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error loading contact messages:", error);
        setMessages([]);
      } else {
        setMessages(data || []);
      }
    } catch (err) {
      console.error("Error:", err);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Name", "Email", "Phone", "Subject", "Message", "Date"]
    ];
    
    filteredMessages.forEach((msg) => {
      rows.push([
        msg.name || "",
        msg.email || "",
        msg.phone || "",
        msg.subject || "",
        (msg.message || "").replace(/\n/g, " ").substring(0, 100),
        formatDate(msg.created_at)
      ]);
    });

    downloadCsv(`contact_messages_${new Date().toISOString().split('T')[0]}.csv`, rows);
  };

  const filteredMessages = messages.filter((msg) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (msg.name || "").toLowerCase().includes(term) ||
      (msg.email || "").toLowerCase().includes(term) ||
      (msg.phone || "").toLowerCase().includes(term) ||
      (msg.subject || "").toLowerCase().includes(term) ||
      (msg.message || "").toLowerCase().includes(term)
    );
  });

  if (loading) {
    return <div className="card" style={{ textAlign: "center", padding: 40 }}>Loading contact messages...</div>;
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 20, padding: 24 }}>
        <h3 style={{ margin: "0 0 20px 0", color: "var(--primary-dark)", fontWeight: 700, fontSize: 20 }}>
          Contact Messages
        </h3>

        <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 250 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8, color: "var(--text-dark)" }}>
              Search Messages
            </label>
            <input
              className="input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, phone, subject, or message..."
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <button className="btn" onClick={loadMessages} style={{ minHeight: 44 }}>
              Refresh
            </button>
            <button
              className="btn primary"
              onClick={exportCsv}
              disabled={filteredMessages.length === 0}
              style={{ minHeight: 44 }}
            >
              Export CSV
            </button>
          </div>
        </div>

        {filteredMessages.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
            {messages.length === 0 ? (
              <div>
                <p style={{ fontSize: 16, marginBottom: 8 }}>No contact messages yet.</p>
                <p style={{ fontSize: 13 }}>
                  Messages from the contact form will appear here once customers submit them.
                </p>
              </div>
            ) : (
              "No messages match your search."
            )}
          </div>
        ) : (
          <div className="card" style={{ padding: 0, marginTop: 24, marginBottom: 24 }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "var(--bg-cream)", borderBottom: "2px solid var(--border-light)" }}>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>Date</th>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>Name</th>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>Email</th>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>Phone</th>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>Subject</th>
                    <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMessages.map((msg) => (
                    <tr key={msg.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                      <td style={{ padding: 12, fontSize: 13, color: "var(--text-muted)" }}>
                        {formatDate(msg.created_at)}
                      </td>
                      <td style={{ padding: 12, fontWeight: 600 }}>{msg.name || "-"}</td>
                      <td style={{ padding: 12 }}>
                        <a href={`mailto:${msg.email}`} style={{ color: "var(--accent)", textDecoration: "none" }}>
                          {msg.email || "-"}
                        </a>
                      </td>
                      <td style={{ padding: 12 }}>
                        {msg.phone ? (
                          <a href={`tel:${msg.phone}`} style={{ color: "var(--accent)", textDecoration: "none" }}>
                            {msg.phone}
                          </a>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td style={{ padding: 12 }}>{msg.subject || "-"}</td>
                      <td style={{ padding: 12, maxWidth: 400, fontSize: 13, lineHeight: 1.5 }}>
                        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {msg.message || "-"}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* =====================================================
   ADMIN USERS MANAGEMENT
   ===================================================== */
function AdminUsersManagement() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchEmail, setSearchEmail] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  
  // User creation form state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserPhone, setNewUserPhone] = useState("");
  const [newUserCity, setNewUserCity] = useState("");
  const [newUserState, setNewUserState] = useState("");
  const [newUserFirmName, setNewUserFirmName] = useState("");
  const [newUserBusinessType, setNewUserBusinessType] = useState<"wholesale" | "retail" | "manufacturer" | "">("");
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    loadAdmins();
    loadAllUsers();
  }, []);

  const loadAdmins = async () => {
    setLoading(true);
    const { data } = await (supabase
      .from("profiles")
      .select("id, email, full_name, is_admin, created_at")
      .eq("is_admin", true)
      .order("created_at", { ascending: false }) as Promise<{ data: any[] | null; error: any }>);
    setAdmins(data ?? []);
    setLoading(false);
  };

  const loadAllUsers = async () => {
    const { data } = await (supabase
      .from("profiles")
      .select("id, email, full_name, is_admin")
      .order("email", { ascending: true }) as Promise<{ data: any[] | null; error: any }>);
    setAllUsers(data ?? []);
  };

  const addAdminByEmail = async () => {
    const email = newAdminEmail.trim().toLowerCase();
    if (!email) {
      alert("Enter an email address");
      return;
    }

    // Find user by email in profiles
    const { data: existingProfile } = await (supabase
      .from("profiles")
      .select("id, email, is_admin")
      .ilike("email", email)
      .maybeSingle() as Promise<{ data: any | null; error: any }>);

    if (!existingProfile) {
      alert("User with this email not found. User must sign up first.");
      return;
    }

    // Update profile to admin
    const { error } = await (supabase
      .from("profiles")
      .update({ is_admin: true })
      .eq("id", existingProfile.id) as Promise<{ error: any }>);

    if (error) {
      alert("Failed to add admin: " + error.message);
      return;
    }

    setNewAdminEmail("");
    await loadAdmins();
    await loadAllUsers();
    alert("Admin added successfully!");
  };

  const removeAdmin = async (userId: string) => {
    if (!confirm("Remove admin access from this user?")) return;

    const { error } = await (supabase
      .from("profiles")
      .update({ is_admin: false })
      .eq("id", userId) as Promise<{ error: any }>);

    if (error) {
      alert("Failed to remove admin: " + error.message);
      return;
    }

    await loadAdmins();
    await loadAllUsers();
    alert("Admin access removed!");
  };

  const createNewUser = async () => {
    if (!newUserEmail || !newUserPassword) {
      alert("Email and password are required");
      return;
    }

    if (newUserPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    setCreatingUser(true);
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserEmail.trim().toLowerCase(),
        password: newUserPassword,
      });

      if (authError) {
        alert("Failed to create user: " + authError.message);
        setCreatingUser(false);
        return;
      }

      if (!authData.user) {
        alert("User creation failed - no user returned");
        setCreatingUser(false);
        return;
      }

      // Create profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: authData.user.id,
          email: newUserEmail.trim().toLowerCase(),
          full_name: newUserName.trim() || null,
          phone: newUserPhone.trim() || null,
          city: newUserCity.trim() || null,
          state: newUserState.trim() || null,
          firm_name: newUserFirmName.trim() || null,
          business_type: newUserBusinessType || null,
          balance_grams: 0,
          is_admin: false,
        } as any);

      if (profileError) {
        console.error("Profile creation error:", profileError);
        alert("User created but profile failed: " + profileError.message);
      } else {
        alert("User created successfully! They can now login with the email and password you provided.");
        // Reset form
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserName("");
        setNewUserPhone("");
        setNewUserCity("");
        setNewUserState("");
        setNewUserFirmName("");
        setNewUserBusinessType("");
        setShowCreateUser(false);
      }

      await loadAllUsers();
    } catch (e: any) {
      console.error("Create user error:", e);
      alert("Error creating user: " + (e.message || "Unknown error"));
    } finally {
      setCreatingUser(false);
    }
  };

  const filteredUsers = allUsers.filter((u) => {
    if (!searchEmail.trim()) return true;
    const search = searchEmail.toLowerCase();
    return (
      (u.email?.toLowerCase().includes(search) || false) ||
      (u.full_name?.toLowerCase().includes(search) || false)
    );
  });

  return (
    <div>
      {/* Create New User Section */}
      <div className="card" style={{ marginBottom: 16, background: "#f0f7ff", border: "2px solid #b3d9ff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, color: "var(--accent-dark)", fontWeight: 700 }}>➕ Create New User</h3>
          <button 
            className="btn" 
            onClick={() => setShowCreateUser(!showCreateUser)}
            style={{ background: showCreateUser ? "#ffebee" : "#e8f9ee", color: showCreateUser ? "#c62828" : "#2e7d32" }}
          >
            {showCreateUser ? "Cancel" : "Create User"}
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
          Create a new customer account directly from the admin panel. This is useful for non-tech-savvy customers who need help setting up their account.
        </p>
        
        {showCreateUser && (
          <div style={{ 
            padding: 20, 
            background: "#fff", 
            borderRadius: 8, 
            border: "1px solid var(--border-light)",
            marginTop: 12
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, fontWeight: 600 }}>
                  Email Address <span style={{ color: "#c62828" }}>*</span>
                </label>
                <input
                  className="input"
                  type="email"
                  placeholder="customer@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, fontWeight: 600 }}>
                  Password <span style={{ color: "#c62828" }}>*</span> (min 6 characters)
                </label>
                <input
                  className="input"
                  type="password"
                  placeholder="Enter password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, fontWeight: 600 }}>
                  Full Name
                </label>
                <input
                  className="input"
                  placeholder="Customer Name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, fontWeight: 600 }}>
                  Phone Number
                </label>
                <input
                  className="input"
                  placeholder="+91 1234567890"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, fontWeight: 600 }}>
                  City
                </label>
                <input
                  className="input"
                  placeholder="City"
                  value={newUserCity}
                  onChange={(e) => setNewUserCity(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, fontWeight: 600 }}>
                  State
                </label>
                <input
                  className="input"
                  placeholder="State"
                  value={newUserState}
                  onChange={(e) => setNewUserState(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, fontWeight: 600 }}>
                  Firm Name (Optional)
                </label>
                <input
                  className="input"
                  placeholder="Firm/Business Name"
                  value={newUserFirmName}
                  onChange={(e) => setNewUserFirmName(e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, fontWeight: 600 }}>
                  Business Type (Optional)
                </label>
                <select
                  className="input"
                  value={newUserBusinessType}
                  onChange={(e) => setNewUserBusinessType(e.target.value as any)}
                  style={{ width: "100%" }}
                >
                  <option value="">Select Business Type</option>
                  <option value="wholesale">Wholesale</option>
                  <option value="retail">Retail</option>
                  <option value="manufacturer">Manufacturer</option>
                </select>
              </div>
            </div>
            
            <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
              <button 
                className="btn primary" 
                onClick={createNewUser}
                disabled={creatingUser || !newUserEmail || !newUserPassword}
                style={{ opacity: (creatingUser || !newUserEmail || !newUserPassword) ? 0.6 : 1 }}
              >
                {creatingUser ? "Creating..." : "Create User Account"}
              </button>
              <button 
                className="btn" 
                onClick={() => {
                  setShowCreateUser(false);
                  setNewUserEmail("");
                  setNewUserPassword("");
                  setNewUserName("");
                  setNewUserPhone("");
                  setNewUserCity("");
                  setNewUserState("");
                  setNewUserFirmName("");
                  setNewUserBusinessType("");
                }}
              >
                Cancel
              </button>
            </div>
            
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 12, fontStyle: "italic" }}>
              ⚠️ Note: The user will be able to login immediately with the email and password you provide. Make sure to share these credentials securely with the customer.
            </p>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 16px 0", color: "var(--accent-dark)" }}>Add New Admin</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input
            className="input"
            type="email"
            placeholder="Enter user email address"
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.target.value)}
            style={{ flex: 1, minWidth: 250 }}
            onKeyPress={(e) => {
              if (e.key === "Enter") addAdminByEmail();
            }}
          />
          <button className="btn primary" onClick={addAdminByEmail}>
            Add Admin
          </button>
        </div>
        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, marginBottom: 0 }}>
          Note: User must have signed up first. Enter their registered email address.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <h3 style={{ margin: 0, color: "var(--accent-dark)" }}>Current Admins ({admins.length})</h3>
          <button 
            className="btn" 
            onClick={() => {
              const out: Array<Array<string | number | null>> = [
                ["User ID", "Email", "Full Name", "Phone", "City", "State", "Created At"],
              ];
              admins.forEach((admin: any) => {
                out.push([
                  admin.id,
                  admin.email ?? "",
                  admin.full_name ?? "",
                  admin.phone ?? "",
                  admin.city ?? "",
                  admin.state ?? "",
                  admin.created_at ? new Date(admin.created_at).toLocaleString() : "",
                ]);
              });
              downloadCsv(`admins-${new Date().toISOString().slice(0, 10)}.csv`, out);
            }}
            style={{ background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" }}
            aria-label="Export admins to CSV"
          >
            Export Admins CSV
          </button>
        </div>
        {loading ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--accent)" }}>Loading...</div>
        ) : (
          <div className="card" style={{ marginTop: 24, marginBottom: 24, padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-cream)", borderBottom: "2px solid var(--border-light)" }}>
                  <th style={{ padding: 14, textAlign: "left", fontWeight: 700 }}>Email</th>
                  <th style={{ padding: 14, textAlign: "left", fontWeight: 700 }}>Name</th>
                  <th style={{ padding: 14, textAlign: "left", fontWeight: 700 }}>Added</th>
                  <th style={{ padding: 14, textAlign: "left", fontWeight: 700 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: 12, fontWeight: 600 }}>{admin.email ?? "-"}</td>
                    <td style={{ padding: 12 }}>{admin.full_name ?? "-"}</td>
                    <td style={{ padding: 12, color: "var(--text-muted)", fontSize: 13 }}>
                      {admin.created_at ? new Date(admin.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td style={{ padding: 12 }}>
                      <button
                        className="btn"
                        onClick={() => removeAdmin(admin.id)}
                        style={{ background: "#ffebee", color: "#c62828", borderColor: "#c62828" }}
                      >
                        Remove Admin
                      </button>
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                      No admins found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <h3 style={{ margin: 0, color: "var(--accent-dark)" }}>All Users</h3>
          <button 
            className="btn" 
            onClick={() => {
              const out: Array<Array<string | number | null>> = [
                ["User ID", "Email", "Full Name", "Phone", "City", "State", "Firm Name", "Business Type", "Is Admin", "Created At"],
              ];
              allUsers.forEach((user: any) => {
                out.push([
                  user.id,
                  user.email ?? "",
                  user.full_name ?? "",
                  user.phone ?? "",
                  user.city ?? "",
                  user.state ?? "",
                  (user as any).firm_name ?? "",
                  (user as any).business_type ?? "",
                  user.is_admin ? "Yes" : "No",
                  user.created_at ? new Date(user.created_at).toLocaleString() : "",
                ]);
              });
              downloadCsv(`all-users-${new Date().toISOString().slice(0, 10)}.csv`, out);
            }}
            style={{ background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" }}
            aria-label="Export all users to CSV"
          >
            Export All Users CSV
          </button>
        </div>
        <input
          className="input"
          placeholder="Search by email or name..."
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          style={{ marginBottom: 12, width: "100%", maxWidth: 400 }}
        />
        <div className="card" style={{ marginTop: 24, marginBottom: 24, padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-cream)", borderBottom: "2px solid var(--border-light)" }}>
                <th style={{ padding: 14, textAlign: "left", fontWeight: 700 }}>Email</th>
                <th style={{ padding: 14, textAlign: "left", fontWeight: 700 }}>Name</th>
                <th style={{ padding: 14, textAlign: "center", fontWeight: 700 }}>Admin</th>
                <th style={{ padding: 14, textAlign: "left", fontWeight: 700 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                  <td style={{ padding: 12 }}>{user.email ?? "-"}</td>
                  <td style={{ padding: 12 }}>{user.full_name ?? "-"}</td>
                  <td style={{ padding: 12, textAlign: "center" }}>
                    {user.is_admin ? (
                      <span className="badge" style={{ background: "#e8f9ee", color: "#2e7d32" }}>
                        Admin
                      </span>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: 12 }}>
                    {!user.is_admin ? (
                      <button
                        className="btn primary"
                        onClick={async () => {
                          setNewAdminEmail(user.email || "");
                          await addAdminByEmail();
                        }}
                      >
                        Make Admin
                      </button>
                    ) : (
                      <button
                        className="btn"
                        onClick={() => removeAdmin(user.id)}
                        style={{ background: "#ffebee", color: "#c62828", borderColor: "#c62828" }}
                      >
                        Remove Admin
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
