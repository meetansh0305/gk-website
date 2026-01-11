import { useEffect, useState } from "react";
import { useWishlist } from "../state/WishlistContext";
import ProductCard from "../components/ProductCard";
import { useCart } from "../state/CartContext";
import { Heart, Sparkles } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import LoadingSpinner from "../components/LoadingSpinner";

// Hook to detect mobile - initialize immediately
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

export default function Wishlist() {
  const { wishlist, loading } = useWishlist();
  const { add } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Check authentication on mount - using localStorage workaround
  useEffect(() => {
    (async () => {
      // Check localStorage first (workaround for Supabase client hanging)
      const projectRef = import.meta.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      let hasUser = false;
      
      if (projectRef) {
        const storageKey = `sb-${projectRef}-auth-token`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          try {
            const sessionData = JSON.parse(stored);
            if (sessionData.user) {
              hasUser = true;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
      
      if (hasUser) {
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

  if (checkingAuth) {
    return (
      <div style={{ 
        minHeight: "60vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        padding: "40px 20px"
      }}>
        <LoadingSpinner size="large" message="Loading..." />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: "60vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        padding: "40px 20px"
      }}>
        <LoadingSpinner size="large" message="Loading your wishlist..." />
      </div>
    );
  }

  return (
    <div style={{
      background: "linear-gradient(135deg, #faf8f5 0%, #ffffff 50%, #faf8f5 100%)",
      minHeight: "100vh",
      padding: "40px 20px"
    }}>
      <div style={{
        maxWidth: 1400,
        margin: "0 auto"
      }}>
        {/* Header Section */}
        <div style={{
          textAlign: "center",
          marginBottom: 48,
          padding: "20px 0"
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            marginBottom: 16
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #b08d57 0%, #d4af37 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 24px rgba(176, 141, 87, 0.3)"
            }}>
              <Heart size={32} style={{ color: "#fff", fill: "#fff" }} />
            </div>
          </div>
          <h1 style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#071E33",
            margin: "0 0 12px 0",
            fontFamily: "'Playfair Display', Georgia, serif",
            letterSpacing: "1px"
          }}>
            My Wishlist
          </h1>
          {wishlist.length > 0 && (
            <p style={{
              fontSize: 16,
              color: "#666",
              margin: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8
            }}>
              <Sparkles size={18} style={{ color: "#b08d57" }} />
              {wishlist.length} {wishlist.length === 1 ? "treasured item" : "treasured items"}
            </p>
          )}
        </div>
        
        {wishlist.length === 0 ? (
          <div style={{
            background: "#fff",
            borderRadius: 24,
            padding: "80px 40px",
            textAlign: "center",
            boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            border: "1px solid #e8e4dc",
            maxWidth: 600,
            margin: "0 auto"
          }}>
            <div style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(176, 141, 87, 0.1) 0%, rgba(212, 175, 55, 0.1) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 32px",
              position: "relative"
            }}>
              <Heart size={56} style={{ color: "#b08d57", opacity: 0.6 }} />
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: 80,
                height: 80,
                borderRadius: "50%",
                background: "linear-gradient(135deg, rgba(176, 141, 87, 0.15) 0%, rgba(212, 175, 55, 0.15) 100%)",
                zIndex: -1
              }} />
            </div>
            <h2 style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#071E33",
              margin: "0 0 16px 0",
              fontFamily: "'Playfair Display', Georgia, serif"
            }}>
              Your Wishlist is Empty
            </h2>
            <p style={{
              fontSize: 16,
              color: "#666",
              margin: "0 0 32px 0",
              lineHeight: 1.6,
              maxWidth: 400,
              marginLeft: "auto",
              marginRight: "auto"
            }}>
              Start curating your collection of favorite jewelry pieces. Add items you love to your wishlist and they'll be saved here for easy access.
            </p>
            <button
              onClick={() => navigate("/products")}
              style={{
                background: "linear-gradient(135deg, #b08d57 0%, #d4af37 100%)",
                color: "#fff",
                border: "none",
                padding: "16px 40px",
                borderRadius: 50,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.3s ease",
                boxShadow: "0 8px 24px rgba(176, 141, 87, 0.3)",
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontFamily: "'Playfair Display', Georgia, serif"
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
              Explore Collection
            </button>
          </div>
        ) : (
          <div className="all-products-grid" style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, minmax(0, 1fr))",
            gap: isMobile ? 12 : 16,
            width: "100%",
            boxSizing: "border-box",
          }}>
            {wishlist.map((product) => (
              <ProductCard key={product.id} p={product} onClickAdd={() => add(product)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

