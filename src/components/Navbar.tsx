import { useEffect, useState, useRef } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Search, ShoppingBag, ClipboardList, User, LogOut, ChevronDown, Heart, MessageCircle } from "lucide-react";

type Category = { id: number; name: string };
type Subcategory = { id: number; name: string; category_id: number };

export default function Navbar() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [subsByCat, setSubsByCat] = useState<Record<number, Subcategory[]>>({});
  const [q, setQ] = useState("");
  const [hoveredCat, setHoveredCat] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [searchFocused, setSearchFocused] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const hoverTimeoutRef = useRef<Record<number, NodeJS.Timeout | null>>({});

  useEffect(() => {
    // Check localStorage first (workaround for Supabase client hanging)
    const checkLocalStorageAuth = () => {
      const projectRef = import.meta.env.VITE_SUPABASE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
      if (projectRef) {
        const storageKey = `sb-${projectRef}-auth-token`;
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          try {
            const sessionData = JSON.parse(stored);
            if (sessionData.user?.email) {
              setUserEmail(sessionData.user.email);
              return true;
            }
          } catch (e) {
            console.error("Navbar: Error parsing stored session:", e);
          }
        }
      }
      return false;
    };
    
    // Check localStorage first
    if (checkLocalStorageAuth()) {
      // Found in localStorage, skip Supabase call
    } else {
      // Try Supabase with timeout
      (async () => {
        try {
          const userPromise = supabase.auth.getUser();
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("getUser timeout")), 2000);
          });
          const { data } = await Promise.race([userPromise, timeoutPromise]) as any;
          setUserEmail(data?.user?.email ?? null);
        } catch (e: any) {
          if (e.message !== "getUser timeout") {
            console.error("Navbar: getUser error:", e);
          }
          // Fallback to localStorage check
          checkLocalStorageAuth();
        }
      })();
    }
    
    // Listen for custom auth change event (from manual login)
    const handleAuthChange = (e: any) => {
      if (e.detail?.email) {
        setUserEmail(e.detail.email);
      }
    };
    window.addEventListener('supabase-auth-change', handleAuthChange);
    
    // Listen for auth state changes (Supabase)
    let subscription: any = null;
    try {
      const { data: { subscription: sub } } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          setUserEmail(session.user.email ?? null);
        } else {
          setUserEmail(null);
        }
      });
      subscription = sub;
    } catch (e) {
      console.warn("Navbar: Could not set up auth state listener:", e);
    }
    
    loadCatsAndSubs();
    
    return () => {
      window.removeEventListener('supabase-auth-change', handleAuthChange);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
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
    navigate("/");
    setMobileMenuOpen(false);
  };

  const doSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const term = q.trim().toLowerCase();
    if (!term) return;

    const { data: productMatch } = await supabase
      .from("products")
      .select("id, subcategory_id, category_id")
      .or(`name.ilike.%${term}%,id.eq.${isNaN(Number(term)) ? -1 : Number(term)}`)
      .limit(10);

    if (productMatch && productMatch.length > 0) {
      navigate(`/products?search=${encodeURIComponent(term)}`);
      setQ("");
      return;
    }

    const { data: subMatch } = await supabase
      .from("subcategories")
      .select("id,name")
      .ilike("name", `%${term}%`)
      .limit(1);

    if (subMatch && subMatch.length) {
      navigate(`/category/${subMatch[0].category_id}?subcategory=${subMatch[0].id}`);
      setQ("");
      return;
    }

    const { data: catMatch } = await supabase
      .from("categories")
      .select("id,name")
      .ilike("name", `%${term}%`)
      .limit(1);

    if (catMatch && catMatch.length) {
      navigate(`/products?category=${catMatch[0].id}`);
      setQ("");
      return;
    }

    navigate(`/products?search=${encodeURIComponent(term)}`);
    setQ("");
  };

  const toggleCategory = (catId: number) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(catId)) {
      newExpanded.delete(catId);
    } else {
      newExpanded.add(catId);
    }
    setExpandedCategories(newExpanded);
  };

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="desktop-only" style={{ 
        background: "linear-gradient(to bottom, #ffffff 0%, #fefdfb 100%)", 
        borderBottom: "1px solid #e5e1da",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        width: "100%",
        zIndex: 1000,
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)"
      }}>
        {/* Top Bar */}
        <div style={{ 
          maxWidth: 1400, 
          margin: "0 auto", 
          padding: "3px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 40
        }}>
          {/* Logo */}
          <NavLink to="/" style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: 8, 
            textDecoration: "none",
            minWidth: "fit-content"
          }}>
            <img src="/logo.png" alt="GK" style={{ height: 24, filter: "drop-shadow(0 2px 4px rgba(166,124,82,0.15))" }} />
            <div>
              <div style={{ 
                fontSize: 15, 
                fontWeight: 700, 
                color: "#a67c52",
                letterSpacing: 0.6,
                lineHeight: 1.2,
                fontFamily: "Georgia, serif"
              }}>
                Gurukrupa Jewellers
              </div>
              <div style={{ 
                fontSize: 7, 
                color: "#b39574",
                letterSpacing: 2,
                textTransform: "uppercase",
                marginTop: 1,
                fontWeight: 500
              }}>
                Est. 2000 • Premium Jewellery
              </div>
            </div>
          </NavLink>

          {/* Search Bar */}
          <form onSubmit={doSearch} style={{ flex: 1, maxWidth: 900 }}>
            <div style={{ 
              display: "flex",
              alignItems: "center",
              background: searchFocused ? "#ffffff" : "#faf8f5",
              borderRadius: 50,
              padding: "5px 18px",
              gap: 10,
              border: searchFocused ? "2px solid #a67c52" : "2px solid #e8e4dc",
              transition: "all 0.3s ease",
              boxShadow: searchFocused ? "0 4px 20px rgba(166,124,82,0.12)" : "0 2px 8px rgba(0,0,0,0.03)"
            }}>
              <Search size={18} style={{ color: searchFocused ? "#a67c52" : "#999", transition: "color 0.3s" }} />
              <input
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Search for jewellery, collections..."
                aria-label="Search products, categories, and collections"
                style={{ 
                  flex: 1,
                  border: "none",
                  background: "transparent",
                  outline: "none",
                  fontSize: 14,
                  color: "#2d2d2d",
                  fontWeight: 400
                }}
              />
            </div>
          </form>

          {/* Right Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "nowrap", minWidth: "fit-content" }}>
            <NavLink 
              to="/wishlist" 
              style={({ isActive }) => ({ 
                display: "flex", 
                alignItems: "center", 
                gap: 8,
                textDecoration: "none",
                color: isActive ? "#a67c52" : "#4a4a4a",
                fontSize: 13,
                fontWeight: 500,
                transition: "all 0.2s ease",
                padding: "4px 0",
                borderBottom: isActive ? "2px solid #a67c52" : "2px solid transparent"
              })}
              aria-label="My wishlist"
            >
              <Heart size={18} aria-hidden="true" />
              <span>Wishlist</span>
            </NavLink>

            <NavLink 
              to="/cart" 
              style={({ isActive }) => ({ 
                display: "flex", 
                alignItems: "center", 
                gap: 8,
                textDecoration: "none",
                color: isActive ? "#a67c52" : "#4a4a4a",
                fontSize: 13,
                fontWeight: 500,
                transition: "all 0.2s ease",
                padding: "4px 0",
                borderBottom: isActive ? "2px solid #a67c52" : "2px solid transparent"
              })}
              aria-label="Shopping cart"
            >
              <ShoppingBag size={18} aria-hidden="true" />
              <span>Cart</span>
            </NavLink>

            <NavLink 
              to="/orders" 
              style={({ isActive }) => ({ 
                display: "flex", 
                alignItems: "center", 
                gap: 8,
                textDecoration: "none",
                color: isActive ? "#a67c52" : "#4a4a4a",
                fontSize: 13,
                fontWeight: 500,
                transition: "all 0.2s ease",
                padding: "4px 0",
                borderBottom: isActive ? "2px solid #a67c52" : "2px solid transparent"
              })}
              aria-label="My orders"
            >
              <ClipboardList size={18} aria-hidden="true" />
              <span>Orders</span>
            </NavLink>

            {userEmail ? (
              <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 16 }}>
                <NavLink 
                  to="/profile" 
                  style={({ isActive }) => ({ 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 10,
                    textDecoration: "none",
                    color: isActive ? "#a67c52" : "#4a4a4a",
                    fontSize: 13,
                    fontWeight: 500,
                    transition: "all 0.2s ease",
                    padding: "4px 0",
                    borderBottom: isActive ? "2px solid #a67c52" : "2px solid transparent"
                  })}
                  aria-label="My profile"
                >
                  <User size={18} aria-hidden="true" />
                  <span>Profile</span>
                </NavLink>
                <button
                  onClick={logout}
                  style={{ 
                    background: "linear-gradient(135deg, #a67c52 0%, #8b6641 100%)",
                    color: "#fff",
                    border: "none",
                    padding: "6px 16px",
                    borderRadius: 30,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.3s ease",
                    boxShadow: "0 4px 12px rgba(166,124,82,0.25)"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(166,124,82,0.35)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(166,124,82,0.25)";
                  }}
                  aria-label="Logout"
                >
                  <LogOut size={16} aria-hidden="true" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
                <button
                  onClick={() => {
                    navigate(`/auth?returnTo=${encodeURIComponent(location.pathname)}`);
                }}
                style={{
                  background: "linear-gradient(135deg, #a67c52 0%, #8b6641 100%)",
                  color: "#fff",
                  textDecoration: "none",
                  padding: "8px 20px",
                  borderRadius: 30,
                  fontSize: 12,
                  fontWeight: 600,
                  transition: "all 0.3s ease",
                  boxShadow: "0 4px 12px rgba(166,124,82,0.25)",
                  display: "inline-block"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(166,124,82,0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(166,124,82,0.25)";
                }}
              >
                Login / Sign Up
              </button>
            )}
          </div>
        </div>

        {/* Category Navigation */}
        <div style={{ 
          background: "#b08d57", 
          borderTop: "none",
          padding: "0px 24px",
          overflowX: "auto",
          overflowY: "visible",
          boxShadow: "none"
        }}>
          <div style={{ 
            maxWidth: 1400, 
            margin: "0 auto",
            display: "flex",
            gap: 2,
            minWidth: "max-content",
            alignItems: "center",
            whiteSpace: "nowrap",
            minHeight: "28px"
          }}>
            <NavLink
              to="/"
              style={({ isActive }) => ({
                padding: "0px 12px",
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
                textDecoration: "none",
                letterSpacing: 0.5,
                transition: "none",
                borderBottom: "2px solid transparent",
                borderBottomColor: isActive ? "#fff" : "transparent",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                lineHeight: 1
              })}
            >
              Home
            </NavLink>

            <NavLink
              to="/products"
              style={({ isActive }) => ({
                padding: "0px 12px",
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
                textDecoration: "none",
                letterSpacing: 0.5,
                transition: "none",
                borderBottom: "2px solid transparent",
                borderBottomColor: isActive ? "#fff" : "transparent",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                lineHeight: 1
              })}
            >
              All Products
            </NavLink>

            {cats.map((cat) => (
              <div
                key={cat.id}
                style={{ position: "relative" }}
                onMouseEnter={() => {
                  if (hoverTimeoutRef.current[cat.id]) {
                    clearTimeout(hoverTimeoutRef.current[cat.id]!);
                    hoverTimeoutRef.current[cat.id] = null;
                  }
                  setHoveredCat(cat.id);
                }}
                onMouseLeave={() => {
                  hoverTimeoutRef.current[cat.id] = setTimeout(() => {
                    setHoveredCat(null);
                    hoverTimeoutRef.current[cat.id] = null;
                  }, 800);
                }}
              >
                <div
                  onClick={() => navigate(`/products?category=${cat.id}`)}
                  style={{
                    padding: "0px 12px",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    letterSpacing: 0.5,
                    transition: "none",
                    borderBottom: "2px solid transparent",
                    borderBottomColor: hoveredCat === cat.id ? "#fff" : "transparent",
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    lineHeight: 1
                  }}
                >
                  {cat.name}
                  {subsByCat[cat.id]?.length > 0 && (
                    <ChevronDown 
                      size={10} 
                      style={{ 
                        transition: "none",
                        transform: hoveredCat === cat.id ? "rotate(180deg)" : "rotate(0deg)"
                      }} 
                    />
                  )}
                </div>

                {/* Dropdown - Fixed positioning issue */}
                {hoveredCat === cat.id && subsByCat[cat.id]?.length > 0 && (
                  <div
                    ref={(el) => {
                      if (el) {
                        // Get the category button element (the div with the category name)
                        const categoryButton = el.previousElementSibling as HTMLElement;
                        if (categoryButton) {
                          const rect = categoryButton.getBoundingClientRect();
                          el.style.top = `${rect.bottom}px`;
                          el.style.left = `${rect.left + rect.width / 2}px`;
                        }
                      }
                    }}
                    style={{
                      position: "fixed",
                      transform: "translateX(-50%)",
                      background: "#ffffff",
                      minWidth: 240,
                      boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
                      borderRadius: 16,
                      padding: "12px 0",
                      zIndex: 1001,
                      border: "1px solid #f0ebe3",
                      animation: "fadeInDown 0.3s ease",
                      marginTop: "4px"
                    }}
                    onMouseEnter={() => {
                      if (hoverTimeoutRef.current[cat.id]) {
                        clearTimeout(hoverTimeoutRef.current[cat.id]!);
                        hoverTimeoutRef.current[cat.id] = null;
                      }
                      setHoveredCat(cat.id);
                    }}
                    onMouseLeave={() => {
                      hoverTimeoutRef.current[cat.id] = setTimeout(() => {
                        setHoveredCat(null);
                        hoverTimeoutRef.current[cat.id] = null;
                      }, 800);
                    }}
                  >
                    <style>
                      {`
                        @keyframes fadeInDown {
                          from {
                            opacity: 0;
                            transform: translateX(-50%) translateY(-10px);
                          }
                          to {
                            opacity: 1;
                            transform: translateX(-50%) translateY(0);
                          }
                        }
                      `}
                    </style>
                    {subsByCat[cat.id].map((sub, idx) => (
                      <div
                        key={sub.id}
                        onClick={() => {
                          navigate(`/products?category=${cat.id}&subcategory=${sub.id}`);
                          setHoveredCat(null);
                        }}
                        style={{
                          padding: "13px 24px",
                          fontSize: 14,
                          color: "#3a3a3a",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          borderTop: idx > 0 ? "1px solid #f7f5f1" : "none",
                          fontWeight: 500
                        }}
                        onMouseEnter={(e) => {
                          if (hoverTimeoutRef.current[cat.id]) {
                            clearTimeout(hoverTimeoutRef.current[cat.id]!);
                            hoverTimeoutRef.current[cat.id] = null;
                          }
                          setHoveredCat(cat.id);
                          e.currentTarget.style.background = "#faf8f5";
                          e.currentTarget.style.color = "#a67c52";
                          e.currentTarget.style.paddingLeft = "28px";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "#3a3a3a";
                          e.currentTarget.style.paddingLeft = "24px";
                        }}
                      >
                        {sub.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            <NavLink
              to="/contact"
              style={({ isActive }) => ({
                padding: "0px 12px",
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
                textDecoration: "none",
                letterSpacing: 0.5,
                transition: "none",
                borderBottom: "2px solid transparent",
                borderBottomColor: isActive ? "#fff" : "transparent",
                textTransform: "uppercase",
                display: "flex",
                alignItems: "center",
                gap: 5,
                whiteSpace: "nowrap",
                lineHeight: 1
              })}
            >
              <MessageCircle size={10} />
              Contact
            </NavLink>
          </div>
        </div>
      </nav>

      {/* Mobile Header */}
      <div className="mobile-only mobile-navbar" style={{
        background: "linear-gradient(to bottom, #ffffff 0%, #fefdfb 100%)",
        borderBottom: "1px solid #e5e1da",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        width: "100%",
        zIndex: 1000,
        padding: "4px 12px",
        boxSizing: "border-box",
        boxShadow: "0 2px 12px rgba(0,0,0,0.04)"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}>
          {/* Hamburger Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            style={{
              background: "transparent",
              border: "none",
              padding: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Open menu"
          >
            <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#4a4a4a" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          {/* Logo */}
          <NavLink to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flex: 1 }}>
            <img src="/logo.png" alt="GK" style={{ height: 24 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#a67c52", letterSpacing: 0.4, fontFamily: "Georgia, serif" }}>
                Gurukrupa Jewellers
              </div>
              <div style={{ fontSize: 6, color: "#b39574", letterSpacing: 1.2, textTransform: "uppercase" }}>
                Est. 2000
              </div>
            </div>
          </NavLink>

          {/* Wishlist Icon */}
          <NavLink
            to="/wishlist"
            style={{
              background: "transparent",
              border: "none",
              padding: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
            }}
            aria-label="Wishlist"
          >
            <Heart size={18} style={{ color: "#4a4a4a" }} />
          </NavLink>

          {/* Contact Icon */}
          <NavLink
            to="/contact"
            style={{
              background: "transparent",
              border: "none",
              padding: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
            }}
            aria-label="Contact"
          >
            <MessageCircle size={18} style={{ color: "#4a4a4a" }} />
          </NavLink>

          {/* Profile Icon */}
          <NavLink
            to="/profile"
            style={{
              background: "transparent",
              border: "none",
              padding: 6,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
            }}
            aria-label="Profile"
          >
            <User size={18} style={{ color: "#4a4a4a" }} />
          </NavLink>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 1000,
            display: "none",
          }}
          className="mobile-menu-overlay"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "300px",
              background: "#ffffff",
              boxShadow: "4px 0 20px rgba(0,0,0,0.15)",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: "24px 20px",
              borderBottom: "1px solid #e5e1da",
              background: "linear-gradient(135deg, #a67c52 0%, #8b6641 100%)",
              color: "#fff"
            }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, fontFamily: "Georgia, serif" }}>
                Gurukrupa Jewellers
              </div>
              <div style={{ fontSize: 11, letterSpacing: 2, textTransform: "uppercase", opacity: 0.9 }}>
                Premium Jewellery Since 2000
              </div>
            </div>

            {/* Login/Logout Section */}
            <div style={{
              padding: "20px",
              borderBottom: "1px solid #e5e1da",
              background: "#faf8f5",
            }}>
              {userEmail ? (
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#2d2d2d", marginBottom: 12 }}>
                    {userEmail}
                  </div>
                  <button
                    onClick={logout}
                    style={{
                      background: "linear-gradient(135deg, #a67c52 0%, #8b6641 100%)",
                      color: "#fff",
                      border: "none",
                      padding: "11px 20px",
                      borderRadius: 30,
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 4px 12px rgba(166,124,82,0.25)"
                    }}
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    navigate(`/auth?returnTo=${encodeURIComponent(location.pathname)}`);
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    background: "linear-gradient(135deg, #a67c52 0%, #8b6641 100%)",
                    color: "#fff",
                    textDecoration: "none",
                    padding: "12px 20px",
                    borderRadius: 30,
                    fontSize: 14,
                    fontWeight: 600,
                    display: "block",
                    width: "100%",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "center",
                    boxShadow: "0 4px 12px rgba(166,124,82,0.25)"
                  }}
                >
                  Login / Sign Up
                </button>
              )}
            </div>

            {/* Menu Items */}
            <div style={{ padding: "8px 0" }}>
              <NavLink
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: "block",
                  padding: "18px 20px",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#071E33",
                  textDecoration: "none",
                  borderBottom: "1px solid #f0ebe3",
                  fontFamily: "'Playfair Display', Georgia, serif",
                  letterSpacing: "0.5px",
                  transition: "color 0.2s ease",
                }}
              >
                Home
              </NavLink>

              <NavLink
                to="/products"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: "block",
                  padding: "18px 20px",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#071E33",
                  textDecoration: "none",
                  borderBottom: "1px solid #f0ebe3",
                  fontFamily: "'Playfair Display', Georgia, serif",
                  letterSpacing: "0.5px",
                  transition: "color 0.2s ease",
                }}
              >
                All Products
              </NavLink>

              <NavLink
                to="/contact"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "18px 20px",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#071E33",
                  textDecoration: "none",
                  borderBottom: "1px solid #f0ebe3",
                  fontFamily: "'Playfair Display', Georgia, serif",
                  letterSpacing: "0.5px",
                  transition: "color 0.2s ease",
                }}
              >
                <MessageCircle size={18} />
                Contact
              </NavLink>

              {/* Categories with Dropdowns */}
              {cats.map((cat) => (
                <div key={cat.id} style={{ borderBottom: "1px solid #f0ebe3" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px 20px",
                      cursor: "pointer",
                      fontSize: 15,
                      fontWeight: 600,
                      color: "#2d2d2d",
                    }}
                  >
                    <span onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/products?category=${cat.id}`);
                      setMobileMenuOpen(false);
                    }}>
                      {cat.name}
                    </span>
                    {subsByCat[cat.id]?.length > 0 && (
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategory(cat.id);
                        }}
                        style={{
                          fontSize: 18,
                          color: "#a67c52",
                          fontWeight: 300,
                          transition: "transform 0.2s",
                          transform: expandedCategories.has(cat.id) ? "rotate(45deg)" : "rotate(0deg)",
                        }}
                      >
                        +
                      </span>
                    )}
                  </div>
                  {expandedCategories.has(cat.id) && subsByCat[cat.id]?.length > 0 && (
                    <div style={{ background: "#faf8f5" }}>
                      {subsByCat[cat.id].map((sub) => (
                        <div
                          key={sub.id}
                          onClick={() => {
                            navigate(`/products?category=${cat.id}&subcategory=${sub.id}`);
                            setMobileMenuOpen(false);
                          }}
                          style={{
                            padding: "12px 20px 12px 40px",
                            fontSize: 14,
                            color: "#666",
                            cursor: "pointer",
                            borderTop: "1px solid #f0ebe3",
                          }}
                        >
                          {sub.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <NavLink
                to="/cart"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 20px",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#2d2d2d",
                  textDecoration: "none",
                  borderBottom: "1px solid #f0ebe3",
                }}
              >
                <ShoppingBag size={18} />
                Cart
              </NavLink>

              <NavLink
                to="/orders"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 20px",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#2d2d2d",
                  textDecoration: "none",
                  borderBottom: "1px solid #f0ebe3",
                }}
              >
                <ClipboardList size={18} />
                Orders
              </NavLink>

              <NavLink
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 20px",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#2d2d2d",
                  textDecoration: "none",
                  borderBottom: "1px solid #f0ebe3",
                }}
              >
                <User size={18} />
                Profile
              </NavLink>

              <NavLink
                to="/wishlist"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "16px 20px",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "#2d2d2d",
                  textDecoration: "none",
                  borderBottom: "1px solid #f0ebe3",
                }}
              >
                <Heart size={18} />
                Wishlist
              </NavLink>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
