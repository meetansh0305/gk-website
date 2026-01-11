import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function PromotionalBanner() {
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem("promo-banner-dismissed") === "true";
  });
  const navigate = useNavigate();

  const handleEnroll = () => {
    // Navigate to products page or a plan page
    navigate("/products");
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    localStorage.setItem("promo-banner-dismissed", "true");
  };

  if (dismissed) return null;

  return (
    <div className="promotional-banner">
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px",
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        margin: "16px",
        gap: 12,
        position: "relative",
      }}>
        <button
          onClick={handleDismiss}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "transparent",
            border: "none",
            fontSize: 18,
            color: "#999",
            cursor: "pointer",
            padding: 4,
            lineHeight: 1,
            width: 24,
            height: 24,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          ×
        </button>
        <div style={{ flex: 1, paddingRight: 8 }}>
          <div style={{
            fontSize: 14,
            fontWeight: 600,
            color: "#333",
            marginBottom: 4,
            lineHeight: 1.4,
          }}>
            Gold Mine <strong>10 + 1</strong> Monthly Plan
          </div>
          <div style={{
            fontSize: 11,
            color: "#666",
            lineHeight: 1.4,
          }}>
            Pay 10 installments & enjoy 100% savings on the 11th month!
          </div>
        </div>
        <button
          onClick={handleEnroll}
          style={{
            background: "#b08d57",
            color: "#fff",
            border: "none",
            borderRadius: 20,
            padding: "10px 20px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#8b6914";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "#b08d57";
          }}
        >
          Enroll Now
        </button>
      </div>
    </div>
  );
}

