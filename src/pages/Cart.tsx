import React, { useEffect, useState } from "react";
import { useCart } from "../state/CartContext";
import { supabase } from "../lib/supabaseClient";

export default function CartPage() {
  const { lines, setQty, remove, clear, totalItems } = useCart();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("Cart lines changed", lines);
  }, [lines]);

  const placeOrder = async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        alert("Please login or signup to place an order.");
        setLoading(false);
        return;
      }

      // Fetch profile
      const { data: profile, error: profErr } = await supabase
        .from("profiles")
        .select("full_name, state, city, phone")
        .eq("id", user.id)
        .single();

      if (profErr) {
        console.error("Profile fetch error", profErr);
        alert("Error fetching profile. Check console.");
        setLoading(false);
        return;
      }

      const missing =
        !profile?.full_name || !profile?.state || !profile?.city || !profile?.phone;

      if (missing) {
        // show a simple prompt asking to complete profile
        const goToProfile = confirm(
          "Please complete your profile (name, state, city, phone) before placing an order. Do you want to go to Profile now?"
        );
        if (goToProfile) window.location.href = "/profile";
        setLoading(false);
        return;
      }

      // Create order
      const { data: newOrder, error: orderErr } = await supabase
        .from("orders")
        .insert({ user_id: user.id, status: "in_progress" })
        .select()
        .single();

      if (orderErr || !newOrder) {
        console.error("Order creation error", orderErr);
        alert("❌ Order failed (order creation). Check console for details.");
        setLoading(false);
        return;
      }

      // Insert order_items
      const itemsPayload = lines.map((l) => ({
        order_id: newOrder.id,
        product_id: l.product.id,
        quantity: l.quantity,
        weight_at_purchase: l.product.weight ?? null,
        price_at_purchase: null,
      }));

      const { error: itemsErr } = await supabase.from("order_items").insert(itemsPayload);
      if (itemsErr) {
        console.error("Order items insert error", itemsErr);
        alert("❌ Order failed (items). Check console for details.");
        setLoading(false);
        return;
      }

      clear();
      alert("✅ Order placed successfully!");
    } catch (e) {
      console.error("Place order unexpected error", e);
      alert("Unexpected error during order. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ padding: 12 }}>
      <h2>Your Cart ({totalItems} items)</h2>
      {lines.length === 0 && <p>Your cart is empty</p>}

      <div style={{ display: "grid", gap: 10 }}>
        {lines.map((l) => (
          <div key={l.product.id} className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <img src={l.product.image_url ?? ""} alt="" style={{ width: 96, height: 96, objectFit: "cover", borderRadius: 8 }} onError={(e)=>{(e.target as HTMLImageElement).src="https://images.unsplash.com/photo-1606313564200-e75d5e30476e?q=80&w=1200&auto=format&fit=crop"}} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{/* name intentionally hidden per request */}</div>
              <div style={{ color: "#555", marginBottom: 6 }}>Weight: {(l.product.weight ?? 0).toFixed(2)} g</div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button className="btn" onClick={() => setQty(l.product.id, Math.max(1, l.quantity - 1))}>−</button>
                <input type="number" value={l.quantity} onChange={(e)=>setQty(l.product.id, Math.max(1, Number(e.target.value)||1))} style={{ width: 64, textAlign: "center" }} />
                <button className="btn" onClick={() => setQty(l.product.id, l.quantity + 1)}>+</button>
                <button className="btn" onClick={() => remove(l.product.id)}>Remove</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {lines.length > 0 && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button className="btn primary" onClick={placeOrder} disabled={loading}>
            {loading ? "Placing order..." : "Place Order"}
          </button>
        </div>
      )}
    </div>
  );
}
