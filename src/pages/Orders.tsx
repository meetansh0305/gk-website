import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { handleSupabaseError, showError, showSuccess } from "../utils/errorHandler";
import { useNavigate, useLocation } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";

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

type Order = {
  id: number;
  status: string;
  created_at: string;
  total_weight: number | null;
  items: Array<{
    id: number;
    quantity: number;
    weight_at_purchase: number | null;
    product: { 
      id: number; 
      name: string | null; 
      image_url: string | null; 
      weight: number | null;
      category_name?: string | null;
      subcategory_name?: string | null;
    };
  }>;
};

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [tab, setTab] = useState<"inprogress"|"ready"|"past"|"cancelled">("inprogress");
  const [cancelling, setCancelling] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const hasLoadedRef = useRef(false);
  const loadingRef = useRef(false);

  // Check authentication on mount - using localStorage workaround
  useEffect(() => {
    (async () => {
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
            console.error("Orders: Error parsing stored session:", e);
          }
        }
      }
      
      if (sessionUser) {
        setUser(sessionUser);
        setCheckingAuth(false);
      } else {
        // Try Supabase with timeout
        try {
          const sessionPromise = supabase.auth.getSession();
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("getSession timeout")), 2000);
          });
          
          const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any;
          if (session?.user) {
            setUser(session.user);
            setCheckingAuth(false);
          } else {
            navigate(`/auth?returnTo=${encodeURIComponent(location.pathname)}`, { replace: true });
          }
        } catch (e: any) {
          navigate(`/auth?returnTo=${encodeURIComponent(location.pathname)}`, { replace: true });
        }
      }
    })();
  }, [navigate, location]);

  const load = useCallback(async () => {
    // Prevent multiple simultaneous loads
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      // Get user and access token from localStorage (workaround for Supabase hanging)
      let currentUser = user;
      let accessToken: string | null = null;
      
      const projectRef = import.meta.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      if (projectRef) {
        const storageKey = `sb-${projectRef}-auth-token`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          try {
            const sessionData = JSON.parse(stored);
            if (sessionData.user) {
              currentUser = sessionData.user;
              accessToken = sessionData.access_token;
            }
          } catch (e) {
            console.error("Orders: Error parsing stored session:", e);
          }
        }
      }
      
      if (!currentUser || !accessToken) {
        setOrders([]);
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      // Use direct fetch with access token to bypass Supabase client issues
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // First, get orders
      const ordersUrl = `${supabaseUrl}/rest/v1/orders?select=id,status,created_at,total_weight&user_id=eq.${currentUser.id}&order=created_at.desc`;
      
      const ordersResponse = await fetch(ordersUrl, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!ordersResponse.ok) {
        console.error("Load orders error:", ordersResponse.status, ordersResponse.statusText);
        setOrders([]);
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      const ordersData = await ordersResponse.json();
      
      if (!ordersData || !Array.isArray(ordersData)) {
        setOrders([]);
        setLoading(false);
        loadingRef.current = false;
        return;
      }

      // For each order, get order_items separately (simpler than nested query)
      const ordersWithItems = await Promise.all(
        ordersData.map(async (order: any) => {
          const itemsUrl = `${supabaseUrl}/rest/v1/order_items?select=id,quantity,weight_at_purchase,product_id&order_id=eq.${order.id}`;
          const itemsResponse = await fetch(itemsUrl, {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });
          
          let items: any[] = [];
          if (itemsResponse.ok) {
            const itemsData = await itemsResponse.json();
            if (itemsData && Array.isArray(itemsData)) {
              // Get product details for each item
              const productIds = itemsData.map((item: any) => item.product_id).filter(Boolean);
              if (productIds.length > 0) {
                // First, get products with category_id and subcategory_id
                const productsUrl = `${supabaseUrl}/rest/v1/products?select=id,name,image_url,weight,category_id,subcategory_id&id=in.(${productIds.join(',')})`;
                const productsResponse = await fetch(productsUrl, {
                  headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                  }
                });
                
                if (productsResponse.ok) {
                  const productsData = await productsResponse.json();
                  
                  // Get unique category and subcategory IDs
                  const categoryIds = [...new Set(productsData.map((p: any) => p.category_id).filter(Boolean))];
                  const subcategoryIds = [...new Set(productsData.map((p: any) => p.subcategory_id).filter(Boolean))];
                  
                  // Fetch category names
                  let categoriesMap = new Map();
                  if (categoryIds.length > 0) {
                    const categoriesUrl = `${supabaseUrl}/rest/v1/categories?select=id,name&id=in.(${categoryIds.join(',')})`;
                    const categoriesResponse = await fetch(categoriesUrl, {
                      headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                      }
                    });
                    if (categoriesResponse.ok) {
                      const categoriesData = await categoriesResponse.json();
                      categoriesMap = new Map((categoriesData || []).map((c: any) => [c.id, c.name]));
                    }
                  }
                  
                  // Fetch subcategory names
                  let subcategoriesMap = new Map();
                  if (subcategoryIds.length > 0) {
                    const subcategoriesUrl = `${supabaseUrl}/rest/v1/subcategories?select=id,name&id=in.(${subcategoryIds.join(',')})`;
                    const subcategoriesResponse = await fetch(subcategoriesUrl, {
                      headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                      }
                    });
                    if (subcategoriesResponse.ok) {
                      const subcategoriesData = await subcategoriesResponse.json();
                      subcategoriesMap = new Map((subcategoriesData || []).map((s: any) => [s.id, s.name]));
                    }
                  }
                  
                  // Map products with category and subcategory names
                  const productsMap = new Map(
                    (productsData || []).map((p: any) => [
                      p.id,
                      {
                        ...p,
                        category_name: categoriesMap.get(p.category_id) || null,
                        subcategory_name: subcategoriesMap.get(p.subcategory_id) || null
                      }
                    ])
                  );
                  
                  items = itemsData.map((item: any) => ({
                    id: item.id,
                    quantity: item.quantity,
                    weight_at_purchase: item.weight_at_purchase,
                    product: productsMap.get(item.product_id) || null
                  }));
                }
              }
            }
          }
          
          return {
            ...order,
            items
          };
        })
      );

      // Map to expected format
      const mapped = ordersWithItems.map(order => ({
        id: order.id,
        status: order.status,
        created_at: order.created_at,
        total_weight: order.total_weight,
        items: order.items || []
      }));
      
      setOrders(mapped);
    } catch (e: any) {
      console.error("Unexpected error loading orders:", e);
      setOrders([]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [user]);

  // Load orders when user is available (only once per user)
  useEffect(() => {
    if (checkingAuth || !user) return;
    
    // Only load if we haven't loaded for this user yet
    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      load();
    }
  }, [user, checkingAuth, load]);

  // Reset hasLoadedRef when user changes
  useEffect(() => {
    hasLoadedRef.current = false;
  }, [user?.id]);

  // Set up auth state listener (only once)
  useEffect(() => {
    if (checkingAuth) return;
    
    let mounted = true;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      
      if (session?.user) {
        // Only update user if it changed
        setUser(prev => {
          if (prev?.id !== session.user?.id) {
            hasLoadedRef.current = false; // Reset load flag for new user
            return session.user;
          }
          return prev;
        });
      } else {
        setUser(null);
        setOrders([]);
        setLoading(false);
        hasLoadedRef.current = false;
        // Redirect to auth if logged out
        navigate(`/auth?returnTo=${encodeURIComponent(location.pathname)}`, { replace: true });
      }
    });
    
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [checkingAuth, navigate, location]);

  const cancelOrder = async (orderId: number) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;

    setCancelling(orderId);
    try {
      // Get access token from localStorage
      const projectRef = import.meta.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      let accessToken: string | null = null;
      
      if (projectRef) {
        const storageKey = `sb-${projectRef}-auth-token`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          try {
            const sessionData = JSON.parse(stored);
            accessToken = sessionData.access_token;
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
      
      if (!accessToken) {
        console.error("No access token found");
        setCancelling(null);
        return;
      }

      // Use direct fetch to update order
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      const updateUrl = `${supabaseUrl}/rest/v1/orders?id=eq.${orderId}`;
      
      const response = await fetch(updateUrl, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ status: 'cancelled' })
      });

      if (!response.ok) {
        console.error("Cancel order error:", response.status, response.statusText);
        setCancelling(null);
        return;
      }

      // Reload orders
      await load();
    } catch (e: any) {
      console.error("Cancel order error:", e);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "cancelled":
        return { bg: "#fff5f5", color: "#c62828", border: "#ffcdd2" };
      case "delivered":
        return { bg: "#f0f9f4", color: "#2e7d32", border: "#c8e6c9" };
      case "ready":
        return { bg: "#fffbf0", color: "#f57f17", border: "#ffe082" };
      case "in_progress":
        return { bg: "rgba(176, 141, 87, 0.1)", color: "#8b6641", border: "rgba(176, 141, 87, 0.3)" };
      default:
        return { bg: "#f5f5f5", color: "#666", border: "#e0e0e0" };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { 
      year: "numeric", 
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (checkingAuth) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #fefdfb 0%, #faf8f5 30%, #f5f3ed 100%)"
      }}>
        <LoadingSpinner size="large" message="Loading..." />
      </div>
    );
  }

  if (!user && !loading) {
    return (
      <div style={{
        padding: isMobile ? "100px 16px 120px 16px" : "80px 48px 100px 48px",
        maxWidth: 600,
        margin: "0 auto",
        textAlign: "center"
      }}>
        <div style={{
          background: "#fff",
          borderRadius: 24,
          border: "1px solid #e8e4dc",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          padding: isMobile ? "60px 24px" : "80px 40px"
        }}>
          <div style={{
            fontSize: 64,
            marginBottom: 24,
            color: "#b08d57"
          }}>📦</div>
          <h2 style={{
            fontSize: isMobile ? 24 : 32,
            fontWeight: 700,
            marginBottom: 12,
            color: "#071E33",
            fontFamily: "'Playfair Display', Georgia, serif"
          }}>
            Login Required
          </h2>
          <p style={{
            color: "#8b7355",
            fontSize: isMobile ? 14 : 16,
            marginBottom: 32
          }}>
            Please log in to view your orders.
          </p>
          <button
            onClick={() => navigate("/auth")}
            style={{
              background: "linear-gradient(135deg, #b08d57 0%, #d4af37 100%)",
              color: "#fff",
              border: "none",
              padding: isMobile ? "14px 32px" : "16px 40px",
              borderRadius: 50,
              fontSize: isMobile ? 13 : 14,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: "0 8px 24px rgba(176, 141, 87, 0.3)",
              textTransform: "uppercase",
              letterSpacing: "1px"
            }}
            onMouseEnter={(e) => {
              if (!isMobile) {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 12px 32px rgba(176, 141, 87, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isMobile) {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(176, 141, 87, 0.3)";
              }
            }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: isMobile ? "100px 16px 120px 16px" : "80px 48px 100px 48px",
      maxWidth: 1400,
      margin: "0 auto",
      background: "linear-gradient(180deg, #fefdfb 0%, #faf8f5 30%, #f5f3ed 100%)",
      minHeight: "100vh",
      boxSizing: "border-box"
    }}>
      {/* Header */}
      <div style={{
        marginBottom: isMobile ? 32 : 48,
        textAlign: "center"
      }}>
        <h1 style={{
          fontSize: isMobile ? 32 : 42,
          fontWeight: 700,
          marginBottom: isMobile ? 8 : 12,
          color: "#071E33",
          fontFamily: "'Playfair Display', Georgia, serif",
          letterSpacing: "-0.8px",
          lineHeight: 1.2
        }}>
          My Orders
        </h1>
        <p style={{
          fontSize: isMobile ? 14 : 16,
          color: "#8b7355",
          fontWeight: 500,
          letterSpacing: "0.2px",
          margin: 0
        }}>
          Track and manage your orders
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: isMobile ? 8 : 12,
        marginBottom: isMobile ? 24 : 32,
        flexWrap: isMobile ? "wrap" : "nowrap",
        overflowX: isMobile ? "auto" : "visible",
        paddingBottom: isMobile ? 8 : 0,
        WebkitOverflowScrolling: "touch"
      }}>
        {[
          { key: "inprogress", label: "In Progress" },
          { key: "ready", label: "Ready" },
          { key: "past", label: "Past Orders" },
          { key: "cancelled", label: "Cancelled" }
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key as any)}
            style={{
              padding: isMobile ? "10px 16px" : "12px 24px",
              fontSize: isMobile ? 13 : 14,
              fontWeight: tab === key ? 700 : 600,
              borderRadius: 50,
              border: "none",
              background: tab === key
                ? "linear-gradient(135deg, #b08d57 0%, #d4af37 100%)"
                : "#fff",
              color: tab === key ? "#fff" : "#8b7355",
              cursor: "pointer",
              transition: "all 0.3s ease",
              boxShadow: tab === key
                ? "0 4px 12px rgba(176, 141, 87, 0.3)"
                : "0 2px 4px rgba(0,0,0,0.05)",
              whiteSpace: "nowrap",
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              if (!isMobile && tab !== key) {
                e.currentTarget.style.background = "#faf8f5";
                e.currentTarget.style.transform = "translateY(-2px)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isMobile && tab !== key) {
                e.currentTarget.style.background = "#fff";
                e.currentTarget.style.transform = "translateY(0)";
              }
            }}
          >
            {label}
          </button>
        ))}
        <button
          onClick={load}
          style={{
            marginLeft: "auto",
            padding: isMobile ? "10px 16px" : "12px 24px",
            fontSize: isMobile ? 13 : 14,
            fontWeight: 600,
            borderRadius: 50,
            border: "1px solid #e8e4dc",
            background: "#fff",
            color: "#8b7355",
            cursor: "pointer",
            transition: "all 0.3s ease",
            whiteSpace: "nowrap",
            flexShrink: 0
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
          Refresh
        </button>
      </div>

      {loading ? (
        <div style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "400px"
        }}>
          <LoadingSpinner size="large" message="Loading your orders..." />
        </div>
      ) : list.length === 0 ? (
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
            No {tab === "inprogress" ? "In Progress" : tab === "ready" ? "Ready" : tab === "past" ? "Past" : "Cancelled"} Orders
          </div>
          <p style={{
            color: "#8b7355",
            marginBottom: 32,
            fontSize: isMobile ? 14 : 16,
            fontWeight: 500
          }}>
            {tab === "cancelled" 
              ? "You don't have any cancelled orders."
              : "Your orders will appear here once you place them."}
          </p>
          {tab !== "cancelled" && (
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
                if (!isMobile) {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(176, 141, 87, 0.4)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isMobile) {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(176, 141, 87, 0.3)";
                }
              }}
            >
              Browse Products
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gap: isMobile ? 20 : 24 }}>
      {list.map(o => {
        const orderTotalWeight = o.total_weight ?? o.items.reduce((sum, it) => {
          const itemWeight = (it.weight_at_purchase ?? it.product?.weight ?? 0) * it.quantity;
          return sum + itemWeight;
        }, 0);
            const statusColors = getStatusColor(o.status);
        
        return (
              <div
                key={o.id}
                style={{
                  background: "#fff",
                  borderRadius: 16,
                  border: "1px solid #e8e4dc",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                  padding: isMobile ? "20px" : "28px",
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
                {/* Order Header */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: isMobile ? 20 : 24,
                  flexWrap: isMobile ? "wrap" : "nowrap",
                  gap: isMobile ? 12 : 16
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontSize: isMobile ? 18 : 22,
                      fontWeight: 700,
                      color: "#071E33",
                      marginBottom: 6,
                      fontFamily: "'Playfair Display', Georgia, serif"
                    }}>
                      Order #{o.id}
                    </div>
                    <div style={{
                      fontSize: isMobile ? 12 : 13,
                      color: "#8b7355",
                      marginBottom: 8,
                      fontWeight: 500
                    }}>
                      {formatDate(o.created_at)}
                    </div>
                    <div style={{
                      fontSize: isMobile ? 13 : 14,
                      color: "#8b7355",
                      fontWeight: 600
                    }}>
                      Total Weight: {orderTotalWeight.toFixed(3)} grams
              </div>
            </div>
                  <div style={{
                    display: "flex",
                    gap: isMobile ? 8 : 12,
                    alignItems: "center",
                    flexWrap: isMobile ? "wrap" : "nowrap"
                  }}>
                    <div style={{
                      padding: isMobile ? "6px 14px" : "8px 18px",
                      borderRadius: 50,
                      background: statusColors.bg,
                      color: statusColors.color,
                      border: `1px solid ${statusColors.border}`,
                      fontSize: isMobile ? 11 : 12,
                      fontWeight: 700,
                      textTransform: "capitalize",
                      whiteSpace: "nowrap"
                    }}>
                      {o.status.replace("_", " ")}
              </div>
              {(o.status === "in_progress" || o.status === "ready") && (
                <button
                  onClick={() => cancelOrder(o.id)}
                  disabled={cancelling === o.id}
                  style={{
                          padding: isMobile ? "8px 16px" : "10px 20px",
                          fontSize: isMobile ? 12 : 13,
                          fontWeight: 600,
                          borderRadius: 50,
                          border: "1px solid #ffcdd2",
                          background: cancelling === o.id ? "#f5f5f5" : "#fff5f5",
                    color: "#c62828",
                          cursor: cancelling === o.id ? "not-allowed" : "pointer",
                          transition: "all 0.3s ease",
                          whiteSpace: "nowrap",
                          opacity: cancelling === o.id ? 0.6 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (!isMobile && cancelling !== o.id) {
                            e.currentTarget.style.background = "#ffebee";
                            e.currentTarget.style.borderColor = "#c62828";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isMobile && cancelling !== o.id) {
                            e.currentTarget.style.background = "#fff5f5";
                            e.currentTarget.style.borderColor = "#ffcdd2";
                          }
                        }}
                      >
                        {cancelling === o.id ? "Cancelling..." : "Cancel"}
                </button>
              )}
            </div>
          </div>

                {/* Order Items */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
                  gap: isMobile ? 12 : 16,
                  paddingTop: isMobile ? 16 : 20,
                  borderTop: "1px solid #e8e4dc"
                }}>
            {o.items.map(it => (
                    <div
                      key={it.id}
                      style={{
                        display: "flex",
                        gap: isMobile ? 12 : 16,
                        alignItems: "flex-start",
                        padding: isMobile ? "16px" : "20px",
                        background: "#faf8f5",
                        borderRadius: 12,
                        border: "1px solid #e8e4dc",
                        transition: "all 0.3s ease"
                      }}
                      onMouseEnter={(e) => {
                        if (!isMobile) {
                          e.currentTarget.style.background = "#fff";
                          e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isMobile) {
                          e.currentTarget.style.background = "#faf8f5";
                          e.currentTarget.style.boxShadow = "none";
                        }
                      }}
                    >
                      {/* Clickable Image */}
                      <div
                        onClick={() => setEnlargedImage(it.product?.image_url ?? null)}
                        style={{
                          width: isMobile ? 100 : 120,
                          height: isMobile ? 100 : 120,
                          minWidth: isMobile ? 100 : 120,
                          minHeight: isMobile ? 100 : 120,
                          borderRadius: 12,
                          overflow: "hidden",
                          background: "#fff",
                          cursor: "zoom-in",
                          flexShrink: 0
                        }}
                      >
                <img
                  src={it.product?.image_url ?? ""}
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
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Subcategory - largest */}
                        <div style={{
                          fontSize: isMobile ? 15 : 16,
                          fontWeight: 600,
                          color: "#071E33",
                          marginBottom: 4
                        }}>
                          {it.product?.subcategory_name || "Uncategorized"}
                        </div>
                        {/* Category - smaller */}
                        <div style={{
                          fontSize: isMobile ? 12 : 13,
                          fontWeight: 400,
                          color: "#8b7355",
                          marginBottom: 4
                        }}>
                          {it.product?.category_name || ""}
                        </div>
                        {/* Design ID - smallest */}
                        <div style={{
                          fontSize: isMobile ? 11 : 12,
                          fontWeight: 300,
                          color: "#999",
                          marginBottom: 12
                        }}>
                          ID #{it.product?.id}
                        </div>
                        {/* Quantity and Weight */}
                        <div style={{
                          fontSize: isMobile ? 13 : 14,
                          color: "#8b7355",
                          fontWeight: 500,
                          marginBottom: 4
                        }}>
                          Quantity: {it.quantity}
                        </div>
                        <div style={{
                          fontSize: isMobile ? 13 : 14,
                          color: "#8b7355",
                          fontWeight: 500
                        }}>
                          Weight: {((it.weight_at_purchase ?? it.product?.weight ?? 0) * it.quantity).toFixed(3)} grams
                  </div>
                        {it.weight_at_purchase && (
                          <div style={{
                            fontSize: isMobile ? 11 : 12,
                            color: "#999",
                            marginTop: 4
                          }}>
                            {it.weight_at_purchase.toFixed(3)} g each
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        );
      })}
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
