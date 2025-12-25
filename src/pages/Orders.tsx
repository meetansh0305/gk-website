import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { handleSupabaseError, showError, showSuccess } from "../utils/errorHandler";

type Order = {
  id: number;
  status: string;
  created_at: string;
  total_weight: number | null;
  items: Array<{
    id: number;
    quantity: number;
    weight_at_purchase: number | null;
    product: { id: number; name: string; image_url: string | null; weight: number | null };
  }>;
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<"inprogress"|"ready"|"past"|"cancelled">("inprogress");
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        setLoading(false);
        return;
      }

      // join order_items -> products
      const { data, error } = await supabase
        .from("orders")
        .select(`
          id, status, created_at, total_weight,
          order_items (
            id, quantity, weight_at_purchase,
            product:products ( id, name, image_url, weight )
          )
        `)
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Load orders error:", error);
        showError(handleSupabaseError(error), "Failed to Load Orders");
        setLoading(false);
        return;
      }

      const mapped = (data as any[]).map(row => ({
        id: row.id,
        status: row.status,
        created_at: row.created_at,
        total_weight: row.total_weight,
        items: (row.order_items || []).map((it: any) => ({
          id: it.id,
          quantity: it.quantity,
          weight_at_purchase: it.weight_at_purchase,
          product: it.product
        }))
      }));
      setOrders(mapped);
    } catch (e: any) {
      console.error("Unexpected error loading orders:", e);
      showError(handleSupabaseError(e), "Error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const cancelOrder = async (orderId: number) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;

    setCancelling(orderId);
    try {
      const { error } = await (supabase
        .from("orders")
        .update({ status: "cancelled" } as any)
        .eq("id", orderId) as unknown as Promise<{ error: any }>);

      if (error) {
        showError(handleSupabaseError(error), "Cancel Failed");
        return;
      }

      // Reload orders
      await load();
      showSuccess("Order cancelled successfully.", "Order Cancelled");
    } catch (e: any) {
      console.error("Cancel order error:", e);
      showError(handleSupabaseError(e), "Error");
    } finally {
      setCancelling(null);
    }
  };

  const list = tab === "inprogress"
    ? orders.filter(o => o.status === "in_progress")
    : tab === "ready"
      ? orders.filter(o => o.status === "ready")
      : tab === "cancelled"
        ? orders.filter(o => o.status === "cancelled")
        : orders.filter(o => o.status === "delivered");

  return (
    <div className="container">
      <h2 className="section-title">My Orders</h2>

      <div className="tabs" style={{ marginBottom: 12 }}>
        <button className={`tab ${tab==='inprogress'?'active':''}`} onClick={()=>setTab('inprogress')}>In Progress</button>
        <button className={`tab ${tab==='ready'?'active':''}`} onClick={()=>setTab('ready')}>Ready</button>
        <button className={`tab ${tab==='past'?'active':''}`} onClick={()=>setTab('past')}>Past Orders</button>
        <button className={`tab ${tab==='cancelled'?'active':''}`} onClick={()=>setTab('cancelled')}>Cancelled</button>
        <button className="btn" style={{ marginLeft: "auto" }} onClick={load}>Refresh</button>
      </div>

      {list.map(o => {
        const orderTotalWeight = o.total_weight ?? o.items.reduce((sum, it) => {
          const itemWeight = (it.weight_at_purchase ?? it.product?.weight ?? 0) * it.quantity;
          return sum + itemWeight;
        }, 0);
        
        return (
        <div key={o.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 700 }}>Order #{o.id}</div>
              <div style={{ fontSize: 12, opacity: .7 }}>{new Date(o.created_at).toLocaleString()}</div>
              <div style={{ fontSize: 12, color: "var(--accent)", marginTop: 4, fontWeight: 600 }}>
                Total Weight: {orderTotalWeight.toFixed(3)} g
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div className="badge" style={{
                ...(o.status === "cancelled" ? { background: "#ffebee", color: "#c62828" } : {}),
                ...(o.status === "delivered" ? { background: "#e8f9ee", color: "#2e7d32" } : {}),
                ...(o.status === "ready" ? { background: "#fff8e1", color: "#f57f17" } : {}),
                ...(o.status === "in_progress" ? { background: "rgba(176, 141, 87, 0.15)", color: "var(--accent-dark)" } : {})
              }}>
                {o.status}
              </div>
              {(o.status === "in_progress" || o.status === "ready") && (
                <button
                  className="btn"
                  onClick={() => cancelOrder(o.id)}
                  disabled={cancelling === o.id}
                  style={{
                    background: "#ffebee",
                    color: "#c62828",
                    borderColor: "#c62828",
                    fontSize: 12,
                    padding: "6px 12px"
                  }}
                >
                  {cancelling === o.id ? "Cancelling..." : "Cancel Order"}
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
            {o.items.map(it => (
              <div key={it.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: 8, border: "1px solid #eee", borderRadius: 8 }}>
                <img
                  src={it.product?.image_url ?? ""}
                  alt={it.product?.name ?? ""}
                  style={{ width: 64, height: 64, borderRadius: 6, objectFit: "cover" }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>{it.product?.name || `Product #${it.product?.id}`}</div>
                  <div style={{ fontSize: 12, opacity: .7 }}>
                    Qty: {it.quantity} • {(it.weight_at_purchase ?? it.product?.weight) ? `${((it.weight_at_purchase ?? it.product?.weight ?? 0) * it.quantity).toFixed(3)} g` : "—"}
                  </div>
                  {it.product?.image_url && (
                    <div style={{ fontSize: 11, opacity: .6, marginTop: 2 }}>
                      {it.weight_at_purchase ? `${it.weight_at_purchase.toFixed(3)} g each` : it.product.weight ? `${it.product.weight.toFixed(3)} g each` : ""}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {o.items.length === 0 && <div style={{ opacity: .7 }}>No items.</div>}
          </div>
        </div>
        );
      })}

      {loading && <div className="card" style={{ textAlign: "center", padding: 24, color: "var(--accent)" }}>Loading orders...</div>}
      {!loading && list.length === 0 && <p>No orders.</p>}
    </div>
  );
}
