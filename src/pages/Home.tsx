import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

type Category = { id: number; name: string; banner_url?: string | null };
type Tile = { id: number; name: string; category_id: number; preview_url?: string | null };

export default function Home() {
  const [cats, setCats] = useState<Category[]>([]);
  const [tilesByCat, setTilesByCat] = useState<Record<number, Tile[]>>({});
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data: categories } = await supabase
        .from("categories")
        .select("id,name,banner_url")
        .order("name");
      setCats(categories ?? []);

      const { data: subs } = await supabase
        .from("subcategories")
        .select("id,name,category_id")
        .order("name");

      const map: Record<number, Tile[]> = {};
      for (const sc of subs ?? []) {
        const { data: prod } = await supabase
          .from("products")
          .select("id,image_url")
          .eq("subcategory_id", sc.id)
          .order("id")
          .limit(1);

        const preview = prod?.[0]?.image_url ?? null;

        map[sc.category_id] = map[sc.category_id] || [];
        map[sc.category_id].push({
          id: sc.id,
          name: sc.name,
          category_id: sc.category_id,
          preview_url: preview,
        });
      }
      setTilesByCat(map);
    })();
  }, []);

  return (
    <div>
      {/* HERO BANNER with reduced overlay */}
      <div
        style={{
          width: "100%",
          height: "70vh",
          minHeight: 400,
          maxHeight: 600,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "url('/banner.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        {/* Subtle gradient overlay - less yellow, more neutral */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(26, 26, 26, 0.5) 0%, rgba(26, 26, 26, 0.2) 50%, transparent 100%)",
          }}
        />
        
        {/* Hero content */}
        <div
          style={{
            position: "absolute",
            left: "6%",
            top: "50%",
            transform: "translateY(-50%)",
            maxWidth: 500,
          }}
        >
          <div style={{ 
            fontSize: 12, 
            color: "#d4af37", 
            letterSpacing: 3, 
            marginBottom: 12,
            fontWeight: 500,
          }}>
            ✦ EXQUISITE CRAFTSMANSHIP
          </div>
          <h1 style={{ 
            fontSize: 48, 
            fontWeight: 700, 
            color: "#fff", 
            margin: "0 0 8px 0",
            lineHeight: 1.1,
            fontFamily: "'Playfair Display', Georgia, serif",
            textShadow: "0 2px 20px rgba(0,0,0,0.3)",
          }}>
            Timeless Elegance,
          </h1>
          <h1 style={{ 
            fontSize: 48, 
            fontWeight: 700, 
            color: "#d4af37", 
            margin: "0 0 20px 0",
            lineHeight: 1.1,
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: "italic",
            textShadow: "0 2px 20px rgba(0,0,0,0.3)",
          }}>
            Crafted for You
          </h1>
          <p style={{ 
            fontSize: 16, 
            color: "rgba(255,255,255,0.9)", 
            marginBottom: 28,
            lineHeight: 1.6,
            textShadow: "0 1px 10px rgba(0,0,0,0.3)",
          }}>
            Discover our exclusive collection of handcrafted jewelry, where tradition meets modern elegance.
          </p>
          
          <div style={{ display: "flex", gap: 14 }}>
            <button
              onClick={() => navigate("/products")}
              style={{
                background: "#b08d57",
                color: "#fff",
                border: "none",
                padding: "14px 28px",
                borderRadius: 30,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            >
              Explore Collection
            </button>
            <button
              onClick={() => navigate("/live")}
              style={{
                background: "rgba(255,255,255,0.15)",
                color: "#fff",
                border: "2px solid rgba(255,255,255,0.4)",
                padding: "14px 28px",
                borderRadius: 30,
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                gap: 8,
                transition: "all 0.3s ease",
              }}
            >
              Live Stock <span style={{ fontSize: 16 }}>✨</span>
            </button>
          </div>
        </div>
      </div>

      {/* CATEGORY GRID */}
      <div className="container" style={{ display: "grid", gap: 40, paddingTop: 20 }}>
        {cats.map((c) => (
          <section key={c.id}>
            <div
              onClick={() => navigate(`/category/${c.id}`)}
              style={{
                cursor: "pointer",
                fontSize: 24,
                fontWeight: 700,
                marginBottom: 16,
                color: "#071E33",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              {c.name}
              <span style={{ fontSize: 14, color: "#b08d57", fontWeight: 500 }}>→</span>
            </div>

            <div className="grid">
              {(tilesByCat[c.id] ?? []).map((t) => (
                <div
                  key={t.id}
                  className="card"
                  style={{ 
                    cursor: "pointer", 
                    textAlign: "center",
                    padding: 16,
                  }}
                  onClick={() => navigate(`/subcategory/${t.id}`)}
                >
                  <div 
                    style={{ 
                      width: "100%",
                      aspectRatio: "1/1",
                      borderRadius: 8,
                      overflow: "hidden",
                      marginBottom: 14,
                      background: "#f5f5f5",
                    }}
                  >
                    <img
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      src={
                        t.preview_url ??
                        "https://images.unsplash.com/photo-1606313564200-e75d5e30476e"
                      }
                      alt={t.name}
                    />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: "#333", marginBottom: 4 }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: 13, color: "#b08d57", fontWeight: 500 }}>
                    Explore Collection →
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
