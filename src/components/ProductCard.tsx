import React, { useState } from "react";
import { useWishlist } from "../state/WishlistContext";

type Product = {
  id: number;
  image_url: string | null;
  weight?: number | null;
  name?: string | null;
  is_live_stock?: boolean;
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
  let inWishlist = false;
  let addToWishlist: (p: Product) => void = () => {};
  let removeFromWishlist: (id: number) => void = () => {};
  
  try {
    const wishlist = useWishlist();
    inWishlist = wishlist.isInWishlist(p.id);
    addToWishlist = wishlist.addToWishlist;
    removeFromWishlist = wishlist.removeFromWishlist;
  } catch {
    // Not in WishlistProvider - that's okay
  }

  return (
    <>
      <div 
        className="card" 
        style={{ 
          width: "100%",
          maxWidth: 280,
          position: "relative",
          padding: 12,
        }}
      >
        <div 
          className="image-wrap" 
          style={{ 
            position: "relative",
            width: "100%",
            aspectRatio: "1/1",
            height: "auto",
            marginBottom: 12,
            cursor: "zoom-in", // ✅ added
          }}
        >
          {/* Selection checkbox */}
          {showCheckbox && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSelect?.(p.id, !isSelected);
              }}
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                width: 28,
                height: 28,
                borderRadius: 6,
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
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )}

          {/* Wishlist button */}
          <button
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
              top: 8,
              right: 8,
              background: "rgba(255,255,255,0.95)",
              border: "none",
              borderRadius: "50%",
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              zIndex: 2,
              transition: "all 0.2s ease",
            }}
            aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.95)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            <svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill={inWishlist ? "#e74c3c" : "none"}
              stroke={inWishlist ? "#e74c3c" : "currentColor"}
              strokeWidth="2"
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
                top: 8,
                left: 8,
                display: "flex",
                alignItems: "center",
                gap: 5,
                background: "rgba(255,255,255,0.95)",
                padding: "5px 10px",
                borderRadius: 20,
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                zIndex: 1,
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: "#ff4757",
                  display: "inline-block",
                  animation: "pulse 2s infinite",
                }}
              />
              <span style={{ fontSize: 11, fontWeight: 600, color: "#c0392b" }}>
                Live
              </span>
            </div>
          )}

          <img
            className="product"
            src={p.image_url ?? ""}
            alt={p.name ? `Product: ${p.name}` : `Product #${p.id}`}
            loading="lazy"
            style={{ 
              width: "100%", 
              height: "100%", 
              objectFit: "cover",
              borderRadius: 8,
            }}
            onClick={() => setShowImage(true)}
            onLoad={(e) => {
              (e.target as HTMLImageElement).classList.add("loaded");
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://images.unsplash.com/photo-1606313564200-e75d5e30476e?q=80&w=1200&auto=format&fit=crop";
            }}
          />
        </div>

        {/* Weight display */}
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: 10,
          padding: "0 4px",
        }}>
          <span style={{ fontSize: 12, color: "#888", fontWeight: 500 }}>WEIGHT</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#333" }}>
            {typeof p.weight === "number" ? `${p.weight.toFixed(3)} grams` : "—"}
          </span>
        </div>

        <button
          className="btn"
          style={{ 
            width: "100%",
            padding: "12px 16px",
            background: "#fff",
            border: "2px solid #b08d57",
            color: "#b08d57",
            fontWeight: 600,
            fontSize: 13,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            borderRadius: 6,
            cursor: "pointer",
            transition: "all 0.2s ease",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.background = "#b08d57";
            (e.target as HTMLButtonElement).style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.background = "#fff";
            (e.target as HTMLButtonElement).style.color = "#b08d57";
          }}
          onClick={() => onClickAdd?.(p)}
          aria-label={`Add product ${p.id} to cart`}
        >
          Add to Cart
        </button>

        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
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
