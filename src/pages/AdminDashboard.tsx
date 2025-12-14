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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);

    try {
      const { count: totalProducts } = await supabase.from("products").select("*", { count: "exact", head: true });
      const { count: liveStock } = await supabase.from("products").select("*", { count: "exact", head: true }).eq("is_live_stock", true);
      const { count: soldItems } = await supabase.from("product_items").select("*", { count: "exact", head: true }).eq("sold", true);
      const { count: totalOrders } = await supabase.from("orders").select("*", { count: "exact", head: true });
      const { count: pendingOrders } = await supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "in_progress");
      const { count: totalCategories } = await supabase.from("categories").select("*", { count: "exact", head: true });

      const { data: goldData } = await supabase.from("raw_gold_ledger").select("type, grams");
      let availableGold = 0;
      (goldData ?? []).forEach((entry: any) => {
        if (entry.type === "received") availableGold += Number(entry.grams) || 0;
        else if (entry.type === "used" || entry.type === "wastage") availableGold -= Number(entry.grams) || 0;
      });

      const { data: soldData } = await supabase.from("product_items").select("weight").eq("sold", true);
      let totalWeight = 0;
      (soldData ?? []).forEach((item: any) => { totalWeight += Number(item.weight) || 0; });

      const { data: orders } = await supabase.from("v_orders_with_customer").select("*").order("created_at", { ascending: false }).limit(5);
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
      <h3 style={{ margin: "0 0 20px 0", color: "var(--accent-dark)", fontWeight: 700 }}>Dashboard Overview</h3>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        {statCards.map((card, i) => (
          <div key={i} className="card" style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{card.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent-dark)" }}>{card.value}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h4 style={{ margin: 0, color: "var(--primary-dark)" }}>Recent Orders</h4>
          <button className="btn" onClick={loadDashboard}>Refresh</button>
        </div>

        {recentOrders.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)" }}>No recent orders found.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
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
