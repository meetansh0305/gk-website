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

    // First try product search
    const { data: productMatch } = await supabase
      .from("products")
      .select("id, subcategory_id, category_id")
      .or(`name.ilike.%${term}%,id.eq.${isNaN(Number(term)) ? -1 : Number(term)}`)
      .limit(10);

    if (productMatch && productMatch.length > 0) {
      // Navigate to products page with search term
      navigate(`/products?search=${encodeURIComponent(term)}`);
      setQ("");
      return;
    }

    // Then try subcategory
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

    // Then try category
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

    // Navigate to products page with search term anyway
    navigate(`/products?search=${encodeURIComponent(term)}`);
    setQ("");
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
              placeholder="Search products, categories, collections..."
              aria-label="Search products, categories, and collections"
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
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
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
            aria-label="Shopping cart"
          >
            <ShoppingBag size={20} aria-hidden="true" />
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
            aria-label="My orders"
          >
            <ClipboardList size={20} aria-hidden="true" />
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
            aria-label="My profile"
          >
            <User size={20} aria-hidden="true" />
            <span>Profile</span>
          </NavLink>
          
          <NavLink 
            to="/wishlist" 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 6,
              textDecoration: "none",
              color: "#555",
              fontSize: 14,
              fontWeight: 500
            }}
            aria-label="My wishlist"
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span>Wishlist</span>
          </NavLink>
          
          <NavLink 
            to="/contact" 
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: 6,
              textDecoration: "none",
              color: "#555",
              fontSize: 14,
              fontWeight: 500
            }}
            aria-label="Contact us"
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Contact</span>
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
              aria-label="Logout"
            >
              <LogOut size={16} aria-hidden="true" />
              <span>Logout</span>
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
        padding: "0 24px",
        overflowX: "auto"
      }}>
        <div style={{ 
          maxWidth: 1200, 
          margin: "0 auto",
          display: "flex",
          gap: 8,
          minWidth: "max-content"
        }}>
          <NavLink
            to="/"
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
            Home
          </NavLink>

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
