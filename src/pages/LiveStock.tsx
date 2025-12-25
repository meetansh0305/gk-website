import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Product } from "../types";
import ProductCard from "../components/ProductCard";
import { useCart } from "../state/CartContext";

export default function LiveStock() {
  const [items, setItems] = useState<Product[]>([]);
  const { add } = useCart();
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [sharing, setSharing] = useState(false);
  const [showShareInfo, setShowShareInfo] = useState(() => {
    const dismissed = localStorage.getItem('share-info-dismissed');
    return !dismissed;
  });

  useEffect(() => {
    supabase
      .from("products")
      .select("*")
      .eq("is_live_stock", true)
      .order("id", { ascending: false })
      .then(({ data }) => setItems(data ?? []));
  }, []);

  const handleSelectProduct = (productId: number, selected: boolean) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.size === items.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(items.map(p => p.id)));
    }
  };

  const shareSelectedImages = async () => {
    if (selectedProducts.size === 0) {
      alert("Please select at least one product to share.");
      return;
    }

    if (selectedProducts.size > 20) {
      alert("Please select maximum 20 products.");
      return;
    }

    setSharing(true);

    try {
      const selected = items.filter(p => selectedProducts.has(p.id) && p.image_url);
      
      if (selected.length === 0) {
        alert("Selected products don't have images.");
        setSharing(false);
        return;
      }

      const files: File[] = [];
      
      for (const product of selected) {
        try {
          const response = await fetch(product.image_url!);
          const blob = await response.blob();
          const fileName = `product-${product.id}.${blob.type.split('/')[1] || 'jpg'}`;
          const file = new File([blob], fileName, { type: blob.type });
          files.push(file);
        } catch (error) {
          console.error(`Failed to fetch image for product ${product.id}:`, error);
        }
      }

      if (files.length === 0) {
        alert("Failed to load images. Please try again.");
        setSharing(false);
        return;
      }

      if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
        await navigator.share({
          files: files,
          title: "Product Images",
        });
        setSelectedProducts(new Set());
      } else if (navigator.share) {
        const message = `Check out these ${files.length} products:\n${selected.map(p => p.image_url).join('\n')}`;
        await navigator.share({
          title: "Product Images",
          text: message,
        });
        setSelectedProducts(new Set());
      } else {
        alert(`Web Share API not available. Selected ${files.length} products. Please use a mobile browser with WhatsApp installed for best experience.`);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error("Share error:", error);
        alert("Failed to share images. Please try again.");
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div>
      <div
        style={{
          width: "100%",
          height: 220,
          background:
            "url('https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=1600&auto=format&fit=crop') center/cover no-repeat",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontSize: 36,
          fontWeight: 800,
          textShadow: "0 4px 18px rgba(0,0,0,0.5)",
        }}
      >
        Live Stock
      </div>

      <div className="container" style={{ marginTop: 30 }}>
        {/* Title + Live Dot */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>Available Live Stock</div>
          <div style={{ display: "flex", alignItems: "center", marginLeft: 12, gap: 4 }}>
            <span style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: "red",
              display: "inline-block",
            }}/>
            <span style={{ fontSize: 13, fontWeight: 700, color: "red" }}>Live</span>
          </div>
        </div>

        {/* Info Banner */}
        {showShareInfo && (
          <div className="card" style={{ 
            marginBottom: 20, 
            padding: 16, 
            background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
            border: "2px solid #4caf50",
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            position: "relative"
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="#2e7d32">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
                <strong style={{ color: "#2e7d32", fontSize: 15 }}>Share Products via WhatsApp</strong>
              </div>
              <p style={{ color: "#1b5e20", fontSize: 13, margin: 0, lineHeight: 1.6 }}>
                Select products and share only images on WhatsApp in your community group and your loved ones.
                <strong style={{ display: "block", marginTop: 6 }}>No links or source details are shared.</strong>
              </p>
            </div>
            <button
              onClick={() => {
                setShowShareInfo(false);
                localStorage.setItem('share-info-dismissed', 'true');
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                alignItems: "center",
                color: "#2e7d32",
              }}
              aria-label="Dismiss info"
            >
              <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        )}

        {/* Selection controls */}
        <div className="card" style={{ marginBottom: 20, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
              <input
                type="checkbox"
                checked={selectedProducts.size > 0 && selectedProducts.size === items.length}
                onChange={handleSelectAll}
                style={{ width: 18, height: 18, cursor: "pointer" }}
              />
              <span>Select All ({selectedProducts.size} selected)</span>
            </label>
          </div>
          {selectedProducts.size > 0 && (
            <button
              className="btn primary"
              onClick={shareSelectedImages}
              disabled={sharing}
              style={{
                background: "#25D366",
                borderColor: "#25D366",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                gap: 8,
                minHeight: 44,
              }}
            >
              {sharing ? (
                <>⏳ Sharing...</>
              ) : (
                <>
                  <svg width={20} height={20} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Share {selectedProducts.size} Image{selectedProducts.size !== 1 ? 's' : ''} via WhatsApp
                </>
              )}
            </button>
          )}
        </div>

        {/* Grid */}
        <div className="grid">
          {items.map((product) => {
            const productForCard = {...product, is_live_stock: product.is_live_stock ?? undefined};
            return (
              <ProductCard 
                key={product.id} 
                p={productForCard} 
                onClickAdd={() => add(productForCard)}
                isSelected={selectedProducts.has(product.id)}
                onSelect={handleSelectProduct}
                showCheckbox={true}
              />
            );
          })}
        </div>

        {items.length === 0 && (
          <p style={{ opacity: 0.6, marginTop: 20 }}>No live stock items available.</p>
        )}
      </div>
    </div>
  );
}
