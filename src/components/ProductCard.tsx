import { useState, useEffect } from "react";
import { useWishlist } from "../state/WishlistContext";
import { useCart } from "../state/CartContext";
import ImageWithPlaceholder from "./ImageWithPlaceholder";

// Hook to detect mobile - use 768px breakpoint to match CSS media query
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
    // Check immediately
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};

type Product = {
  id: number;
  image_url: string | null;
  weight?: number | null;
  name?: string | null;
  is_live_stock?: boolean;
  category_name?: string | null;
  subcategory_name?: string | null;
};

type Props = {
  p: Product;
  onClickAdd?: (product: Product) => void;
  isSelected?: boolean;
  onSelect?: (productId: number, selected: boolean) => void;
  showCheckbox?: boolean;
};

export default function ProductCard({ p, onClickAdd, isSelected = false, onSelect, showCheckbox = false }: Props) {
  const [showImage, setShowImage] = useState(false);
  const isMobile = useIsMobile();
  let inWishlist = false;
  let addToWishlist: (p: Product) => void = () => {};
  let removeFromWishlist: (id: number) => void = () => {};
  
  // Cart functionality
  let cartQuantity = 0;
  let addToCart: (product: Product, qty?: number) => Promise<void> = async () => {};
  let setCartQty: (productId: number, qty: number) => void = () => {};
  let removeFromCart: (productId: number) => void = () => {};
  
  try {
    const wishlist = useWishlist();
    inWishlist = wishlist.isInWishlist(p.id);
    addToWishlist = wishlist.addToWishlist;
    removeFromWishlist = wishlist.removeFromWishlist;
  } catch {
    // Not in WishlistProvider - that's okay
  }
  
  try {
    const cart = useCart();
    const cartLine = cart.lines.find(l => l.product.id === p.id);
    cartQuantity = cartLine?.quantity || 0;
    addToCart = cart.add;
    setCartQty = cart.setQty;
    removeFromCart = cart.remove;
  } catch {
    // Not in CartProvider - that's okay, use onClickAdd fallback
  }

  return (
    <>
      <div 
        className="card" 
        data-mobile={isMobile ? "true" : "false"}
        style={{ 
          width: "100%",
          maxWidth: "100%",
          position: "relative",
          padding: isMobile ? 12 : 0,
          boxSizing: "border-box",
          overflow: "hidden",
          background: "transparent",
        }}
      >
        <div 
          className="image-wrap" 
          style={{ 
            position: "relative",
            width: "100%",
            aspectRatio: "5/6",
            height: "auto",
            marginBottom: isMobile ? 12 : 16,
            cursor: "zoom-in",
            borderRadius: isMobile ? 8 : 12,
            overflow: "hidden",
            background: "#fff",
          }}
        >
          {/* Selection checkbox */}
          {showCheckbox && (
            <button
              className="product-checkbox-btn"
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(p.id, !isSelected);
              }}
              style={{
                position: "absolute",
                borderRadius: 0,
                border: `2px solid ${isSelected ? "#b08d57" : "#fff"}`,
                background: isSelected ? "#b08d57" : "rgba(255,255,255,0.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                zIndex: 3,
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                transition: "all 0.2s ease",
              }}
              aria-label={isSelected ? "Deselect product" : "Select product"}
            >
              {isSelected && (
                <svg className="checkbox-icon" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )}

          {/* Wishlist button */}
          <button
            className="product-wishlist-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (inWishlist) {
                removeFromWishlist(p.id);
              } else {
                addToWishlist(p);
              }
            }}
            style={{
              position: "absolute",
              top: isMobile ? 8 : 12,
              right: isMobile ? 8 : 12,
              background: "rgba(255,255,255,0.98)",
              border: isMobile ? "none" : "1px solid rgba(0,0,0,0.08)",
              borderRadius: "50%",
              width: isMobile ? 36 : 40,
              height: isMobile ? 36 : 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: isMobile ? "0 2px 8px rgba(0,0,0,0.1)" : "0 2px 6px rgba(0,0,0,0.1)",
              zIndex: 2,
              transition: "all 0.2s ease",
            }}
            aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.98)";
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = isMobile ? "0 2px 8px rgba(0,0,0,0.1)" : "0 2px 6px rgba(0,0,0,0.1)";
            }}
          >
            <svg
              className="wishlist-icon"
              viewBox="0 0 24 24"
              fill={inWishlist ? "#e74c3c" : "none"}
              stroke={inWishlist ? "#e74c3c" : "#666"}
              strokeWidth="2"
              width={isMobile ? 18 : 20}
              height={isMobile ? 18 : 20}
              style={{ transition: "all 0.2s ease" }}
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
          </button>

          {/* Live badge */}
          {p.is_live_stock && (
            <div
              style={{
                position: "absolute",
                top: isMobile ? 8 : 12,
                left: isMobile ? 8 : 12,
                display: "flex",
                alignItems: "center",
                gap: isMobile ? 5 : 6,
                background: "rgba(255,255,255,0.98)",
                padding: isMobile ? "5px 10px" : "6px 12px",
                borderRadius: 20,
                boxShadow: isMobile ? "0 2px 8px rgba(0,0,0,0.1)" : "0 2px 6px rgba(0,0,0,0.1)",
                zIndex: 1,
                border: isMobile ? "none" : "1px solid rgba(192, 57, 43, 0.1)",
              }}
            >
              <span
                style={{
                  width: isMobile ? 7 : 8,
                  height: isMobile ? 7 : 8,
                  borderRadius: "50%",
                  backgroundColor: "#ff4757",
                  display: "inline-block",
                  animation: "pulse 2s infinite",
                }}
              />
              <span style={{ 
                fontSize: isMobile ? 11 : 12, 
                fontWeight: 600, 
                color: "#c0392b",
                letterSpacing: "0.2px",
              }}>
                Live
              </span>
            </div>
          )}

          <div onClick={() => setShowImage(true)} style={{ width: "100%", height: "100%" }}>
            <ImageWithPlaceholder
              src={p.image_url}
              alt={p.name ? `Product: ${p.name}` : `Product #${p.id}`}
              style={{ 
                width: "100%", 
                height: "100%", 
                objectFit: "cover",
                borderRadius: isMobile ? 8 : 12,
              }}
            />
          </div>
        </div>

        {/* Weight - prominent like price in reference */}
        <div className="product-weight-section" style={{ 
          marginBottom: 0,
          padding: 0,
        }}>
          <span 
            className="product-weight" 
            style={{ 
              fontSize: isMobile ? 18 : 20,
              fontWeight: 500, 
              color: "#333",
              lineHeight: 1.2,
              letterSpacing: "0.2px",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
          >
            {typeof p.weight === "number" ? `${p.weight.toFixed(2)} gm` : "—"}
          </span>
        </div>

        {/* Category and Subcategory - smaller text */}
        {(p.category_name || p.subcategory_name) && (
          <div className="product-category" style={{ 
            marginBottom: 0, 
            padding: 0,
            fontSize: isMobile ? 12 : 13,
            color: "#666",
            fontWeight: 400,
            lineHeight: 1.4,
          }}>
            {p.subcategory_name 
              ? `${p.subcategory_name}${p.category_name ? ` (${p.category_name})` : ''}`
              : p.category_name 
                ? p.category_name
                : ''}
          </div>
        )}

        {/* Design ID - subtle */}
        <div style={{ marginBottom: 0, padding: 0 }}>
          <span className="product-design-id" style={{ 
            color: "#999", 
            fontWeight: 400,
            fontSize: isMobile ? 11 : 12,
          }}>
            ID #{p.id}
          </span>
        </div>

        {cartQuantity > 0 ? (
          /* Quantity Controls - Amazon style */
          <div 
            className="product-quantity-controls"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: isMobile ? 8 : 12,
              width: "100%",
              padding: isMobile ? "4px 8px" : "8px 12px",
              background: "#fff",
              border: isMobile ? "2px solid #b08d57" : "1px solid #b08d57",
              borderRadius: isMobile ? 8 : 6,
            }}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (cartQuantity > 1) {
                  setCartQty(p.id, cartQuantity - 1);
                } else {
                  removeFromCart(p.id);
                }
              }}
              style={{
                background: "#b08d57",
                color: "#fff",
                border: "none",
                borderRadius: isMobile ? 4 : 6,
                width: isMobile ? 28 : 36,
                height: isMobile ? 28 : 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: isMobile ? 16 : 20,
                fontWeight: 600,
                transition: "all 0.2s ease",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#8b6641";
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#b08d57";
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              }}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span
              style={{
                fontSize: isMobile ? 14 : 16,
                fontWeight: 700,
                color: "#b08d57",
                minWidth: isMobile ? 24 : 32,
                textAlign: "center",
              }}
            >
              {cartQuantity}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCartQty(p.id, cartQuantity + 1);
              }}
              style={{
                background: "#b08d57",
                color: "#fff",
                border: "none",
                borderRadius: isMobile ? 4 : 6,
                width: isMobile ? 28 : 36,
                height: isMobile ? 28 : 36,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: isMobile ? 16 : 20,
                fontWeight: 600,
                transition: "all 0.2s ease",
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#8b6641";
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "#b08d57";
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
              }}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        ) : (
          /* Add to Cart Button */
          <button
            className="btn product-add-btn"
            style={{ 
              width: "100%",
              background: "#fff",
              border: isMobile ? "2px solid #b08d57" : "1px solid #b08d57",
              color: "#b08d57",
              fontWeight: isMobile ? 600 : 500,
              textTransform: "uppercase",
              borderRadius: isMobile ? 8 : 6,
              cursor: "pointer",
              transition: "all 0.2s ease",
              padding: isMobile ? "8px 12px" : "10px 20px",
              fontSize: isMobile ? 11 : 13,
              letterSpacing: "0.5px",
              fontFamily: "system-ui, -apple-system, sans-serif",
            }}
            onMouseEnter={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.background = "#b08d57";
              btn.style.color = "#fff";
              btn.style.borderColor = "#b08d57";
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.background = "#fff";
              btn.style.color = "#b08d57";
              btn.style.borderColor = "#b08d57";
            }}
            onTouchStart={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              btn.style.background = "#b08d57";
              btn.style.color = "#fff";
              btn.style.borderColor = "#b08d57";
              btn.style.transform = "none";
              btn.style.padding = isMobile ? "8px 12px" : "10px 20px";
            }}
            onTouchEnd={(e) => {
              const btn = e.currentTarget as HTMLButtonElement;
              // Keep the hover state briefly, then revert
              setTimeout(() => {
                btn.style.background = "#fff";
                btn.style.color = "#b08d57";
                btn.style.borderColor = "#b08d57";
                btn.style.transform = "none";
                btn.style.padding = isMobile ? "8px 12px" : "10px 20px";
              }, 150);
            }}
            onClick={(e) => {
              e.stopPropagation();
              if (addToCart) {
                addToCart(p, 1);
              } else {
                onClickAdd?.(p);
              }
            }}
            aria-label={`Add product ${p.id} to cart`}
          >
            Add to Cart
          </button>
        )}

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          /* Override CSS rules for desktop product card */
          @media (min-width: 769px) {
            .card .product-weight-section {
              margin-bottom: 0 !important;
              padding: 0 !important;
            }
            .card .product-weight {
              font-size: 20px !important;
              font-weight: 500 !important;
            }
            .card .product-category {
              font-size: 13px !important;
              margin-bottom: 0 !important;
              padding: 0 !important;
            }
            .card .product-design-id {
              font-size: 12px !important;
            }
            .card > div:has(> .product-design-id) {
              margin-bottom: 0 !important;
            }
          }
          /* Override CSS rules for mobile product card */
          @media (max-width: 768px) {
            .card .product-weight-section {
              margin-bottom: 0 !important;
              padding: 0 !important;
            }
            .card .product-weight {
              font-size: 18px !important;
              font-weight: 500 !important;
            }
            .card .product-category {
              font-size: 12px !important;
              margin-bottom: 0 !important;
              padding: 0 !important;
            }
            .card .product-design-id {
              font-size: 11px !important;
            }
            .card > div:has(> .product-design-id) {
              margin-bottom: 0 !important;
            }
          }
        `}</style>
      </div>

      {/* ✅ IMAGE POPUP MODAL */}
      {showImage && (
        <div
          onClick={() => setShowImage(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <img
            src={p.image_url ?? ""}
            alt=""
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              objectFit: "contain",
              borderRadius: 8,
              background: "#fff",
            }}
          />
        </div>
      )}
    </>
  );
}
