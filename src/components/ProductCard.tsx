import React, { useState } from "react";

type Product = {
  id: number;
  image_url: string | null;
  weight?: number | null;
  is_live_stock?: boolean;
};

type Props = {
  p: Product;
  onClickAdd?: (product: Product) => void;
};

export default function ProductCard({ p, onClickAdd }: Props) {
  const [showImage, setShowImage] = useState(false); // ✅ added

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
          {/* Live badge */}
          {p.is_live_stock && (
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
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
            alt=""
            style={{ 
              width: "100%", 
              height: "100%", 
              objectFit: "cover",
              borderRadius: 8,
            }}
            onClick={() => setShowImage(true)} // ✅ added
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
