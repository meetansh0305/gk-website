import { NavLink, useLocation } from "react-router-dom";

export default function MobileBottomNav() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === "/" && location.pathname === "/") return true;
    if (path !== "/" && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navItems = [
    { path: "/", label: "Home" },
    { path: "/products", label: "All Products" },
    { path: "/cart", label: "Cart" },
  ];

  return (
    <nav className="mobile-bottom-nav">
      {navItems.map(({ path, label }) => {
        const active = isActive(path);
        return (
          <NavLink
            key={path}
            to={path}
            className="mobile-nav-item"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              color: active ? "#b08d57" : "#666",
              flex: 1,
              padding: "12px 8px",
              transition: "color 0.2s",
            }}
          >
            <span style={{ 
              fontSize: 14, 
              fontWeight: active ? 600 : 500,
              textAlign: "center",
              whiteSpace: "nowrap",
            }}>
              {label}
            </span>
          </NavLink>
        );
      })}
    </nav>
  );
}

