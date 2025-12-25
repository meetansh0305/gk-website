import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Stats = {
  totalProducts: number;
  liveStock: number;
  soldItems: number;
  totalOrders: number;
  pendingOrders: number;
  totalCategories: number;
  availableGold: number;
  totalRevenue: number;
};

type RecentOrder = {
  order_id: number;
  created_at: string;
  full_name: string;
  status: string;
  item_count: number;
};

type TopProduct = {
  product_id: number;
  product_name: string;
  total_sold: number;
  total_weight: number;
  image_url?: string | null;
};

type TopCustomer = {
  user_id: string;
  full_name: string;
  email: string;
  total_orders: number;
  total_weight: number;
  total_spent_weight: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    liveStock: 0,
    soldItems: 0,
    totalOrders: 0,
    pendingOrders: 0,
    totalCategories: 0,
    availableGold: 0,
    totalRevenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date filters
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month" | "year" | "custom">("all");
  const [customDateFrom, setCustomDateFrom] = useState("");
  const [customDateTo, setCustomDateTo] = useState("");

  useEffect(() => {
    loadDashboard();
  }, [dateFilter, customDateFrom, customDateTo]);

  const getDateRange = () => {
    const now = new Date();
    let from: Date | null = null;
    let to: Date = now;

    switch (dateFilter) {
      case "today":
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        from = new Date(now);
        from.setDate(now.getDate() - 7);
        break;
      case "month":
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "year":
        from = new Date(now.getFullYear(), 0, 1);
        break;
      case "custom":
        if (customDateFrom) from = new Date(customDateFrom);
        if (customDateTo) to = new Date(customDateTo + "T23:59:59");
        break;
      default:
        return { from: null, to: null };
    }

    return { from, to };
  };

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const { from, to } = getDateRange();
      
      // Build date filter query
      let ordersQuery = supabase.from("orders").select("*", { count: "exact", head: true });
      let soldItemsQuery = supabase.from("product_items").select("*", { count: "exact", head: true }).eq("sold", true);
      
      if (from) {
        ordersQuery = ordersQuery.gte("created_at", from.toISOString());
        soldItemsQuery = soldItemsQuery.gte("sold_at", from.toISOString());
      }
      if (to) {
        ordersQuery = ordersQuery.lte("created_at", to.toISOString());
        soldItemsQuery = soldItemsQuery.lte("sold_at", to.toISOString());
      }

      const { count: totalProducts } = await supabase.from("products").select("*", { count: "exact", head: true });
      const { count: liveStock } = await supabase.from("products").select("*", { count: "exact", head: true }).eq("is_live_stock", true);
      const { count: soldItems } = await soldItemsQuery;
      const { count: totalOrders } = await ordersQuery;
      const { count: pendingOrders } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "in_progress");
      const { count: totalCategories } = await supabase.from("categories").select("*", { count: "exact", head: true });

      const { data: goldData } = await supabase.from("raw_gold_ledger").select("type, grams, created_at");
      let availableGold = 0;
      (goldData ?? []).forEach((entry: any) => {
        if (entry.type === "received") availableGold += Number(entry.grams) || 0;
        else if (entry.type === "used" || entry.type === "wastage") availableGold -= Number(entry.grams) || 0;
      });

      let soldDataQuery = supabase.from("product_items").select("weight, sold_at").eq("sold", true);
      if (from) soldDataQuery = soldDataQuery.gte("sold_at", from.toISOString());
      if (to) soldDataQuery = soldDataQuery.lte("sold_at", to.toISOString());
      
      const { data: soldData } = await soldDataQuery;
      let totalWeight = 0;
      (soldData ?? []).forEach((item: any) => { totalWeight += Number(item.weight) || 0; });
      
      // Additional metrics
      const { count: readyOrders } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "ready");
      const { count: deliveredOrders } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "delivered");
      const { count: cancelledOrders } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "cancelled");

      let recentOrdersQuery = supabase.from("v_orders_with_customer").select("*").order("created_at", { ascending: false }).limit(10);
      if (from) recentOrdersQuery = recentOrdersQuery.gte("created_at", from.toISOString());
      if (to) recentOrdersQuery = recentOrdersQuery.lte("created_at", to.toISOString());
      
      const { data: orders } = await recentOrdersQuery;
      const recentList: RecentOrder[] = (orders ?? []).map((o: any) => ({
        order_id: o.order_id,
        created_at: o.created_at,
        full_name: o.full_name || "Unknown",
        status: o.status || "pending",
        item_count: o.item_count || 0,
      }));

      setStats({
        totalProducts: totalProducts ?? 0,
        liveStock: liveStock ?? 0,
        soldItems: soldItems ?? 0,
        totalOrders: totalOrders ?? 0,
        pendingOrders: pendingOrders ?? 0,
        totalCategories: totalCategories ?? 0,
        availableGold,
        totalRevenue: totalWeight,
      });
      setRecentOrders(recentList);

      // Load Top Products (Most Sold Items)
      let topProductsSoldQuery = supabase
        .from("product_items")
        .select("product_id, weight, sold_at")
        .eq("sold", true);
      
      if (from) {
        topProductsSoldQuery = topProductsSoldQuery.gte("sold_at", from.toISOString());
      }
      if (to) {
        topProductsSoldQuery = topProductsSoldQuery.lte("sold_at", to.toISOString());
      }
      
      const { data: soldItemsData } = await topProductsSoldQuery;
      
      const productMap = new Map<number, { count: number; weight: number }>();
      (soldItemsData ?? []).forEach((item: any) => {
        const pid = item.product_id;
        if (!pid) return;
        const current = productMap.get(pid) || { count: 0, weight: 0 };
        productMap.set(pid, {
          count: current.count + 1,
          weight: current.weight + (Number(item.weight) || 0),
        });
      });

      // Get all unique product IDs
      const productIds = Array.from(productMap.keys());
      
      // Fetch all products in one query
      const { data: products } = await supabase
        .from("products")
        .select("id, name, image_url")
        .in("id", productIds);
      
      const productsMap = new Map<number, any>();
      (products ?? []).forEach((p: any) => productsMap.set(p.id, p));

      const topProductsList: TopProduct[] = [];
      for (const [pid, stats] of productMap.entries()) {
        const product = productsMap.get(pid);
        if (product) {
          topProductsList.push({
            product_id: pid,
            product_name: product.name || `Product #${pid}`,
            total_sold: stats.count,
            total_weight: stats.weight,
            image_url: product.image_url,
          });
        }
      }
      
      topProductsList.sort((a, b) => b.total_sold - a.total_sold);
      setTopProducts(topProductsList.slice(0, 10));

      // Load Top Customers (Most Bought Customers)
      let customerOrdersQuery = supabase
        .from("v_orders_with_customer")
        .select("user_id, full_name, email, item_count, total_weight, created_at");
      
      if (from) {
        customerOrdersQuery = customerOrdersQuery.gte("created_at", from.toISOString());
      }
      if (to) {
        customerOrdersQuery = customerOrdersQuery.lte("created_at", to.toISOString());
      }
      
      const { data: customerOrders } = await customerOrdersQuery;

      const customerMap = new Map<string, { name: string; email: string; orders: number; weight: number }>();
      (customerOrders ?? []).forEach((order: any) => {
        const uid = order.user_id;
        if (!uid) return;
        const current = customerMap.get(uid) || { name: order.full_name || "Unknown", email: order.email || "", orders: 0, weight: 0 };
        customerMap.set(uid, {
          name: current.name,
          email: current.email,
          orders: current.orders + 1,
          weight: current.weight + (Number(order.total_weight) || 0),
        });
      });

      // Get sold weight for all customers in one batch
      const customerIds = Array.from(customerMap.keys());
      let soldItemsQuery2 = supabase
        .from("product_items")
        .select("sold_to_user, weight, sold_at")
        .eq("sold", true)
        .in("sold_to_user", customerIds);
      
      if (from) {
        soldItemsQuery2 = soldItemsQuery2.gte("sold_at", from.toISOString());
      }
      if (to) {
        soldItemsQuery2 = soldItemsQuery2.lte("sold_at", to.toISOString());
      }
      
      const { data: soldToCustomers } = await soldItemsQuery2;
      
      const soldWeightMap = new Map<string, number>();
      (soldToCustomers ?? []).forEach((item: any) => {
        const uid = item.sold_to_user;
        if (!uid) return;
        soldWeightMap.set(uid, (soldWeightMap.get(uid) || 0) + (Number(item.weight) || 0));
      });

      const topCustomersList: TopCustomer[] = [];
      for (const [uid, stats] of customerMap.entries()) {
        topCustomersList.push({
          user_id: uid,
          full_name: stats.name,
          email: stats.email,
          total_orders: stats.orders,
          total_weight: stats.weight,
          total_spent_weight: soldWeightMap.get(uid) || 0,
        });
      }

      topCustomersList.sort((a, b) => b.total_orders - a.total_orders);
      setTopCustomers(topCustomersList.slice(0, 10));
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleDateString(); } catch { return iso; }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "in_progress": return { background: "rgba(176, 141, 87, 0.15)", color: "var(--accent-dark)" };
      case "ready": return { background: "#fff8e1", color: "#f57f17" };
      case "delivered": return { background: "#e8f9ee", color: "#2e7d32" };
      default: return { background: "var(--bg-cream)", color: "var(--text-muted)" };
    }
  };

  const exportSalesReport = () => {
    const { from, to } = getDateRange();
    const dateRange = from && to 
      ? `${new Date(from).toLocaleDateString()} - ${new Date(to).toLocaleDateString()}`
      : "All Time";
    
    const csvRows: string[] = [];
    
    // Header
    csvRows.push("Sales Report");
    csvRows.push(`Date Range: ${dateRange}`);
    csvRows.push(`Generated: ${new Date().toLocaleString()}`);
    csvRows.push("");
    
    // Summary Stats
    csvRows.push("SUMMARY STATISTICS");
    csvRows.push(`Total Products,${stats.totalProducts}`);
    csvRows.push(`Live Stock,${stats.liveStock}`);
    csvRows.push(`Sold Items,${stats.soldItems}`);
    csvRows.push(`Total Orders,${stats.totalOrders}`);
    csvRows.push(`Pending Orders,${stats.pendingOrders}`);
    csvRows.push(`Available Gold (g),${stats.availableGold.toFixed(3)}`);
    csvRows.push(`Total Sold Weight (g),${stats.totalRevenue.toFixed(3)}`);
    csvRows.push("");
    
    // Top Products
    csvRows.push("TOP PRODUCTS");
    csvRows.push("Rank,Product ID,Product Name,Times Sold,Total Weight (g)");
    topProducts.forEach((p, i) => {
      csvRows.push(`${i + 1},${p.product_id},"${p.product_name}",${p.total_sold},${p.total_weight.toFixed(3)}`);
    });
    csvRows.push("");
    
    // Top Customers
    csvRows.push("TOP CUSTOMERS");
    csvRows.push("Rank,Customer Name,Email,Total Orders,Order Weight (g),Sold Weight (g)");
    topCustomers.forEach((c, i) => {
      csvRows.push(`${i + 1},"${c.full_name}","${c.email}",${c.total_orders},${c.total_weight.toFixed(3)},${c.total_spent_weight.toFixed(3)}`);
    });
    csvRows.push("");
    
    // Recent Orders
    csvRows.push("RECENT ORDERS");
    csvRows.push("Order ID,Date,Customer,Items,Status");
    recentOrders.forEach(o => {
      csvRows.push(`${o.order_id},"${formatDate(o.created_at)}","${o.full_name}",${o.item_count},${o.status}`);
    });
    
    // Download CSV
    const csv = csvRows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.setAttribute("download", `sales-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const statCards = [
    { label: "Total Products", value: stats.totalProducts, icon: "📦" },
    { label: "Live Stock", value: stats.liveStock, icon: "🔴" },
    { label: "Sold Items", value: stats.soldItems, icon: "✅" },
    { label: "Total Orders", value: stats.totalOrders, icon: "📋" },
    { label: "Pending Orders", value: stats.pendingOrders, icon: "⏳" },
    { label: "Categories", value: stats.totalCategories, icon: "📁" },
    { label: "Available Gold", value: `${stats.availableGold.toFixed(2)} g`, icon: "🥇" },
    { label: "Total Sold Weight", value: `${stats.totalRevenue.toFixed(2)} g`, icon: "⚖️" },
  ];

  if (loading) {
    return <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--accent)" }}>Loading dashboard...</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <h3 style={{ margin: 0, color: "var(--accent-dark)", fontWeight: 700 }}>Dashboard Overview</h3>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button 
            className="btn primary" 
            onClick={exportSalesReport}
            style={{ background: "#2e7d32", borderColor: "#2e7d32" }}
            aria-label="Export sales report"
          >
            📊 Export Report
          </button>
          <select
            className="input"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value as any);
              if (e.target.value !== "custom") {
                setCustomDateFrom("");
                setCustomDateTo("");
              }
            }}
            style={{ minWidth: 150 }}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="custom">Custom Range</option>
          </select>
          
          {dateFilter === "custom" && (
            <>
              <input
                className="input"
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                placeholder="From"
              />
              <input
                className="input"
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                placeholder="To"
              />
            </>
          )}
          
          <button className="btn primary" onClick={loadDashboard}>Refresh</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        {statCards.map((card, i) => (
          <div key={i} className="card" style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent-dark)" }}>{card.value}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{card.label}</div>
            {dateFilter !== "all" && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, fontStyle: "italic" }}>
                {dateFilter === "custom" && customDateFrom && customDateTo
                  ? `${new Date(customDateFrom).toLocaleDateString()} - ${new Date(customDateTo).toLocaleDateString()}`
                  : dateFilter.charAt(0).toUpperCase() + dateFilter.slice(1)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Top Products Section */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h4 style={{ margin: 0, color: "var(--accent-dark)", fontWeight: 700 }}>🏆 Most Sold Items</h4>
          <button className="btn" onClick={loadDashboard}>Refresh</button>
        </div>

        {topProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No sold items found.</div>
        ) : (
          <div className="card" style={{ marginTop: 24, marginBottom: 24, padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-cream)", borderBottom: "2px solid var(--border-light)" }}>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>Rank</th>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>Image</th>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>Product</th>
                  <th style={{ padding: 12, textAlign: "right", fontWeight: 700 }}>Times Sold</th>
                  <th style={{ padding: 12, textAlign: "right", fontWeight: 700 }}>Total Weight (g)</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, index) => (
                  <tr key={product.product_id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: 12, fontWeight: 700, color: "var(--accent-dark)" }}>
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                    </td>
                    <td style={{ padding: 12 }}>
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt="" 
                          style={{ width: 50, height: 50, objectFit: "cover", borderRadius: 6, border: "1px solid var(--border-light)" }} 
                        />
                      ) : (
                        <div style={{ width: 50, height: 50, background: "var(--bg-cream)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 12 }}>—</div>
                      )}
                    </td>
                    <td style={{ padding: 12, fontWeight: 600 }}>{product.product_name}</td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 700, color: "var(--accent)" }}>{product.total_sold}</td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 600 }}>{product.total_weight.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Customers Section */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h4 style={{ margin: 0, color: "var(--accent-dark)", fontWeight: 700 }}>👥 Top Customers</h4>
          <button className="btn" onClick={loadDashboard}>Refresh</button>
        </div>

        {topCustomers.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No customer data found.</div>
        ) : (
          <div className="card" style={{ marginTop: 24, marginBottom: 24, padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-cream)", borderBottom: "2px solid var(--border-light)" }}>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>Rank</th>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>Customer</th>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>Email</th>
                  <th style={{ padding: 12, textAlign: "right", fontWeight: 700 }}>Total Orders</th>
                  <th style={{ padding: 12, textAlign: "right", fontWeight: 700 }}>Order Weight (g)</th>
                  <th style={{ padding: 12, textAlign: "right", fontWeight: 700 }}>Sold Weight (g)</th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.map((customer, index) => (
                  <tr key={customer.user_id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: 12, fontWeight: 700, color: "var(--accent-dark)" }}>
                      {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                    </td>
                    <td style={{ padding: 12, fontWeight: 600 }}>{customer.full_name || "Unknown"}</td>
                    <td style={{ padding: 12, color: "var(--text-muted)", fontSize: 13 }}>{customer.email || "-"}</td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 700, color: "var(--accent)" }}>{customer.total_orders}</td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 600 }}>{customer.total_weight.toFixed(3)}</td>
                    <td style={{ padding: 12, textAlign: "right", fontWeight: 600, color: "#2e7d32" }}>{customer.total_spent_weight.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Orders Section */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h4 style={{ margin: 0, color: "var(--accent-dark)", fontWeight: 700 }}>📋 Recent Orders</h4>
          <button className="btn" onClick={loadDashboard}>Refresh</button>
        </div>

        {recentOrders.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No recent orders found.</div>
        ) : (
          <div className="card" style={{ marginTop: 24, marginBottom: 24, padding: 0, overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-cream)", borderBottom: "2px solid var(--border-light)" }}>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>Order ID</th>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>Date</th>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>Customer</th>
                  <th style={{ padding: 12, textAlign: "center", fontWeight: 700 }}>Items</th>
                  <th style={{ padding: 12, textAlign: "left", fontWeight: 700 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.order_id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                    <td style={{ padding: 12, fontWeight: 700, color: "var(--accent-dark)" }}>#{order.order_id}</td>
                    <td style={{ padding: 12, color: "var(--text-muted)" }}>{formatDate(order.created_at)}</td>
                    <td style={{ padding: 12, fontWeight: 600 }}>{order.full_name}</td>
                    <td style={{ padding: 12, textAlign: "center" }}>{order.item_count}</td>
                    <td style={{ padding: 12 }}>
                      <span className="badge" style={{ ...getStatusStyle(order.status), padding: "6px 12px", borderRadius: 20, fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
