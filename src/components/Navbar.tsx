import { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

type Category = { id: number; name: string };
type Subcategory = { id: number; name: string; category_id: number };

export default function Navbar() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [subsByCat, setSubsByCat] = useState<Record<number, Subcategory[]>>({});
  const [q, setQ] = useState("");
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
      return;
    }

    const { data: catMatch } = await supabase
      .from("categories")
      .select("id,name")
      .ilike("name", `%${term}%`)
      .limit(1);

    if (catMatch && catMatch.length) {
      navigate(`/category/${catMatch[0].id}`);
      return;
    }

    alert("No matching category/sub-category found.");
  };

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 100, background: "#fff" }}>
      {/* TOP BAR */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "10px 16px",
          borderBottom: "1px solid #eee",
          gap: 20,
        }}
      >
        {/* LOGO + TEXT*/}
        <div
          style={{ cursor: "pointer", display: "flex", alignItems: "center" }}
          onClick={() => navigate("/")}
        >
          <img
            src="/logo.png"
            alt="GK Logo"
            style={{ height: 60, width: "auto", marginRight: 8 }}
          />
          <div
        style={{
          fontSize: 24,
          fontWeight: 900,
          color: "#C6A150",
          letterSpacing: 1,
          marginTop: 4,
        }}
      >
        Gurukrupa Jewellers
      </div>
    </div>

        {/* SEARCH */}
        <form
          onSubmit={doSearch}
          style={{ flex: 1, display: "flex", justifyContent: "center" }}
        >
          <input
            placeholder="Search category or sub-category..."
            className="input"
            style={{ width: 500, maxWidth: "90%" }}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </form>

        {/* NAV ITEMS */}
        <NavLink to="/cart" style={{ textDecoration: "none" }}>Cart</NavLink>
        <NavLink to="/orders" style={{ textDecoration: "none" }}>My Orders</NavLink>

        {userEmail ? (
          <>
            <NavLink to="/profile" style={{ textDecoration: "none" }}>Profile</NavLink>
            <button className="btn" onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <NavLink to="/auth" style={{ textDecoration: "none" }}>Login</NavLink>
            <span>|</span>
            <NavLink to="/auth" style={{ textDecoration: "none" }}>Signup</NavLink>
          </>
        )}
      </div>

      {/* CATEGORY BAR */}
      <div style={{ background: "#071E33", color: "#fff", padding: "10px 16px" }}>
        <nav style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
          <NavLink to="/" style={{ color: "#fff", textDecoration: "none" }}>Home</NavLink>
          <NavLink to="/live" style={{ color: "#fff", textDecoration: "none" }}>Live Stock</NavLink>
          <NavLink to="/products" style={{ color: "#fff", textDecoration: "none" }}>
            All Products
          </NavLink>

          {cats.map((cat) => (
            <div
              key={cat.id}
              style={{ position: "relative" }}
              onMouseEnter={(e) => {
                const el = e.currentTarget.querySelector(".dropdown") as HTMLElement;
                if (el) el.style.display = "grid";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget.querySelector(".dropdown") as HTMLElement;
                if (el) el.style.display = "none";
              }}
            >
              <button className="btn linklike" onClick={() => navigate(`/category/${cat.id}`)}>
                {cat.name} ▾
              </button>

              <div
                className="dropdown"
                style={{
                  display: "none",
                  position: "absolute",
                  background: "#fff",
                  color: "#000",
                  padding: 12,
                  borderRadius: 10,
                  boxShadow: "0 6px 24px rgba(0,0,0,.15)",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 6,
                  minWidth: 180,
                  top: "100%",
                  left: 0,
                  zIndex: 200,
                }}
              >
                {(subsByCat[cat.id] ?? []).map((sc) => (
                  <div
                    key={sc.id}
                    onClick={() => navigate(`/subcategory/${sc.id}`)}
                    style={{
                      padding: "6px 10px",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {sc.name}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>
    </header>
  );
}
