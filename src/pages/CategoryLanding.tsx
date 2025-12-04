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

  return (
    <div>
      <div
        style={{
          width: "100%",
          height: 320,
          background: `url('${cat?.banner_url ?? "https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?q=80&w=1600&auto=format&fit=crop"}') center/cover no-repeat`,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div style={{ marginLeft: "6%", background: "rgba(255,255,255,.9)", padding: "12px 16px", borderRadius: 12, fontWeight: 800 }}>
          Fine {cat?.name} Jewellery
        </div>
      </div>

      <div className="container">
        <h2 className="section-title">Explore {cat?.name}</h2>
        <div className="grid">
          {subs.map((s) => (
            <div key={s.id} className="card" style={{ cursor: "pointer", textAlign: "center" }} onClick={() => navigate(`/subcategory/${s.id}`)}>
              <div className="image-wrap">
                <img className="product" src={s.preview_url ?? "https://images.unsplash.com/photo-1606313564200-e75d5e30476e?q=80&w=1200&auto=format&fit=crop"} alt={s.name}/>
              </div>
              <div style={{ fontWeight: 700 }}>{s.name}</div>
            </div>
          ))}
          {subs.length === 0 && <p>No subcategories yet.</p>}
        </div>
      </div>
    </div>
  );
}
