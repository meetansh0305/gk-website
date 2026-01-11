import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useParams, useNavigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import MobileBottomNav from "./components/MobileBottomNav";
import WhatsAppButton from "./components/WhatsAppButton";

import Home from "./pages/Home";
import LiveStock from "./pages/LiveStock";
import Categories from "./pages/Categories";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import AuthPage from "./pages/Auth";
import Wishlist from "./pages/Wishlist";
import Contact from "./pages/Contact";
import { WishlistProvider } from "./state/WishlistContext";

// NEW
import AllProducts from "./pages/AllProducts";
import { supabase } from "./lib/supabaseClient";

// Component to redirect category to products page with filter
function CategoryRedirect() {
  const { categoryId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (categoryId) {
      navigate(`/products?category=${categoryId}`, { replace: true });
    } else {
      navigate("/products", { replace: true });
    }
  }, [categoryId, navigate]);

  return <div>Redirecting...</div>;
}

// Component to redirect subcategory to products page with filters
function SubcategoryRedirect() {
  const { subcategoryId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      if (subcategoryId) {
        const { data: sub } = await supabase
          .from("subcategories")
          .select("category_id")
          .eq("id", Number(subcategoryId))
          .single();
        
        if (sub && (sub as any).category_id) {
          navigate(`/products?category=${(sub as any).category_id}&subcategory=${subcategoryId}`, { replace: true });
        } else {
          navigate("/products", { replace: true });
        }
      }
    })();
  }, [subcategoryId, navigate]);

  return <div>Redirecting...</div>;
}

// ✅ IMPORT CSS
import "./index.css";

export default function App() {
  return (
    <BrowserRouter>
      <WishlistProvider>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
          <Navbar />
          <main id="main-content" style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/live" element={<LiveStock />} />

              {/* Categories */}
              <Route path="/categories" element={<Categories />} />

              {/* Redirect category routes to products page with filter */}
              <Route path="/category/:categoryId" element={<CategoryRedirect />} />

              {/* Redirect subcategory routes to products page with filters */}
              <Route path="/subcategory/:subcategoryId" element={<SubcategoryRedirect />} />

              {/* All products */}
              <Route path="/products" element={<AllProducts />} />

              <Route path="/cart" element={<Cart />} />
              <Route path="/orders" element={<Orders />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/auth" element={<AuthPage />} />

              {/* Admin */}
              <Route path="/admin" element={<Admin />} />

              <Route path="*" element={<Home />} />
            </Routes>
          </main>
          <MobileBottomNav />
          <Footer />
          <WhatsAppButton />
        </div>
      </WishlistProvider>
    </BrowserRouter>
  );
}