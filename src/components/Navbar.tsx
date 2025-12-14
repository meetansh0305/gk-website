import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Search, ShoppingBag, ClipboardList, User, LogOut, ChevronDown } from "lucide-react";

type Category = { id: number; name: string };
type Subcategory = { id: number; name: string; category_id: number };

export default function Navbar() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [subsByCat, setSubsByCat] = useState<Record<number, Subcategory[]>>({});
  const [q, setQ] = useState("");
  const [hoveredCat, setHoveredCat] = useState<number | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setUserEmail(data?.user?.email ?? null);
    })();
    loadCatsAndSubs();
  }, []);

  const loadCatsAndSubs = async () => {
    const { data: c } = await supabase.from("categories").select("*").order("name");
    setCats(c ?? []);
    const { data: s } = await supabase.from("subcategories").select("*").order("name");
    const map: Record<number, Subcategory[]> = {};
    (s ?? []).forEach((sc) => {
      map[sc.category_id] = map[sc.category_id] || [];
      map[sc.category_id].push(sc);
    });
    setSubsByCat(map);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUserEmail(null);
    navigate("/auth");
  };

  const doSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const term = q.trim().toLowerCase();
    if (!term) return;

    const { data: subMatch } = await supabase
      .from("subcategories")
      .select("id,name")
      .ilike("name", `%${term}%`)
      .limit(1);

    if (subMatch && subMatch.length) {
      navigate(`/subcategory/${subMatch[0].id}`);
      setQ("");
      return;
    }

    const { data: catMatch } = await supabase
      .from("categories")
      .select("id,name")
      .ilike("name", `%${term}%`)
      .limit(1);

    if (catMatch && catMatch.length) {
      navigate(`/category/${catMatch[0].id}`);
      setQ("");
      return;
    }

    alert("No matching category or subcategory found.");
  };

  return (
    <nav style={{ 
      background: "#fff", 
      borderBottom: "1px solid #e8e4dc",
      position: "sticky",
      top: 0,
      zIndex: 100
    }}>
      <div style={{ 
        maxWidth: 1200, 
        margin: "0 auto", 
        padding: "12px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 32
      }}>
        {/* Logo */}
        <NavLink to="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}>
          <img src="/logo.png" alt="GK" style={{ height: 40 }} />
          <div>
            <div style={{ 
              fontSize: 20, 
              fontWeight: 700, 
              color: "#a67c52",
              letterSpacing: 0.5,
              lineHeight: 1.1
            }}>
              Gurukrupa Jewellers
            </div>
            <div style={{ 
              fontSize: 10, 
              color: "#999",
              letterSpacing: 3,
              textTransform: "uppercase"
            }}>
              Since 2000
            </div>
          </div>
        </NavLink>

        {/* Search */}
        <form onSubmit={doSearch} style={{ flex: 1, maxWidth: 480 }}>
          <div style={{ 
            display: "flex",
            alignItems: "center",
            background: "#f5f3ef",
            borderRadius: 40,
            padding: "10px 20px",
            gap: 10,
            border: "1px solid transparent",
            transition: "border-color 0.2s"
          }}>
            <Search size={18} style={{ color: "#888" }} />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search categories, collections..."
              style={{ 
                flex: 1,
                border: "none",
                background: "transparent",
                outline: "none",
                fontSize: 14,
                color: "#333"
              }}
            />
          </div>
        </form>

        {/* Right Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <NavLink 
            to="/cart" 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 6,
              textDecoration: "none",
              color: "#555",
              fontSize: 14,
              fontWeight: 500,
              transition: "color 0.2s"
            }}
          >
            <ShoppingBag size={20} />
            <span>Cart</span>
          </NavLink>

          <NavLink 
            to="/orders" 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 6,
              textDecoration: "none",
              color: "#555",
              fontSize: 14,
              fontWeight: 500
            }}
          >
            <ClipboardList size={20} />
            <span>Orders</span>
          </NavLink>

          <NavLink 
            to="/profile" 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 6,
              textDecoration: "none",
              color: "#555",
              fontSize: 14,
              fontWeight: 500
            }}
          >
            <User size={20} />
            <span>Profile</span>
          </NavLink>

          {userEmail ? (
            <button
              onClick={logout}
              style={{ 
                background: "#a67c52",
                color: "#fff",
                border: "none",
                padding: "10px 20px",
                borderRadius: 24,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 6,
                transition: "background 0.2s"
              }}
            >
              <LogOut size={16} />
              Logout
            </button>
          ) : (
            <NavLink
              to="/auth"
              style={{
                background: "#a67c52",
                color: "#fff",
                textDecoration: "none",
                padding: "10px 24px",
                borderRadius: 24,
                fontSize: 13,
                fontWeight: 600
              }}
            >
              Login
            </NavLink>
          )}
        </div>
      </div>

      {/* Category Navigation */}
      <div style={{ 
        background: "#faf9f7", 
        borderTop: "1px solid #f0ece4",
        padding: "0 24px"
      }}>
        <div style={{ 
          maxWidth: 1200, 
          margin: "0 auto",
          display: "flex",
          gap: 8
        }}>
          <NavLink
            to="/products"
            style={{
              padding: "12px 18px",
              fontSize: 13,
              fontWeight: 600,
              color: "#555",
              textDecoration: "none",
              letterSpacing: 0.5,
              transition: "color 0.2s",
              borderBottom: "2px solid transparent"
            }}
          >
            All Products
          </NavLink>

          {cats.map((cat) => (
            <div
              key={cat.id}
              style={{ position: "relative" }}
              onMouseEnter={() => setHoveredCat(cat.id)}
              onMouseLeave={() => setHoveredCat(null)}
            >
              <div
                onClick={() => navigate(`/category/${cat.id}`)}
                style={{
                  padding: "12px 18px",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#555",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  letterSpacing: 0.5,
                  transition: "color 0.2s",
                  borderBottom: hoveredCat === cat.id ? "2px solid #a67c52" : "2px solid transparent"
                }}
              >
                {cat.name}
                {subsByCat[cat.id]?.length > 0 && <ChevronDown size={14} />}
              </div>

              {/* Dropdown */}
              {hoveredCat === cat.id && subsByCat[cat.id]?.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    background: "#fff",
                    minWidth: 200,
                    boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
                    borderRadius: 12,
                    padding: "8px 0",
                    zIndex: 50
                  }}
                >
                  {subsByCat[cat.id].map((sub) => (
                    <div
                      key={sub.id}
                      onClick={() => {
                        navigate(`/subcategory/${sub.id}`);
                        setHoveredCat(null);
                      }}
                      style={{
                        padding: "10px 20px",
                        fontSize: 13,
                        color: "#444",
                        cursor: "pointer",
                        transition: "background 0.15s"
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f3ef")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      {sub.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}
