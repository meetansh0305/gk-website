import React, { useEffect, useState } from "react";
import { useCart } from "../state/CartContext";
import { supabase } from "../lib/supabaseClient";

export default function CartPage() {
  const { lines, setQty, remove, clear, totalItems } = useCart();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    console.log("Cart lines changed", lines);
  }, [lines]);

  const totalWeight = lines.reduce((sum, l) => sum + (l.product.weight ?? 0) * l.quantity, 0);

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
        const goToProfile = confirm(
          "Please complete your profile (name, state, city, phone) before placing an order. Do you want to go to Profile now?"
        );
        if (goToProfile) window.location.href = "/profile";
        setLoading(false);
        return;
      }

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
    <div style={{ 
      padding: "80px 5% 100px 5%", 
      maxWidth: 1400,
      margin: "0 auto",
      background: "#fafafa",
      minHeight: "80vh"
    }}>
      {/* Header */}
      <div style={{ 
        marginBottom: 60,
        borderBottom: "1px solid #e8e8e8",
        paddingBottom: 40
      }}>
        <h1 style={{ 
          fontSize: 42, 
          fontWeight: 300,
          marginBottom: 12,
          color: "#1a1a1a",
          letterSpacing: "-1px"
        }}>
          Shopping Cart
        </h1>
        <p style={{ 
          fontSize: 14, 
          color: "#666",
          fontWeight: 300,
          letterSpacing: "0.5px"
        }}>
          {totalItems} {totalItems === 1 ? "item" : "items"} · Total weight: {totalWeight.toFixed(3)} grams
        </p>
      </div>

      {lines.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "100px 20px",
          background: "#fff",
          border: "1px solid #e8e8e8"
        }}>
          <div style={{ 
            fontSize: 15,
            marginBottom: 12,
            color: "#1a1a1a",
            fontWeight: 300,
            letterSpacing: "0.5px"
          }}>
            Your shopping cart is empty
          </div>
          <p style={{ color: "#999", marginBottom: 36, fontSize: 14 }}>
            Discover our exquisite collections
          </p>
          <button 
            onClick={() => window.location.href = "/"}
            style={{
              padding: "14px 40px",
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 0,
              border: "1px solid #1a1a1a",
              background: "#1a1a1a",
              color: "#fff",
              cursor: "pointer",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.color = "#1a1a1a";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#1a1a1a";
              e.currentTarget.style.color = "#fff";
            }}
          >
            Continue Shopping
          </button>
        </div>
      )}

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "1fr 400px",
        gap: 40,
        alignItems: "start"
      }}>
        {/* Cart Items */}
        <div style={{ display: "grid", gap: 1 }}>
          {lines.map((l) => (
            <div 
              key={l.product.id} 
              style={{ 
                display: "grid",
                gridTemplateColumns: "180px 1fr auto",
                gap: 32,
                alignItems: "center",
                padding: 32,
                background: "#fff",
                border: "1px solid #e8e8e8"
              }}
            >
              {/* Image */}
              <div style={{
                width: 180,
                height: 180,
                overflow: "hidden",
                background: "#fafafa"
              }}>
                <img 
                  src={l.product.image_url ?? ""} 
                  alt="" 
                  style={{ 
                    width: "100%",
                    height: "100%",
                    objectFit: "cover"
                  }} 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1606313564200-e75d5e30476e?q=80&w=1200&auto=format&fit=crop";
                  }}
                />
              </div>

              {/* Details */}
              <div>
                <div style={{ 
                  fontWeight: 300,
                  fontSize: 18,
                  marginBottom: 12,
                  color: "#1a1a1a",
                  letterSpacing: "0.3px"
                }}>
                  Product #{l.product.id}
                </div>
                
                <div style={{ 
                  color: "#666",
                  marginBottom: 24,
                  fontSize: 14,
                  fontWeight: 300,
                  letterSpacing: "0.3px"
                }}>
                  Weight: {(l.product.weight ?? 0).toFixed(3)} grams
                </div>

                {/* Quantity controls */}
                <div style={{ display: "flex", gap: 0, alignItems: "center" }}>
                  <button 
                    onClick={() => setQty(l.product.id, Math.max(1, l.quantity - 1))}
                    style={{
                      width: 40,
                      height: 40,
                      padding: 0,
                      border: "1px solid #e8e8e8",
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: 16,
                      color: "#666",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                  >
                    −
                  </button>
                  
                  <input 
                    type="number" 
                    value={l.quantity} 
                    onChange={(e) => setQty(l.product.id, Math.max(1, Number(e.target.value) || 1))} 
                    style={{ 
                      width: 60,
                      height: 40,
                      textAlign: "center",
                      border: "1px solid #e8e8e8",
                      borderLeft: "none",
                      borderRight: "none",
                      fontSize: 14,
                      fontWeight: 400
                    }}
                  />
                  
                  <button 
                    onClick={() => setQty(l.product.id, l.quantity + 1)}
                    style={{
                      width: 40,
                      height: 40,
                      padding: 0,
                      border: "1px solid #e8e8e8",
                      background: "#fff",
                      cursor: "pointer",
                      fontSize: 16,
                      color: "#666",
                      transition: "all 0.2s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "#fafafa"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "#fff"}
                  >
                    +
                  </button>

                  <div style={{
                    fontSize: 12,
                    color: "#999",
                    marginLeft: 20,
                    fontWeight: 300
                  }}>
                    Subtotal: {((l.product.weight ?? 0) * l.quantity).toFixed(3)}g
                  </div>
                </div>
              </div>

              {/* Remove button */}
              <button 
                onClick={() => remove(l.product.id)}
                style={{
                  width: 40,
                  height: 40,
                  border: "1px solid #e8e8e8",
                  background: "#fff",
                  color: "#999",
                  cursor: "pointer",
                  fontSize: 18,
                  transition: "all 0.2s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#c62828";
                  e.currentTarget.style.color = "#c62828";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e8e8e8";
                  e.currentTarget.style.color = "#999";
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        {lines.length > 0 && (
          <div style={{
            position: "sticky",
            top: 100,
            background: "#fff",
            border: "1px solid #e8e8e8",
            padding: 40
          }}>
            <h3 style={{ 
              fontSize: 18,
              fontWeight: 300,
              marginBottom: 32,
              letterSpacing: "0.5px",
              color: "#1a1a1a"
            }}>
              Order Summary
            </h3>

            <div style={{
              borderTop: "1px solid #e8e8e8",
              paddingTop: 24,
              marginBottom: 32
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 16,
                fontSize: 14,
                color: "#666"
              }}>
                <span>Total Items</span>
                <span>{totalItems}</span>
              </div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 15,
                fontWeight: 500,
                color: "#1a1a1a"
              }}>
                <span>Total Weight</span>
                <span>{totalWeight.toFixed(3)} grams</span>
              </div>
            </div>

            <button 
              onClick={placeOrder} 
              disabled={loading}
              style={{
                width: "100%",
                padding: "16px 24px",
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 0,
                border: "none",
                background: loading ? "#ccc" : "#1a1a1a",
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                marginBottom: 12,
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.background = "#000";
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.background = "#1a1a1a";
              }}
            >
              {loading ? "Processing..." : "Place Order"}
            </button>

            <button
              onClick={() => clear()}
              style={{
                width: "100%",
                padding: "16px 24px",
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 0,
                border: "1px solid #e8e8e8",
                background: "#fff",
                color: "#666",
                cursor: "pointer",
                letterSpacing: "1.5px",
                textTransform: "uppercase",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#fafafa";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#fff";
              }}
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>

      {/* Responsive */}
      <style>{`
        @media (max-width: 968px) {
          div[style*="gridTemplateColumns: \"1fr 400px\""] {
            grid-template-columns: 1fr !important;
          }
          div[style*="gridTemplateColumns: \"180px 1fr auto\""] {
            grid-template-columns: 1fr !important;
            gap: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}