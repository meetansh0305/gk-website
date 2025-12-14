import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import StockManagement from "./StockManagement";
import RawGold from "./RawGold";
import ProductsAdmin from "./ProductsAdmin";
import { SoldItems } from "./SoldItems";
import AdminDashboard from "./AdminDashboard";
import AdminReorder from "./AdminReorder";

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
  const [tab, setTab] = useState<"dashboard" | "orders" | "customers" | "products" | "reorder" | "stock" | "raw_gold" | "sold">("dashboard");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const email = data?.user?.email?.toLowerCase() || "";
      setOk(email === ADMIN_EMAIL.toLowerCase());
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
    const { error } = await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    if (error) {
      console.error("updateStatus error:", error);
      alert("Could not update status (RLS or server error).");
      return;
    }
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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "in_progress":
        return { background: "rgba(176, 141, 87, 0.15)", color: "var(--accent-dark)" };
      case "ready":
        return { background: "#fff8e1", color: "#f57f17" };
      case "delivered":
        return { background: "#e8f9ee", color: "#2e7d32" };
      default:
        return { background: "var(--bg-cream)", color: "var(--text-muted)" };
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <select className="input" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Status: All</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select className="input" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
            <option value="">Category: All</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select className="input" value={filterSubcategory} onChange={(e) => setFilterSubcategory(e.target.value)} disabled={!filterCategory}>
            <option value="">Subcategory: All</option>
            {subcategories.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select className="input" value={filterCustomer} onChange={(e) => setFilterCustomer(e.target.value)}>
            <option value="">Customer: All</option>
            {customers.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select className="input" value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
            <option value="">City: All</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select className="input" value={filterState} onChange={(e) => setFilterState(e.target.value)}>
            <option value="">State: All</option>
            {states.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input className="input" placeholder="Search product/customer/email..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
          <input className="input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input className="input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <button className="btn primary" onClick={loadAll}>Refresh</button>
          <button className="btn" onClick={clearFilters}>Clear</button>
          <button className="btn" onClick={exportCsv} style={{ background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" }}>Export CSV</button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--bg-cream)", borderBottom: "2px solid var(--border-light)" }}>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-dark)" }}>Image</th>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-dark)" }}>Order</th>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-dark)" }}>Date</th>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-dark)" }}>Customer</th>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-dark)" }}>Location</th>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-dark)" }}>Balance (g)</th>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-dark)" }}>Category</th>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-dark)" }}>Product</th>
              <th style={{ padding: 14, textAlign: "center", fontWeight: 700, color: "var(--text-dark)" }}>Qty</th>
              <th style={{ padding: 14, textAlign: "left", fontWeight: 700, color: "var(--text-dark)" }}>Status</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((r) => (
              <tr key={`${r.order_item_id ?? r.order_id}-${r.product_id ?? "p"}`} style={{ borderBottom: "1px solid var(--border-light)" }}>
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

                <td style={{ padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="badge" style={{ ...getStatusStyle(r.status ?? ""), padding: "6px 12px", borderRadius: 20, fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>
                      {r.status ?? "-"}
                    </span>
                    <select
                      className="input"
                      value={r.status ?? ""}
                      onChange={(e) => updateStatus(r.order_id, e.target.value)}
                      style={{ width: 130, fontSize: 12 }}
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
                <td colSpan={10} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
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
          <input className="input" placeholder="Search customers..." value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
          <button className="btn primary" onClick={load}>Refresh</button>
          <button className="btn" onClick={exportCsv} style={{ background: "var(--accent)", borderColor: "var(--accent)", color: "#fff" }}>Export CSV</button>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
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
