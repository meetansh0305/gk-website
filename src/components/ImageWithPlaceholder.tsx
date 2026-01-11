import { useState } from "react";

interface ImageWithPlaceholderProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}

export default function ImageWithPlaceholder({
  src,
  alt,
  className,
  style,
  placeholder = "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=400&auto=format&fit=crop",
}: ImageWithPlaceholderProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const imageSrc = src || placeholder;
  const displaySrc = error ? placeholder : imageSrc;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        background: "#f5f5f5",
        ...style,
      }}
      className={className}
    >
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f5f5f5",
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              border: "3px solid #e0e0e0",
              borderTop: "3px solid var(--accent, #b08d57)",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
      <img
        src={displaySrc}
        alt={alt}
        onLoad={() => setLoading(false)}
        onError={() => {
          setError(true);
          setLoading(false);
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: loading ? 0 : 1,
          transition: "opacity 0.3s ease-in-out",
        }}
      />
    </div>
  );
}










