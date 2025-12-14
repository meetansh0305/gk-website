import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type Category = { id: number; name: string; banner_url?: string | null };
type Subcategory = { id: number; name: string; category_id: number };

export default function CategoryLanding() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const [cat, setCat] = useState<Category | null>(null);
  const [subs, setSubs] = useState<Array<Subcategory & { preview_url: string | null }>>([]);

  useEffect(() => {
    if (!categoryId) return;
    (async () => {
      const { data: c } = await supabase
        .from("categories")
        .select("id,name,banner_url")
        .eq("id", Number(categoryId))
        .single();
      setCat(c ?? null);

      const { data: s } = await supabase
        .from("subcategories")
        .select("id,name,category_id")
        .eq("category_id", Number(categoryId))
        .order("name");

      const enriched: Array<Subcategory & { preview_url: string | null }> = [];
      for (const sc of s ?? []) {
        const { data: prod } = await supabase
          .from("products")
          .select("id,image_url")
          .eq("subcategory_id", sc.id)
          .order("id", { ascending: true })
          .limit(1);
        enriched.push({
          ...sc,
          preview_url: prod?.[0]?.image_url ?? null,
        });
      }
      setSubs(enriched);
    })();
  }, [categoryId]);

  const bannerUrl = cat?.banner_url ?? "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1600&auto=format&fit=crop";

  return (
    <div>
      {/* Premium Category Banner */}
      <div
        style={{
          width: "100%",
          height: 320,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `url('${bannerUrl}') center/cover no-repeat`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(135deg, rgba(7, 30, 51, 0.6) 0%, rgba(7, 30, 51, 0.2) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "6%",
            bottom: 40,
            zIndex: 1,
          }}
        >
          <p style={{ color: "#d4af37", fontSize: 12, letterSpacing: 2, marginBottom: 8, fontWeight: 500 }}>
            COLLECTION
          </p>
          <h1
            style={{
              color: "#fff",
              fontSize: 40,
              fontWeight: 700,
              margin: 0,
              fontFamily: "'Playfair Display', Georgia, serif",
              textShadow: "0 2px 20px rgba(0,0,0,0.3)",
            }}
          >
            Fine {cat?.name} Jewellery
          </h1>
        </div>
      </div>

      <div className="container">
        <h2 className="section-title" style={{ marginTop: 28 }}>
          Explore {cat?.name}
        </h2>
        <div className="grid">
          {subs.map((s) => (
            <div 
              key={s.id} 
              className="card" 
              style={{ 
                cursor: "pointer", 
                textAlign: "center",
                padding: 16,
              }} 
              onClick={() => navigate(`/subcategory/${s.id}`)}
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
                  src={s.preview_url ?? "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1200&auto=format&fit=crop"} 
                  alt={s.name}
                />
              </div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#333", marginBottom: 4 }}>
                {s.name}
              </div>
              <div style={{ fontSize: 13, color: "#b08d57", fontWeight: 500 }}>
                Explore Collection →
              </div>
            </div>
          ))}
          {subs.length === 0 && (
            <div style={{ textAlign: "center", padding: 40, color: "#666" }}>
              No subcategories yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
