import { useEffect, useState } from "react";
import { useCart } from "../state/CartContext";
import { supabase } from "../lib/supabaseClient";
import { handleSupabaseError, showError, showSuccess } from "../utils/errorHandler";
import { useNavigate, useLocation } from "react-router-dom";

// Hook to detect mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};

type SimilarProduct = {
  id: number;
  image_url: string | null;
  weight: number | null;
  category_id: number;
  subcategory_id: number | null;
  category_name: string | null;
  subcategory_name: string | null;
};

export default function CartPage() {
  const { lines, setQty, remove, clear, totalItems } = useCart();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [similarProducts, setSimilarProducts] = useState<SimilarProduct[]>([]);
  const [similarCategory, setSimilarCategory] = useState<{ id: number; name: string } | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Check authentication on mount - using localStorage workaround
  useEffect(() => {
    let mounted = true;
    let timeoutId: NodeJS.Timeout;
    
    (async () => {
      try {
        // Check localStorage first (workaround for Supabase client hanging)
        const projectRef = import.meta.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
        let sessionUser = null;
        
        if (projectRef) {
          const storageKey = `sb-${projectRef}-auth-token`;
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            try {
              const sessionData = JSON.parse(stored);
              if (sessionData.user) {
                sessionUser = sessionData.user;
              }
            } catch (e) {
              console.error("Cart: Error parsing stored session:", e);
            }
          }
        }
        
        if (sessionUser) {
          // Found user in localStorage
          if (mounted) {
            setUser(sessionUser);
            setCheckingAuth(false);
          }
          return;
        }
        
        // Try Supabase with timeout
        try {
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("getSession timeout")), 2000);
          });
          
          const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
          if (mounted) {
            if (session?.user) {
              setUser(session.user);
              setCheckingAuth(false);
            } else {
              // Not logged in - redirect to auth
              navigate(`/auth?returnTo=${encodeURIComponent(location.pathname)}`, { replace: true });
            }
          }
        } catch (e: any) {
          if (mounted) {
            // Supabase is hanging or error occurred
            navigate(`/auth?returnTo=${encodeURIComponent(location.pathname)}`, { replace: true });
          }
        }
      } catch (error: any) {
        console.error("Cart: Unexpected auth check error:", error);
        if (mounted) {
          setCheckingAuth(false);
          // Don't redirect on unexpected errors - let user see the page
        }
      } finally {
        // Safety timeout - always clear checkingAuth after 3 seconds max
        timeoutId = setTimeout(() => {
          if (mounted) {
            setCheckingAuth(false);
          }
        }, 3000);
      }
    })();
    
    return () => {
      mounted = false;
      clearTimeout(timeoutId);
    };
  }, [navigate, location]);

  // Fetch similar products based on the most common category in cart
  // This hook must be called before any early returns (Rules of Hooks)
  useEffect(() => {
    if (lines.length === 0 || isMobile) {
      setSimilarProducts([]);
      setSimilarCategory(null);
      return;
    }

    (async () => {
      // Find the most common category_id from cart items
      const categoryCounts: Record<number, number> = {};
      lines.forEach(line => {
        const categoryId = (line.product as any).category_id;
        if (categoryId) {
          categoryCounts[categoryId] = (categoryCounts[categoryId] || 0) + 1;
        }
      });

      const mostCommonCategoryId = Object.keys(categoryCounts).reduce((a, b) => 
        categoryCounts[Number(a)] > categoryCounts[Number(b)] ? a : b
      );

      if (!mostCommonCategoryId) return;

      // Get category name
      const { data: category } = await supabase
        .from("categories")
        .select("id, name")
        .eq("id", Number(mostCommonCategoryId))
        .single();

      if (!category) return;

      setSimilarCategory(category);

      // Get products from the same category, excluding items already in cart
      const cartProductIds = lines.map(l => l.product.id);
      const { data: products } = await supabase
        .from("products")
        .select(`
          id,
          image_url,
          weight,
          category_id,
          subcategory_id,
          categories(name),
          subcategories(name)
        `)
        .eq("category_id", Number(mostCommonCategoryId))
        .order("id", { ascending: false })
        .limit(12);

      if (products) {
        // Filter out cart items client-side and take first 6
        const filtered = products
          .filter((p: any) => !cartProductIds.includes(p.id))
          .slice(0, 6);
        
        const formatted = filtered.map((p: any) => ({
          id: p.id,
          image_url: p.image_url,
          weight: p.weight,
          category_id: p.category_id,
          subcategory_id: p.subcategory_id,
          category_name: p.categories?.name ?? null,
          subcategory_name: p.subcategories?.name ?? null,
        }));
        setSimilarProducts(formatted);
      }
    })();
  }, [lines, isMobile]);

  // Show loading while checking auth (AFTER all hooks are called)
  if (checkingAuth) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #fefdfb 0%, #faf8f5 30%, #f5f3ed 100%)"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, color: "#666" }}>Loading...</div>
        </div>
      </div>
    );
  }

  const totalWeight = lines.reduce((sum, l) => sum + (l.product.weight ?? 0) * l.quantity, 0);

  const placeOrder = async () => {
    setLoading(true);
    try {
      // Get user from state or localStorage (workaround for Supabase hanging)
      let currentUser = user;
      if (!currentUser) {
        const projectRef = import.meta.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
        if (projectRef) {
          const storageKey = `sb-${projectRef}-auth-token`;
          const stored = localStorage.getItem(storageKey);
          if (stored) {
            try {
              const sessionData = JSON.parse(stored);
              currentUser = sessionData.user;
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
      
      if (!currentUser) {
        showError("Please login or signup to place an order.", "Authentication Required");
        setLoading(false);
        return;
      }
      
      const user = currentUser;

      const { data: profile, error: profErr } = await (supabase
        .from("profiles")
        .select("full_name, state, city, phone")
        .eq("id", user.id)
        .single() as unknown as Promise<{ data: { full_name: string | null; state: string | null; city: string | null; phone: string | null } | null; error: any }>);

      if (profErr) {
        console.error("Profile fetch error", profErr);
        showError(handleSupabaseError(profErr), "Profile Error");
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

      // Calculate total weight
      const totalWeight = lines.reduce((sum, l) => {
        const itemWeight = (l.product.weight ?? 0) * l.quantity;
        return sum + itemWeight;
      }, 0);

      const { data: newOrder, error: orderErr } = await (supabase
        .from("orders")
        .insert({ 
          user_id: user.id, 
          status: "in_progress",
          total_weight: totalWeight
        } as any)
        .select()
        .single() as unknown as Promise<{ data: { id: number } | null; error: any }>);

      if (orderErr || !newOrder) {
        console.error("Order creation error", orderErr);
        showError(
          orderErr ? handleSupabaseError(orderErr) : "Failed to create order",
          "Order Failed"
        );
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

      const { error: itemsErr } = await (supabase.from("order_items").insert(itemsPayload as any) as unknown as Promise<{ error: any }>);
      if (itemsErr) {
        console.error("Order items insert error", itemsErr);
        showError(handleSupabaseError(itemsErr), "Order Failed");
        setLoading(false);
        return;
      }

      // Send order confirmation email (if email service is set up)
      try {
        const { sendOrderConfirmation } = await import("../utils/emailNotifications");
        const itemsForEmail = lines.map(l => ({
          name: `Product #${l.product.id}`,
          quantity: l.quantity,
          weight: l.product.weight ?? 0
        }));
        await sendOrderConfirmation(user.email || "", newOrder.id, new Date().toISOString(), itemsForEmail, totalWeight);
      } catch (e) {
        // Email service not set up yet - that's okay
        console.log("Email notification skipped (service not configured)");
      }

      clear();
      showSuccess("Order placed successfully!", "Order Confirmed");
    } catch (e: any) {
      console.error("Place order unexpected error", e);
      showError(handleSupabaseError(e), "Unexpected Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="cart-page-container"
      style={{ 
        padding: isMobile ? "120px 16px 120px 16px" : "80px 48px 100px 48px", 
        maxWidth: 1400,
        margin: "0 auto",
        background: "linear-gradient(180deg, #fefdfb 0%, #faf8f5 30%, #f5f3ed 100%)",
        minHeight: "100vh",
        boxSizing: "border-box",
        position: "relative"
      }}>
      {/* Header */}
      <div style={{ 
        marginBottom: isMobile ? 32 : 48,
        textAlign: "center",
        paddingTop: isMobile ? 20 : 0,
        marginTop: isMobile ? 20 : 0
      }}>
        <h1 style={{ 
          fontSize: isMobile ? 32 : 42, 
          fontWeight: 700,
          marginBottom: isMobile ? 8 : 12,
          color: "#071E33",
          fontFamily: "'Playfair Display', Georgia, serif",
          letterSpacing: "-0.8px",
          lineHeight: 1.2,
          display: "block",
          visibility: "visible",
          opacity: 1
        }}>
          Shopping Cart
        </h1>
        <p style={{ 
          fontSize: isMobile ? 14 : 16, 
          color: "#8b7355",
          fontWeight: 500,
          letterSpacing: "0.2px",
          margin: 0
        }}>
          {totalItems} {totalItems === 1 ? "item" : "items"} · Total weight: {totalWeight.toFixed(3)} grams
        </p>
      </div>

      {lines.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: isMobile ? "60px 24px" : "100px 40px",
          background: "#fff",
          borderRadius: 24,
          border: "1px solid #e8e4dc",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          maxWidth: 600,
          margin: "0 auto"
        }}>
          <div style={{ 
            fontSize: isMobile ? 20 : 24,
            marginBottom: 12,
            color: "#071E33",
            fontWeight: 700,
            fontFamily: "'Playfair Display', Georgia, serif",
            letterSpacing: "0.3px"
          }}>
            Your shopping cart is empty
          </div>
          <p style={{ color: "#8b7355", marginBottom: 32, fontSize: isMobile ? 14 : 16, fontWeight: 500 }}>
            Discover our exquisite collections
          </p>
          <button 
            onClick={() => navigate("/products")}
            style={{
              padding: isMobile ? "14px 32px" : "16px 40px",
              fontSize: isMobile ? 13 : 14,
              fontWeight: 600,
              borderRadius: 50,
              border: "none",
              background: "linear-gradient(135deg, #b08d57 0%, #d4af37 100%)",
              color: "#fff",
              cursor: "pointer",
              letterSpacing: "1px",
              textTransform: "uppercase",
              transition: "all 0.3s ease",
              boxShadow: "0 8px 24px rgba(176, 141, 87, 0.3)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 12px 32px rgba(176, 141, 87, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(176, 141, 87, 0.3)";
            }}
          >
            Continue Shopping
          </button>
        </div>
      )}

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: isMobile ? "1fr" : "1fr 400px",
        gap: isMobile ? 24 : 40,
        alignItems: "start"
      }}>
        {/* Cart Items */}
        <div style={{ display: "grid", gap: isMobile ? 16 : 20 }}>
          {lines.map((l) => (
            <div 
              key={l.product.id} 
              style={{ 
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "180px 1fr auto",
                gap: isMobile ? 16 : 24,
                alignItems: isMobile ? "flex-start" : "center",
                padding: isMobile ? "20px" : "24px",
                background: "#fff",
                borderRadius: 16,
                border: "1px solid #e8e4dc",
                boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.06)";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              {/* Image - Clickable to Enlarge */}
              <div 
                onClick={() => setEnlargedImage(l.product.image_url ?? null)}
                style={{
                  width: isMobile ? "100%" : 180,
                  height: isMobile ? 200 : 180,
                  overflow: "hidden",
                  background: "#faf8f5",
                  borderRadius: 12,
                  cursor: "zoom-in",
                  position: "relative"
                }}
              >
                <img 
                  src={l.product.image_url ?? ""} 
                  alt="" 
                  style={{ 
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transition: "transform 0.3s ease"
                  }} 
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1606313564200-e75d5e30476e?q=80&w=1200&auto=format&fit=crop";
                  }}
                  onMouseEnter={(e) => {
                    if (!isMobile) {
                      e.currentTarget.style.transform = "scale(1.05)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isMobile) {
                      e.currentTarget.style.transform = "scale(1)";
                    }
                  }}
                />
              </div>

              {/* Details */}
              <div style={{ width: "100%" }}>
                {/* Subcategory - largest font */}
                <div style={{ 
                  fontWeight: 600,
                  fontSize: isMobile ? 16 : 18,
                  marginBottom: 6,
                  color: "#071E33",
                  letterSpacing: "0.3px"
                }}>
                  {(l.product as any).subcategory_name || "Uncategorized"}
                </div>
                
                {/* Category - smaller font */}
                <div style={{ 
                  fontWeight: 400,
                  fontSize: isMobile ? 13 : 14,
                  marginBottom: 4,
                  color: "#8b7355",
                  letterSpacing: "0.2px"
                }}>
                  {(l.product as any).category_name || ""}
                </div>
                
                {/* Design ID - smallest font */}
                <div style={{ 
                  fontWeight: 300,
                  fontSize: isMobile ? 11 : 12,
                  marginBottom: 12,
                  color: "#999",
                  letterSpacing: "0.2px"
                }}>
                  ID #{l.product.id}
                </div>
                
                <div style={{ 
                  color: "#8b7355",
                  marginBottom: isMobile ? 16 : 20,
                  fontSize: isMobile ? 13 : 14,
                  fontWeight: 500,
                  letterSpacing: "0.3px"
                }}>
                  Weight: {(l.product.weight ?? 0).toFixed(3)} grams
                </div>

                {/* Quantity controls */}
                <div style={{ 
                  display: "flex", 
                  gap: 0, 
                  alignItems: "center",
                  flexWrap: isMobile ? "wrap" : "nowrap",
                  marginBottom: isMobile ? 12 : 0
                }}>
                  <div style={{ display: "flex", gap: 0, alignItems: "center", marginRight: isMobile ? 0 : 16 }}>
                    <button 
                      onClick={() => setQty(l.product.id, Math.max(1, l.quantity - 1))}
                      style={{
                        width: isMobile ? 48 : 44,
                        height: isMobile ? 48 : 44,
                        minWidth: isMobile ? 48 : 44,
                        minHeight: isMobile ? 48 : 44,
                        padding: 0,
                        border: "1px solid #e8e4dc",
                        borderRight: "none",
                        background: "#fff",
                        cursor: "pointer",
                        fontSize: 20,
                        color: "#8b7355",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "8px 0 0 8px"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#faf8f5";
                        e.currentTarget.style.borderColor = "#b08d57";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#fff";
                        e.currentTarget.style.borderColor = "#e8e4dc";
                      }}
                      aria-label="Decrease quantity"
                    >
                      −
                    </button>
                    
                    <input 
                      type="number" 
                      value={l.quantity} 
                      onChange={(e) => setQty(l.product.id, Math.max(1, Number(e.target.value) || 1))} 
                      style={{ 
                        width: isMobile ? 60 : 70,
                        minWidth: isMobile ? 60 : 70,
                        height: isMobile ? 48 : 44,
                        minHeight: isMobile ? 48 : 44,
                        textAlign: "center",
                        border: "1px solid #e8e4dc",
                        borderLeft: "none",
                        borderRight: "none",
                        fontSize: isMobile ? 16 : 15,
                        fontWeight: 600,
                        color: "#071E33",
                        background: "#fff"
                      }}
                      aria-label="Quantity"
                    />
                    
                    <button 
                      onClick={() => setQty(l.product.id, l.quantity + 1)}
                      style={{
                        width: isMobile ? 48 : 44,
                        height: isMobile ? 48 : 44,
                        minWidth: isMobile ? 48 : 44,
                        minHeight: isMobile ? 48 : 44,
                        padding: 0,
                        border: "1px solid #e8e4dc",
                        borderLeft: "none",
                        background: "#fff",
                        cursor: "pointer",
                        fontSize: 20,
                        color: "#8b7355",
                        transition: "all 0.2s ease",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "0 8px 8px 0"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#faf8f5";
                        e.currentTarget.style.borderColor = "#b08d57";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#fff";
                        e.currentTarget.style.borderColor = "#e8e4dc";
                      }}
                      aria-label="Increase quantity"
                    >
                      +
                    </button>
                  </div>

                  <div style={{
                    fontSize: isMobile ? 13 : 14,
                    color: "#8b7355",
                    fontWeight: 600,
                    marginLeft: isMobile ? 0 : 16,
                    marginTop: isMobile ? 12 : 0,
                    width: isMobile ? "100%" : "auto"
                  }}>
                    Subtotal: {((l.product.weight ?? 0) * l.quantity).toFixed(3)}g
                  </div>
                </div>
              </div>

              {/* Remove button */}
              <button 
                onClick={() => remove(l.product.id)}
                style={{
                  width: isMobile ? "100%" : 40,
                  height: isMobile ? 44 : 40,
                  border: "1px solid #e8e4dc",
                  background: "#fff",
                  color: "#999",
                  cursor: "pointer",
                  fontSize: isMobile ? 14 : 18,
                  fontWeight: isMobile ? 600 : 400,
                  transition: "all 0.2s ease",
                  borderRadius: isMobile ? 8 : 0,
                  marginTop: isMobile ? 12 : 0
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#c62828";
                  e.currentTarget.style.color = "#c62828";
                  e.currentTarget.style.background = "#fff5f5";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#e8e4dc";
                  e.currentTarget.style.color = "#999";
                  e.currentTarget.style.background = "#fff";
                }}
              >
                {isMobile ? "Remove" : "×"}
              </button>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        {lines.length > 0 && (
          <div style={{
            position: isMobile ? "relative" : "sticky",
            top: isMobile ? "auto" : 100,
            background: "#fff",
            border: "1px solid #e8e4dc",
            borderRadius: 16,
            padding: isMobile ? 24 : 32,
            boxShadow: "0 4px 16px rgba(0,0,0,0.06)"
          }}>
            <h3 style={{ 
              fontSize: isMobile ? 20 : 22,
              fontWeight: 700,
              marginBottom: 24,
              letterSpacing: "0.3px",
              color: "#071E33",
              fontFamily: "'Playfair Display', Georgia, serif"
            }}>
              Order Summary
            </h3>

            <div style={{
              borderTop: "1px solid #e8e4dc",
              paddingTop: 20,
              marginBottom: 24
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 16,
                fontSize: isMobile ? 14 : 15,
                color: "#8b7355",
                fontWeight: 500
              }}>
                <span>Total Items</span>
                <span style={{ color: "#071E33", fontWeight: 600 }}>{totalItems}</span>
              </div>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: isMobile ? 16 : 18,
                fontWeight: 600,
                color: "#071E33"
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
                padding: isMobile ? "16px 24px" : "18px 24px",
                fontSize: isMobile ? 13 : 14,
                fontWeight: 600,
                borderRadius: 50,
                border: "none",
                background: loading ? "#ccc" : "linear-gradient(135deg, #b08d57 0%, #d4af37 100%)",
                color: "#fff",
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "1px",
                textTransform: "uppercase",
                marginBottom: 12,
                transition: "all 0.3s ease",
                boxShadow: loading ? "none" : "0 8px 24px rgba(176, 141, 87, 0.3)"
              }}
              onMouseEnter={(e) => {
                if (!loading && !isMobile) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(176, 141, 87, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                if (!loading && !isMobile) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(176, 141, 87, 0.3)";
                }
              }}
            >
              {loading ? "Processing..." : "Place Order"}
            </button>

            <button
              onClick={() => clear()}
              style={{
                width: "100%",
                padding: isMobile ? "14px 24px" : "16px 24px",
                fontSize: isMobile ? 13 : 14,
                fontWeight: 600,
                borderRadius: 50,
                border: "1px solid #e8e4dc",
                background: "#fff",
                color: "#8b7355",
                cursor: "pointer",
                letterSpacing: "1px",
                textTransform: "uppercase",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.background = "#faf8f5";
                  e.currentTarget.style.borderColor = "#b08d57";
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.borderColor = "#e8e4dc";
                }
              }}
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>

      {/* Similar Products Section - Desktop Only */}
      {!isMobile && lines.length > 0 && similarProducts.length > 0 && similarCategory && (
        <div style={{
          marginTop: 60,
          paddingTop: 40,
          borderTop: "1px solid #e8e4dc"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 32
          }}>
            <div>
              <h2 style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#071E33",
                marginBottom: 8,
                fontFamily: "'Playfair Display', Georgia, serif",
                letterSpacing: "-0.5px"
              }}>
                Similar Products
              </h2>
              <p style={{
                fontSize: 16,
                color: "#8b7355",
                fontWeight: 500,
                margin: 0
              }}>
                Explore more from {similarCategory.name}
              </p>
            </div>
            <button
              onClick={() => navigate(`/products?category=${similarCategory.id}`)}
              style={{
                padding: "12px 32px",
                fontSize: 14,
                fontWeight: 600,
                borderRadius: 50,
                border: "1px solid #b08d57",
                background: "transparent",
                color: "#b08d57",
                cursor: "pointer",
                letterSpacing: "0.5px",
                transition: "all 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #b08d57 0%, #d4af37 100%)";
                e.currentTarget.style.color = "#fff";
                e.currentTarget.style.borderColor = "transparent";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "#b08d57";
                e.currentTarget.style.borderColor = "#b08d57";
              }}
            >
              View All {similarCategory.name}
            </button>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 20
          }}>
            {similarProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => navigate(`/products?product=${product.id}`)}
                style={{
                  cursor: "pointer",
                  background: "#fff",
                  borderRadius: 12,
                  overflow: "hidden",
                  border: "1px solid #e8e4dc",
                  transition: "all 0.3s ease",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-4px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.04)";
                }}
              >
                <div style={{
                  width: "100%",
                  aspectRatio: "5/6",
                  overflow: "hidden",
                  background: "#faf8f5"
                }}>
                  <img
                    src={product.image_url ?? ""}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transition: "transform 0.3s ease"
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1606313564200-e75d5e30476e?q=80&w=1200&auto=format&fit=crop";
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  />
                </div>
                <div style={{
                  padding: "12px",
                  textAlign: "center"
                }}>
                  <div style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#071E33",
                    marginBottom: 4
                  }}>
                    {product.subcategory_name || "Product"}
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: "#8b7355",
                    fontWeight: 500
                  }}>
                    {product.weight ? `${product.weight.toFixed(2)} gm` : "—"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Image Enlargement Modal */}
      {enlargedImage && (
        <div
          onClick={() => setEnlargedImage(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            cursor: "pointer"
          }}
        >
          <img
            src={enlargedImage}
            alt=""
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              objectFit: "contain",
              borderRadius: 8,
              background: "#fff",
              cursor: "default"
            }}
          />
        </div>
      )}
    </div>
  );
}