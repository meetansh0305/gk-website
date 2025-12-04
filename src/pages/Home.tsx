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
      {/* ✅ CLEAN RESPONSIVE HERO BANNER */}
      <div
        style={{
          width: "100%",
          height: "100vh",
          minHeight: 280,
          maxHeight: 565,
          backgroundImage: "url('/banner.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      ></div>

      {/* CATEGORY GRID */}
      <div className="container" style={{ display: "grid", gap: 28 }}>
        {cats.map((c) => (
          <section key={c.id}>
            <div
              onClick={() => navigate(`/category/${c.id}`)}
              style={{
                cursor: "pointer",
                fontSize: 22,
                fontWeight: 900,
                marginBottom: 12,
              }}
            >
              {c.name}
            </div>

            <div className="grid">
              {(tilesByCat[c.id] ?? []).map((t) => (
                <div
                  key={t.id}
                  className="card"
                  style={{ cursor: "pointer", textAlign: "center" }}
                  onClick={() => navigate(`/subcategory/${t.id}`)}
                >
                  <div className="image-wrap">
                    <img
                      className="product"
                      src={
                        t.preview_url ??
                        "https://images.unsplash.com/photo-1606313564200-e75d5e30476e"
                      }
                      alt={t.name}
                    />
                  </div>
                  <div style={{ fontWeight: 700 }}>{t.name}</div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
