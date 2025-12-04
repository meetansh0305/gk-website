import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Home from "./pages/Home";
import LiveStock from "./pages/LiveStock";
import Categories from "./pages/Categories";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import Profile from "./pages/Profile";
import Admin from "./pages/Admin";
import AuthPage from "./pages/Auth";

// NEW
import CategoryLanding from "./pages/CategoryLanding";
import SubcategoryPage from "./pages/SubcategoryPage";
import AllProducts from "./pages/AllProducts";

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <Navbar />
        <div style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/live" element={<LiveStock />} />

            {/* Categories */}
            <Route path="/categories" element={<Categories />} />

            {/* Category landing */}
            <Route path="/category/:categoryId" element={<CategoryLanding />} />

            {/* Subcategory landing */}
            <Route path="/subcategory/:subcategoryId" element={<SubcategoryPage />} />

            {/* All products */}
            <Route path="/products" element={<AllProducts />} />

            <Route path="/cart" element={<Cart />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* Admin */}
            <Route path="/admin" element={<Admin />} />

            <Route path="*" element={<Home />} />
          </Routes>
        </div>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
