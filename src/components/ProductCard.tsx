import React from "react";

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
  return (
    <div className="card" style={{ width: 300, position: "relative" }}>
      <div className="image-wrap" style={{ position: "relative" }}>
        {/* OPTION C — dot badge */}
        {p.is_live_stock && (
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "rgba(255,255,255,0.9)",
              padding: "4px 8px",
              borderRadius: 40,
              boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "red",
                display: "inline-block",
              }}
            />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#b70000" }}>
              Live
            </span>
          </div>
        )}

        <img
          className="product"
          src={p.image_url ?? ""}
          alt=""
          style={{ width: "100%", height: 260, objectFit: "cover" }}
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              "https://images.unsplash.com/photo-1606313564200-e75d5e30476e?q=80&w=1200&auto=format&fit=crop";
          }}
        />
      </div>

      {typeof p.weight === "number" && (
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
          {p.weight.toFixed(2)} g
        </div>
      )}

      <button
        className="btn primary"
        style={{ marginTop: 10 }}
        onClick={() => onClickAdd?.(p)}
      >
        Add to Cart
      </button>
    </div>
  );
}
