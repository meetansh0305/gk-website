import { useEffect } from "react";
import { useWishlist } from "../state/WishlistContext";
import ProductCard from "../components/ProductCard";
import { useCart } from "../state/CartContext";

export default function Wishlist() {
  const { wishlist, loading } = useWishlist();
  const { add } = useCart();

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: "center", padding: 40, color: "var(--accent)" }}>
          Loading wishlist...
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h2 className="section-title">My Wishlist</h2>
      
      {wishlist.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 60 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💝</div>
          <h3 style={{ margin: "0 0 12px 0", color: "var(--text-dark)" }}>Your wishlist is empty</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
            Start adding items you love to your wishlist!
          </p>
          <a href="/products" className="btn primary" style={{ textDecoration: "none", display: "inline-block" }}>
            Browse Products
          </a>
        </div>
      ) : (
        <>
          <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
            {wishlist.length} {wishlist.length === 1 ? "item" : "items"} in your wishlist
          </p>
          <div className="grid" style={{ justifyItems: "center" }}>
            {wishlist.map((product) => (
              <ProductCard key={product.id} p={product} onClickAdd={() => add(product)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

