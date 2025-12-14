import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Categories() {
  const [categories, setCategories] = useState<any[]>([]);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error loading categories:", error);
      return;
    }

    setCategories(data ?? []);
  };

  return (
    <div style={{ 
      paddingTop: 80, 
      paddingBottom: 100,
      background: "#fafafa"
    }}>
      <div className="container" style={{ maxWidth: 1400 }}>
        {/* Minimal Header */}
        <div style={{ 
          textAlign: "center", 
          marginBottom: 80,
          maxWidth: 600,
          margin: "0 auto 80px auto"
        }}>
          <h1 style={{ 
            fontSize: 48, 
            fontWeight: 300,
            marginBottom: 20,
            color: "#1a1a1a",
            letterSpacing: "-1px"
          }}>
            Our Collections
          </h1>
          <div style={{ 
            height: 1, 
            width: 60, 
            background: "#c9a227",
            margin: "0 auto 24px auto"
          }}></div>
          <p style={{ 
            fontSize: 15, 
            color: "#666",
            lineHeight: 1.8,
            fontWeight: 300,
            letterSpacing: "0.3px"
          }}>
            Discover exquisite craftsmanship in every piece, curated to celebrate life's most precious moments
          </p>
        </div>

        {categories.length === 0 && (
          <p style={{ 
            textAlign: "center", 
            color: "#999", 
            fontSize: 15,
            fontWeight: 300
          }}>
            Our collections are being curated for you
          </p>
        )}

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: 2,
          maxWidth: 1400,
          margin: "0 auto"
        }}>
          {categories.map((category) => (
            <div
              key={category.id}
              style={{ 
                cursor: "pointer",
                background: "#fff",
                position: "relative",
                overflow: "hidden",
                height: 480,
                border: "1px solid #e8e8e8"
              }}
              onClick={() => navigate(`/categories/${category.id}`)}
              onMouseEnter={() => setHoveredId(category.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {/* Background Image */}
              <div style={{
                position: "absolute",
                inset: 0,
                background: `linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.5)), url('https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1200&auto=format&fit=crop') center/cover`,
                transition: "transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)",
                transform: hoveredId === category.id ? "scale(1.1)" : "scale(1)"
              }}></div>

              {/* Content */}
              <div style={{
                position: "relative",
                zIndex: 2,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: 48,
                color: "#fff"
              }}>
                <div style={{
                  transform: hoveredId === category.id ? "translateY(-10px)" : "translateY(0)",
                  transition: "transform 0.4s ease"
                }}>
                  <h2 style={{ 
                    fontWeight: 300, 
                    fontSize: 36,
                    marginBottom: 16,
                    letterSpacing: "-0.5px"
                  }}>
                    {category.name}
                  </h2>
                  
                  <div style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 12,
                    fontSize: 12,
                    letterSpacing: "2px",
                    textTransform: "uppercase",
                    borderBottom: "1px solid rgba(255,255,255,0.5)",
                    paddingBottom: 4,
                    opacity: hoveredId === category.id ? 1 : 0,
                    transform: hoveredId === category.id ? "translateY(0)" : "translateY(5px)",
                    transition: "all 0.4s ease"
                  }}>
                    Explore Collection
                    <span style={{ 
                      fontSize: 16,
                      transform: hoveredId === category.id ? "translateX(5px)" : "translateX(0)",
                      transition: "transform 0.4s ease"
                    }}>→</span>
                  </div>
                </div>
              </div>

              {/* Border highlight on hover */}
              <div style={{
                position: "absolute",
                inset: 0,
                border: `2px solid ${hoveredId === category.id ? "#c9a227" : "transparent"}`,
                transition: "border-color 0.4s ease",
                pointerEvents: "none"
              }}></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}