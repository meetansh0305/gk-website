import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Order = {
  id: number;
  status: string;
  created_at: string;
  items: Array<{
    id: number;
    quantity: number;
    product: { id: number; name: string; image_url: string | null; weight: number | null };
  }>;
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<"inprogress"|"ready"|"past">("inprogress");

  const load = async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return;

    // join order_items -> products
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id, status, created_at,
        order_items (
          id, quantity,
          product:products ( id, name, image_url, weight )
        )
      `)
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });

    if (!error) {
      const mapped = (data as any[]).map(row => ({
        id: row.id,
        status: row.status,
        created_at: row.created_at,
        items: (row.order_items || []).map((it: any) => ({
          id: it.id,
          quantity: it.quantity,
          product: it.product
        }))
      }));
      setOrders(mapped);
    }
  };

  useEffect(() => { load(); }, []);

  const list = tab === "inprogress"
    ? orders.filter(o => o.status === "in_progress")
    : tab === "ready"
      ? orders.filter(o => o.status === "ready")
      : orders.filter(o => o.status === "delivered");

  return (
    <div className="container">
      <h2 className="section-title">My Orders</h2>

      <div className="tabs" style={{ marginBottom: 12 }}>
        <button className={`tab ${tab==='inprogress'?'active':''}`} onClick={()=>setTab('inprogress')}>In Progress</button>
        <button className={`tab ${tab==='ready'?'active':''}`} onClick={()=>setTab('ready')}>Ready</button>
        <button className={`tab ${tab==='past'?'active':''}`} onClick={()=>setTab('past')}>Past Orders</button>
        <button className="btn" style={{ marginLeft: "auto" }} onClick={load}>Refresh</button>
      </div>

      {list.map(o => (
        <div key={o.id} className="card">
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700 }}>Order #{o.id}</div>
              <div style={{ fontSize: 12, opacity: .7 }}>{new Date(o.created_at).toLocaleString()}</div>
            </div>
            <div className="badge">{o.status}</div>
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
                  <div style={{ fontWeight: 600 }}>{it.product?.name}</div>
                  <div style={{ fontSize: 12, opacity: .7 }}>
                    Qty: {it.quantity} • {it.product?.weight ? `${it.product.weight.toFixed(2)} g` : "—"}
                  </div>
                </div>
              </div>
            ))}
            {o.items.length === 0 && <div style={{ opacity: .7 }}>No items.</div>}
          </div>
        </div>
      ))}

      {list.length === 0 && <p>No orders.</p>}
    </div>
  );
}
