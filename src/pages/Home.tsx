import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import LoadingSpinner from "../components/LoadingSpinner";
import ImageWithPlaceholder from "../components/ImageWithPlaceholder";

type Category = { id: number; name: string; banner_url?: string | null };
type Tile = { id: number; name: string; category_id: number; preview_url?: string | null };

// Function to get attractive jewelry images based on category name
function getCategoryImage(categoryName: string): string {
  const name = categoryName.toLowerCase();
  
  // Map category names to attractive jewelry images from Unsplash
  const imageMap: Record<string, string> = {
    // Rings
    'ring': 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=800&fit=crop&q=80',
    'rings': 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=800&fit=crop&q=80',
    'promise ring': 'https://images.unsplash.com/photo-1603561596112-0a1320c37d2a?w=800&h=800&fit=crop&q=80',
    'promise rings': 'https://images.unsplash.com/photo-1603561596112-0a1320c37d2a?w=800&h=800&fit=crop&q=80',
    
    // Necklaces & Pendants
    'necklace': 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop&q=80',
    'necklaces': 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop&q=80',
    'pendant': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=800&fit=crop&q=80',
    'pendants': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=800&fit=crop&q=80',
    '9kt pendants': 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=800&fit=crop&q=80',
    
    // Earrings
    'earring': 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&h=800&fit=crop&q=80',
    'earrings': 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&h=800&fit=crop&q=80',
    '14kt earrings': 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&h=800&fit=crop&q=80',
    
    // Bracelets & Bangles
    'bracelet': 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800&h=800&fit=crop&q=80',
    'bracelets': 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800&h=800&fit=crop&q=80',
    'bangle': 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800&h=800&fit=crop&q=80',
    'bangles': 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800&h=800&fit=crop&q=80',
    'chain bracelet': 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800&h=800&fit=crop&q=80',
    'chain bracelets': 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800&h=800&fit=crop&q=80',
    
    // Gold & White Gold
    'white gold': 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&h=800&fit=crop&q=80',
    'white gold designs': 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&h=800&fit=crop&q=80',
    'gold': 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=800&fit=crop&q=80',
    
    // Gifts & Special
    'gift': 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=800&fit=crop&q=80',
    'gifts': 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=800&fit=crop&q=80',
    'gifts under': 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=800&fit=crop&q=80',
    
    // Turkish & Special Collections
    'turkish': 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&h=800&fit=crop&q=80',
    'turkish jewellery': 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&h=800&fit=crop&q=80',
    
    // Flower style
    'flower': 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&h=800&fit=crop&q=80',
    'flower style': 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&h=800&fit=crop&q=80',
  };
  
  // Check for exact match first
  if (imageMap[name]) {
    return imageMap[name];
  }
  
  // Check for partial matches
  for (const [key, url] of Object.entries(imageMap)) {
    if (name.includes(key) || key.includes(name)) {
      return url;
    }
  }
  
  // Default attractive jewelry images (rotating through different styles)
  const defaultImages = [
    'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&h=800&fit=crop&q=80', // Elegant necklace
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&h=800&fit=crop&q=80', // Gold ring
    'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800&h=800&fit=crop&q=80', // Earrings
    'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=800&h=800&fit=crop&q=80', // Bracelet
    'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&h=800&fit=crop&q=80', // Pendant
    'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&h=800&fit=crop&q=80', // White gold
  ];
  
  // Use category ID or name hash to pick a consistent default image
  const hash = categoryName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return defaultImages[hash % defaultImages.length];
}

export default function Home() {
  const [cats, setCats] = useState<Category[]>([]);
  const [tilesByCat, setTilesByCat] = useState<Record<number, Tile[]>>({});
  const [loading, setLoading] = useState(true);
  const [currentBanner, setCurrentBanner] = useState(0);
  const navigate = useNavigate();

  // Banner carousel - auto-rotate every 4 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        // Load categories and subcategories in parallel for better performance
        const [categoriesResult, subsResult] = await Promise.all([
          supabase
            .from("categories")
            .select("id,name,banner_url")
            .order("name"),
          supabase
            .from("subcategories")
            .select("id,name,category_id")
            .order("name")
        ]);

        setCats(categoriesResult.data ?? []);

        const map: Record<number, Tile[]> = {};
        // Load preview images in batches to avoid blocking
        const subcategories = subsResult.data ?? [];
        
        // Process subcategories in smaller batches
        const batchSize = 10;
        for (let i = 0; i < subcategories.length; i += batchSize) {
          const batch = subcategories.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (sc) => {
              try {
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
              } catch (err) {
                // If preview fails, still add subcategory without preview
                map[sc.category_id] = map[sc.category_id] || [];
                map[sc.category_id].push({
                  id: sc.id,
                  name: sc.name,
                  category_id: sc.category_id,
                  preview_url: null,
                });
              }
            })
          );
        }
        setTilesByCat(map);
      } catch (error) {
        console.error("Error loading home page data:", error);
        // Don't block the page - show what we have
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const banners = [
    { 
      img: "https://raw.githubusercontent.com/meetansh0305/Imaes-for-website/main/hero-jewelry.jpg",
      title: "Timeless Elegance",
      subtitle: "Discover Our Exquisite Collection",
      cta: "Explore Now"
    },
    { 
      img: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200&h=600&fit=crop",
      title: "Crafted With Love",
      subtitle: "Every Piece Tells a Story",
      cta: "View Collection"
    },
    { 
      img: "https://images.unsplash.com/photo-1596944924616-7b38e7cfac36?w=1200&h=600&fit=crop&q=80",
      title: "Shine Brighter",
      subtitle: "Jewelry for Every Occasion",
      cta: "Shop Now"
    }
  ];

  return (
    <div style={{ marginTop: 0, paddingTop: 0, background: "#faf8f5" }}>
      {/* PREMIUM HERO CAROUSEL */}
      <div
        className="hero-banner-carousel"
        style={{
          width: "100%",
          height: "85vh",
          minHeight: 500,
          maxHeight: 700,
          position: "relative",
          overflow: "hidden",
          marginTop: 0,
        }}
      >
        {banners.map((banner, idx) => (
          <div
            key={idx}
            style={{
              position: "absolute",
              inset: 0,
              opacity: currentBanner === idx ? 1 : 0,
              transition: "opacity 1s ease-in-out",
              pointerEvents: currentBanner === idx ? "auto" : "none",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url('${banner.img}')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(135deg, rgba(0,0,0,0.4) 0%, transparent 70%)",
              }}
            />
            
            {/* Banner Content */}
            <div
              className="hero-banner-content"
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                transform: "translate(-50%, -50%)",
                textAlign: "center",
                maxWidth: 700,
                width: "90%",
              }}
            >
              <div style={{ 
                fontSize: 13, 
                color: "#d4af37", 
                letterSpacing: 4, 
                marginBottom: 20,
                fontWeight: 600,
                textTransform: "uppercase",
              }}>
                ✦ Gurukrupa Jewellers ✦
              </div>
              <h1 style={{ 
                fontSize: 56, 
                fontWeight: 700, 
                color: "#fff", 
                margin: "0 0 16px 0",
                lineHeight: 1.2,
                fontFamily: "'Playfair Display', Georgia, serif",
                textShadow: "0 4px 30px rgba(0,0,0,0.5)",
              }}>
                {banner.title}
              </h1>
              <p style={{ 
                fontSize: 20, 
                color: "rgba(255,255,255,0.95)", 
                marginBottom: 36,
                lineHeight: 1.6,
                textShadow: "0 2px 15px rgba(0,0,0,0.4)",
                fontWeight: 300,
              }}>
                {banner.subtitle}
              </p>
              
              <button
                onClick={() => navigate("/products")}
                style={{
                  background: "#b08d57",
                  color: "#fff",
                  border: "none",
                  padding: "16px 48px",
                  borderRadius: 50,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 8px 24px rgba(176, 141, 87, 0.4)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(176, 141, 87, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(176, 141, 87, 0.4)";
                }}
              >
                {banner.cta}
              </button>
            </div>
          </div>
        ))}

        {/* Carousel Indicators */}
        <div style={{
          position: "absolute",
          bottom: 30,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 12,
          zIndex: 10,
        }}>
          {banners.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentBanner(idx)}
              style={{
                width: currentBanner === idx ? 40 : 12,
                height: 12,
                borderRadius: 6,
                border: "2px solid rgba(255,255,255,0.8)",
                background: currentBanner === idx ? "rgba(255,255,255,0.9)" : "transparent",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
      </div>

      {/* FEATURED CATEGORIES - Horizontal Scroll */}
      {loading && cats.length === 0 ? (
        <div style={{ 
          padding: "60px 40px",
          textAlign: "center",
          background: "linear-gradient(135deg, #faf8f5 0%, #ffffff 50%, #faf8f5 100%)",
        }}>
          <LoadingSpinner size="medium" message="Loading collections..." />
        </div>
      ) : cats.length > 0 ? (
        <div 
          className="all-products-section shop-by-category-section"
          style={{
            background: "linear-gradient(135deg, #faf8f5 0%, #ffffff 50%, #faf8f5 100%)",
            padding: "60px 40px",
            borderBottom: "1px solid #e8e4dc",
            position: "relative",
          }}
        >
          {/* Subtle texture overlay */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(circle at 20% 50%, rgba(176, 141, 87, 0.02) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(176, 141, 87, 0.02) 0%, transparent 50%)",
            pointerEvents: "none",
          }} />
          <div style={{
            maxWidth: "100%",
            width: "100%",
            margin: "0 auto",
            position: "relative",
            zIndex: 1,
          }}>
            <div style={{
              textAlign: "center",
              marginBottom: 24,
            }}>
              <div 
                className="explore-collection-text"
                style={{ 
                fontSize: 20, 
                color: "#b08d57", 
                letterSpacing: 3, 
                marginBottom: 12,
                fontWeight: 600,
                textTransform: "uppercase",
              }}>
                ✦ Explore Our Collection ✦
              </div>
              <h2 style={{ 
                fontSize: 80, 
                fontWeight: 700, 
                color: "#071E33", 
                margin: 0,
                fontFamily: "'Playfair Display', Georgia, serif",
              }}>
                Shop by Category
              </h2>
            </div>

            {/* View All Collections Button - Between heading and cards */}
            <div style={{
              width: "100%",
              display: "flex",
              justifyContent: "center",
              marginBottom: 24,
            }}>
              <button
                onClick={() => navigate("/products")}
                style={{
                  background: "#b08d57",
                  color: "#fff",
                  border: "none",
                  padding: "16px 48px",
                  borderRadius: 50,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: "0 8px 24px rgba(176, 141, 87, 0.3)",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                  fontFamily: "'Playfair Display', Georgia, serif",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(176, 141, 87, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(176, 141, 87, 0.3)";
                }}
              >
                View All Collections
              </button>
            </div>

              <div 
                className="all-products-scroll"
                style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 16,
                  paddingBottom: 16,
                }}
              >
                {cats.map((c) => {
                  const firstSub = tilesByCat[c.id]?.[0];
                  return (
                    <div
                      key={c.id}
                      className="all-products-card"
                      onClick={() => navigate(`/products?category=${c.id}`)}
                      style={{
                        cursor: "pointer",
                      transition: "transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                      onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-12px)";
                      const imgContainer = e.currentTarget.querySelector('.category-image-container') as HTMLElement;
                      const img = e.currentTarget.querySelector('.category-image') as HTMLElement;
                      const overlay = e.currentTarget.querySelector('.category-overlay') as HTMLElement;
                      const shimmer = e.currentTarget.querySelector('.shimmer-effect') as HTMLElement;
                      const title = e.currentTarget.querySelector('.category-title') as HTMLElement;
                      if (imgContainer) {
                        imgContainer.style.boxShadow = `
                          0 24px 48px rgba(176, 141, 87, 0.2),
                          0 8px 16px rgba(0, 0, 0, 0.1),
                          inset 0 1px 0 rgba(255, 255, 255, 0.9),
                          0 0 0 2px rgba(176, 141, 87, 0.2)
                        `;
                        imgContainer.style.borderColor = "rgba(176, 141, 87, 0.35)";
                      }
                      if (img) {
                        img.style.transform = "scale(1.08)";
                        img.style.filter = "brightness(1.08) contrast(1.12) saturate(1.15)";
                      }
                      if (overlay) {
                        overlay.style.opacity = "1";
                      }
                      if (shimmer) {
                        shimmer.style.opacity = "1";
                        shimmer.style.transform = "translateX(100%)";
                      }
                      if (title) {
                        title.style.color = "#b08d57";
                      }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                      const imgContainer = e.currentTarget.querySelector('.category-image-container') as HTMLElement;
                      const img = e.currentTarget.querySelector('.category-image') as HTMLElement;
                      const overlay = e.currentTarget.querySelector('.category-overlay') as HTMLElement;
                      const shimmer = e.currentTarget.querySelector('.shimmer-effect') as HTMLElement;
                      const title = e.currentTarget.querySelector('.category-title') as HTMLElement;
                      if (imgContainer) {
                        imgContainer.style.boxShadow = `
                          0 12px 32px rgba(0, 0, 0, 0.08),
                          0 4px 12px rgba(0, 0, 0, 0.04),
                          inset 0 1px 0 rgba(255, 255, 255, 0.9),
                          0 0 0 1px rgba(176, 141, 87, 0.08)
                        `;
                        imgContainer.style.borderColor = "rgba(176, 141, 87, 0.12)";
                      }
                      if (img) {
                        img.style.transform = "scale(1)";
                        img.style.filter = "brightness(1.05) contrast(1.08) saturate(1.1)";
                      }
                      if (overlay) {
                        overlay.style.opacity = "0";
                      }
                      if (shimmer) {
                        shimmer.style.opacity = "0";
                        shimmer.style.transform = "translateX(-100%)";
                      }
                      if (title) {
                        title.style.color = "#1a1a1a";
                      }
                    }}
                  >
                    <div 
                      className="category-image-container"
                      style={{
                        width: "100%",
                        aspectRatio: "1/1",
                        borderRadius: 20,
                        overflow: "hidden",
                        marginBottom: 8,
                        background: "linear-gradient(135deg, #ffffff 0%, #faf8f5 50%, #f5f5f5 100%)",
                        boxShadow: `
                          0 12px 32px rgba(0, 0, 0, 0.08),
                          0 4px 12px rgba(0, 0, 0, 0.04),
                          inset 0 1px 0 rgba(255, 255, 255, 0.9),
                          0 0 0 1px rgba(176, 141, 87, 0.08)
                        `,
                        border: "3px solid rgba(176, 141, 87, 0.12)",
                        position: "relative",
                        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                        padding: "4px",
                      }}
                    >
                      {/* Inner frame for premium look */}
                      <div style={{
                        position: "absolute",
                        inset: "4px",
                        borderRadius: "20px",
                        border: "1px solid rgba(255, 255, 255, 0.6)",
                        zIndex: 3,
                        pointerEvents: "none",
                        boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.05)",
                      }} />
                      
                      {/* Decorative corner accents */}
                      <div style={{
                        position: "absolute",
                        top: "8px",
                        left: "8px",
                        width: "24px",
                        height: "24px",
                        borderTop: "2px solid rgba(176, 141, 87, 0.2)",
                        borderLeft: "2px solid rgba(176, 141, 87, 0.2)",
                        borderRadius: "4px 0 0 0",
                        zIndex: 3,
                        pointerEvents: "none",
                      }} />
                      <div style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        width: "24px",
                        height: "24px",
                        borderTop: "2px solid rgba(176, 141, 87, 0.2)",
                        borderRight: "2px solid rgba(176, 141, 87, 0.2)",
                        borderRadius: "0 4px 0 0",
                        zIndex: 3,
                        pointerEvents: "none",
                      }} />
                      
                      {/* Subtle vignette effect */}
                      <div style={{
                        position: "absolute",
                        inset: "4px",
                        borderRadius: "20px",
                        background: "radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.03) 100%)",
                        zIndex: 1,
                        pointerEvents: "none",
                      }} />
                      
                      {/* Enhanced gradient overlay */}
                      <div style={{
                        position: "absolute",
                        inset: "4px",
                        borderRadius: "20px",
                        background: "linear-gradient(to bottom, rgba(255,255,255,0.1) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.05) 100%)",
                        zIndex: 1,
                        pointerEvents: "none",
                      }} />
                      
                      <div style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                        borderRadius: "20px",
                        overflow: "hidden",
                      }}>
                        <ImageWithPlaceholder
                          src={getCategoryImage(c.name)}
                          alt={c.name}
                          className="category-image"
                          style={{ 
                            width: "100%", 
                            height: "100%", 
                            objectFit: "cover",
                            transition: "transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)",
                            filter: "brightness(1.05) contrast(1.08) saturate(1.1)",
                          }}
                        />
                      </div>
                      
                      {/* Premium overlay on hover */}
                      <div 
                        className="category-overlay"
                        style={{
                          position: "absolute",
                          inset: "4px",
                          borderRadius: "20px",
                          background: "linear-gradient(135deg, rgba(176, 141, 87, 0) 0%, rgba(176, 141, 87, 0.08) 50%, rgba(212, 175, 55, 0.05) 100%)",
                          opacity: 0,
                          transition: "opacity 0.4s ease",
                          zIndex: 2,
                          pointerEvents: "none",
                        }}
                      />
                      
                      {/* Shimmer effect */}
                      <div style={{
                        position: "absolute",
                        inset: "4px",
                        borderRadius: "20px",
                        background: "linear-gradient(135deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
                        opacity: 0,
                        transition: "opacity 0.6s ease, transform 0.6s ease",
                        zIndex: 2,
                        pointerEvents: "none",
                        transform: "translateX(-100%)",
                      }}
                      className="shimmer-effect"
                      />
                    </div>
                    <div 
                      className="category-title"
                      style={{
                        fontSize: 16,
                        fontWeight: 600,
                        color: "#1a1a1a",
                        textAlign: "center",
                        fontFamily: "'Playfair Display', Georgia, serif",
                        letterSpacing: "0.5px",
                        transition: "color 0.3s ease",
                      }}
                    >
                        {c.name}
                      </div>
                    </div>
                  );
                })}
              </div>

          </div>
        </div>
      ) : null}

      {/* FEATURED COLLECTIONS GRID */}
      <div className="featured-collections-section" style={{
        background: "#faf8f5",
        padding: "60px 40px",
      }}>
        <div style={{
          maxWidth: "100%",
          width: "100%",
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
          gap: 32,
        }}>
          {/* Card 1 - Bridal Necklaces (Weight >= 20g) */}
          <div 
            className="featured-collection-card"
            onClick={() => navigate("/products?weightMin=20")}
            style={{
              position: "relative",
              borderRadius: 20,
              overflow: "hidden",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
              aspectRatio: "6/5",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-8px)";
              e.currentTarget.style.boxShadow = "0 16px 32px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
            }}
          >
            <img 
              src="https://raw.githubusercontent.com/meetansh0305/Imaes-for-website/main/vaibhav-nagare-e8LrvEAZqYM-unsplash.jpg"
              alt="Bridal Necklaces"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                imageRendering: "auto",
              }}
              loading="eager"
            />
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: 28,
            }}>
              <h3 style={{
                color: "#fff",
                fontSize: 24,
                fontWeight: 700,
                margin: "0 0 8px 0",
                fontFamily: "'Playfair Display', Georgia, serif",
              }}>
                Bridal Necklaces
              </h3>
              <p style={{
                color: "rgba(255,255,255,0.9)",
                fontSize: 14,
                margin: "0 0 16px 0",
              }}>
                Elegant pieces 20g and above
              </p>
              <div style={{
                color: "#d4af37",
                fontSize: 14,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                Explore Collection <span>→</span>
              </div>
            </div>
          </div>

          {/* Card 2 - Light Weight Necklace (Weight <= 10g) */}
          <div 
            className="featured-collection-card"
            onClick={() => navigate("/products?weightMax=10")}
            style={{
              position: "relative",
              borderRadius: 20,
              overflow: "hidden",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
              aspectRatio: "6/5",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-8px)";
              e.currentTarget.style.boxShadow = "0 16px 32px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
            }}
          >
            <img 
              src="https://raw.githubusercontent.com/meetansh0305/Imaes-for-website/main/eric-fung-Z0GZrpwcc5Y-unsplash.jpg"
              alt="Light Weight Necklace"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                imageRendering: "auto",
              }}
              loading="eager"
            />
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: 28,
            }}>
              <h3 style={{
                color: "#fff",
                fontSize: 24,
                fontWeight: 700,
                margin: "0 0 8px 0",
                fontFamily: "'Playfair Display', Georgia, serif",
              }}>
                Light Weight Necklace
              </h3>
              <p style={{
                color: "rgba(255,255,255,0.9)",
                fontSize: 14,
                margin: "0 0 16px 0",
              }}>
                Delicate pieces under 10g
              </p>
              <div style={{
                color: "#d4af37",
                fontSize: 14,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                Shop Now <span>→</span>
              </div>
            </div>
          </div>

          {/* Card 3 - Bangles (Category Filter) */}
          <div 
            className="featured-collection-card"
            onClick={() => navigate("/products?category=Bangles")}
            style={{
              position: "relative",
              borderRadius: 20,
              overflow: "hidden",
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
              aspectRatio: "6/5",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-8px)";
              e.currentTarget.style.boxShadow = "0 16px 32px rgba(0,0,0,0.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)";
            }}
          >
            <img 
              src="https://raw.githubusercontent.com/meetansh0305/Imaes-for-website/main/samar-ahmad--nKCbZlOHek-unsplash.jpg"
              alt="Bangles Collection"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                imageRendering: "auto",
              }}
              loading="eager"
            />
            <div style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: 28,
            }}>
              <h3 style={{
                color: "#fff",
                fontSize: 24,
                fontWeight: 700,
                margin: "0 0 8px 0",
                fontFamily: "'Playfair Display', Georgia, serif",
              }}>
                Bangles
              </h3>
              <p style={{
                color: "rgba(255,255,255,0.9)",
                fontSize: 14,
                margin: "0 0 16px 0",
              }}>
                Your everyday style statement
              </p>
              <div style={{
                color: "#d4af37",
                fontSize: 14,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}>
                Discover More <span>→</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUBCATEGORIES SECTION - Stylized Design */}
      <div className="subcategories-section" style={{
        background: "linear-gradient(135deg, #faf8f5 0%, #f5f3ed 50%, #faf8f5 100%)",
        padding: "60px 40px",
      }}>
      <div style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 48,
        }}>
        {cats.map((c) => {
          const subcats = tilesByCat[c.id] ?? [];
          // Get first subcategory image for this category's background
          const categoryBgImage = subcats.length > 0 && subcats[0].preview_url 
            ? subcats[0].preview_url 
            : "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?q=80&w=1200&auto=format&fit=crop";
          
          return (
            <div
              key={c.id}
              className="category-subcategory-container"
              style={{
                display: "flex",
                gap: 0,
        background: "#fff",
                borderRadius: 24,
                overflow: "hidden",
                boxShadow: "0 8px 32px rgba(176, 141, 87, 0.1), 0 2px 8px rgba(0,0,0,0.05)",
                border: "1px solid rgba(176, 141, 87, 0.15)",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                cursor: "pointer",
                width: "100%",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-6px)";
                e.currentTarget.style.boxShadow = "0 16px 48px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)";
                e.currentTarget.style.borderColor = "rgba(176, 141, 87, 0.3)";
                const bgImg = e.currentTarget.querySelector('div[style*="backgroundImage"]') as HTMLElement;
                if (bgImg) bgImg.style.transform = "scale(1.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.1), 0 2px 8px rgba(0,0,0,0.05)";
                e.currentTarget.style.borderColor = "rgba(176, 141, 87, 0.15)";
                const bgImg = e.currentTarget.querySelector('div[style*="backgroundImage"]') as HTMLElement;
                if (bgImg) bgImg.style.transform = "scale(1.15)";
              }}
              onClick={() => navigate(`/category/${c.id}`)}
            >
              {/* Category Name with Jewelry Background */}
              <div className="category-title-section" style={{
                flex: "0 0 300px",
                position: "relative",
                minHeight: 220,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
                padding: "40px 48px",
                overflow: "hidden",
              }}>
                {/* Blurred background image from subcategory */}
        <div style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: `url('${categoryBgImage}')`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "blur(10px) brightness(0.7)",
                  transform: "scale(1.15)",
                  zIndex: 0,
                  transition: "transform 0.6s ease",
                }} />
                {/* Enhanced gradient overlay for text readability */}
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(135deg, rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.4) 50%, rgba(0, 0, 0, 0.5) 100%)",
                  zIndex: 1,
                }} />
                {/* Subtle gold accent overlay */}
                <div style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, transparent 50%)",
                  zIndex: 1,
                }} />
                <div style={{
                  position: "relative",
                  zIndex: 2,
                  textAlign: "left",
                }}>
                  <h2 style={{
                    fontSize: 36,
                    fontWeight: 700,
                    color: "#fff",
                    margin: 0,
                    fontFamily: "'Playfair Display', Georgia, serif",
                    textShadow: "0 4px 12px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.4)",
                    letterSpacing: "2px",
                    lineHeight: 1.2,
                    textTransform: "uppercase",
                  }}>
                  {c.name}
                </h2>
                  <div style={{
                    width: 80,
                    height: 3,
                    background: "linear-gradient(90deg, #d4af37 0%, #b08d57 100%)",
                    margin: "16px 0 0 0",
                    borderRadius: 2,
                    boxShadow: "0 2px 8px rgba(212, 175, 55, 0.4)",
                  }} />
                </div>
              </div>

              {/* Category Title - shown on both mobile and desktop */}
              <h2 className="mobile-category-title" style={{
                fontSize: 30,
                color: "#071E33",
                textAlign: "center",
                margin: "0 0 12px 0",
                padding: "20px 12px",
                fontWeight: 700,
                letterSpacing: "2px",
                background: "linear-gradient(135deg, rgba(250, 248, 245, 0.8) 0%, rgba(255, 255, 255, 0.9) 50%, rgba(250, 248, 245, 0.8) 100%)",
                lineHeight: 1.1,
              }}>
                {c.name}
              </h2>

              {/* Subcategories Grid */}
              <div className="subcategories-grid-container" style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 16,
                padding: "4px 0",
                background: "transparent",
              }}>
                {subcats.length > 0 ? (
                  <>
                    {subcats.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/products?category=${c.id}&subcategory=${sub.id}`);
                      }}
                  style={{
                        width: "100%",
                        textAlign: "center",
                    cursor: "pointer",
                        padding: "0",
                        borderRadius: 0,
                    transition: "all 0.3s ease",
                        background: "transparent",
                        border: "none",
                  }}
                  onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-8px)";
                        const title = e.currentTarget.querySelector('div:last-child') as HTMLElement;
                        if (title) title.style.color = "#b08d57";
                  }}
                  onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        const title = e.currentTarget.querySelector('div:last-child') as HTMLElement;
                        if (title) title.style.color = "#1a1a1a";
                      }}
                    >
                    <div 
                      className="subcategory-image-container"
                      style={{ 
                        width: "100%",
                        aspectRatio: "1/1",
                        borderRadius: 20,
                        overflow: "hidden",
                        marginBottom: 16,
                        background: "linear-gradient(135deg, #ffffff 0%, #faf8f5 30%, #ffffff 70%, #faf8f5 100%)",
                        boxShadow: "0 12px 32px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 0 0 1px rgba(176, 141, 87, 0.12)",
                        border: "2px solid rgba(176, 141, 87, 0.15)",
                        backgroundClip: "padding-box",
                        padding: 4,
                        position: "relative",
                        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                      }}
                    >
                      <ImageWithPlaceholder
                          src={sub.preview_url}
                          alt={sub.name}
                        style={{ 
                          width: "100%", 
                          height: "100%",
                          objectFit: "cover",
                          transition: "transform 0.4s ease",
                        }}
                      />
                    </div>
                      <div 
                        className="subcategory-title"
                        style={{ 
                          fontSize: 24,
                          fontWeight: 600, 
                          color: "#071E33", 
                          fontFamily: "'Playfair Display', Georgia, serif",
                          marginBottom: 0,
                          marginTop: 4,
                          transition: "all 0.3s ease",
                          padding: "0 4px",
                          textAlign: "center",
                          letterSpacing: 0.8,
                          lineHeight: 1.4,
                          textTransform: "uppercase",
                          position: "relative",
                        }}
                      >
                        {sub.name}
                    </div>
                  </div>
                ))}
                    {/* "Explore more designs" text for empty space when 2 or less subcategories */}
                    {subcats.length <= 2 && (
                      <div className="explore-more-designs-text" style={{
                        flex: "0 0 360px",
                      display: "flex",
                      alignItems: "center",
                        justifyContent: "flex-start",
                        padding: "24px 20px",
                        paddingLeft: "40px",
                        alignSelf: "center",
                      }}>
                    <div style={{ 
                          fontSize: 36,
                          fontStyle: "italic",
                      fontWeight: 500, 
                          color: "#b08d57",
                      fontFamily: "'Playfair Display', Georgia, serif",
                          letterSpacing: "1px",
                          opacity: 0.5,
                          textAlign: "left",
                          textShadow: "0 2px 4px rgba(176, 141, 87, 0.1)",
                    }}>
                          Explore more designs
                    </div>
                      </div>
                    )}
                  </>
                ) : (
                    <div style={{ 
                    padding: "40px",
                    textAlign: "center",
                    color: "#999",
                      fontSize: 14, 
                  }}>
                    No subcategories available
                    </div>
                )}
                    </div>

              {/* View All Button */}
                    <div className="category-view-all-button" style={{ 
                flex: "0 0 auto",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                padding: "16px 24px",
                background: "linear-gradient(to bottom, #ffffff 0%, #faf8f5 100%)",
              }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/products?category=${c.id}`);
                  }}
                  style={{
                    background: "linear-gradient(135deg, #b08d57 0%, #d4af37 100%)",
                    border: "none",
                    color: "#fff",
                    padding: "10px 24px",
                    borderRadius: 50,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    whiteSpace: "nowrap",
                    fontFamily: "'Playfair Display', Georgia, serif",
                    boxShadow: "0 4px 16px rgba(176, 141, 87, 0.3), 0 2px 8px rgba(0,0,0,0.1)",
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "linear-gradient(135deg, #d4af37 0%, #b08d57 100%)";
                    e.currentTarget.style.transform = "translateY(-2px) scale(1.05)";
                    e.currentTarget.style.boxShadow = "0 8px 24px rgba(176, 141, 87, 0.4), 0 4px 12px rgba(0,0,0,0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "linear-gradient(135deg, #b08d57 0%, #d4af37 100%)";
                    e.currentTarget.style.transform = "translateY(0) scale(1)";
                    e.currentTarget.style.boxShadow = "0 4px 16px rgba(176, 141, 87, 0.3), 0 2px 8px rgba(0,0,0,0.1)";
                  }}
                >
                  View All →
                </button>
                    </div>
                  </div>
          );
        })}
      </div>
      </div>

      {/* B2B SERVICES SECTION - Professional Design */}
      <div className="b2b-services-section" style={{
        background: "#fff",
        padding: "60px 40px",
        borderTop: "1px solid #e8e4dc",
      }}>
        <div style={{
          maxWidth: 1400,
          margin: "0 auto",
        }}>
          {/* Header */}
          <div style={{
          textAlign: "center",
            marginBottom: 0,
        }}>
          <div style={{ 
              fontSize: 11, 
            color: "#b08d57", 
              letterSpacing: 4, 
              marginBottom: 16,
            fontWeight: 600,
            textTransform: "uppercase",
          }}>
              GURUKRUPA PROMISE
          </div>
          <h2 style={{ 
              fontSize: 48, 
            fontWeight: 700, 
            color: "#071E33", 
              margin: "0 0 16px 0",
            fontFamily: "'Playfair Display', Georgia, serif",
              lineHeight: 1.2,
          }}>
              Your Trusted B2B Partner
          </h2>
          <div style={{
              width: 80,
              height: 2,
              background: "#b08d57",
              margin: "0 auto 24px auto",
            }} />
            <p style={{
              fontSize: 18,
              color: "#666",
              lineHeight: 1.7,
              margin: 0,
              maxWidth: 700,
              marginLeft: "auto",
              marginRight: "auto",
            }}>
              Empowering jewelry retailers with premium quality, competitive pricing, and seamless business solutions.
            </p>
          </div>

          {/* Services Grid - Professional Layout */}
          <div className="b2b-services-grid" style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 40,
          }}>
            {/* Service 1 - Wholesale Pricing */}
              <div style={{
              padding: "40px 32px",
              border: "1px solid #e8e4dc",
              borderRadius: 8,
              transition: "all 0.3s ease",
              background: "#fff",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#b08d57";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(176, 141, 87, 0.12)";
              e.currentTarget.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e8e4dc";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
            >
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                background: "#071E33",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
                fontSize: 28,
                fontWeight: 600,
                color: "#fff",
              }}>
                ₹
              </div>
              <h3 style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#071E33",
                margin: "0 0 12px 0",
                fontFamily: "'Playfair Display', Georgia, serif",
              }}>
                Competitive Wholesale Pricing
              </h3>
              <p style={{
                fontSize: 15,
                color: "#666",
                lineHeight: 1.7,
                margin: 0,
              }}>
                Best trade rates for bulk orders
              </p>
            </div>

            {/* Service 2 - Quality Assurance */}
              <div style={{
              padding: "40px 32px",
              border: "1px solid #e8e4dc",
              borderRadius: 8,
              transition: "all 0.3s ease",
              background: "#fff",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#b08d57";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(176, 141, 87, 0.12)";
              e.currentTarget.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e8e4dc";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
            >
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                background: "#071E33",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
                fontSize: 28,
                fontWeight: 600,
                color: "#fff",
              }}>
                ✓
              </div>
              <h3 style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#071E33",
                margin: "0 0 12px 0",
                fontFamily: "'Playfair Display', Georgia, serif",
              }}>
                100% Quality Certified
              </h3>
              <p style={{
                fontSize: 15,
                color: "#666",
                lineHeight: 1.7,
                margin: 0,
              }}>
                Hallmarked & certified jewelry
              </p>
            </div>

            {/* Service 3 - Fast Delivery */}
              <div style={{
              padding: "40px 32px",
              border: "1px solid #e8e4dc",
              borderRadius: 8,
              transition: "all 0.3s ease",
              background: "#fff",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#b08d57";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(176, 141, 87, 0.12)";
              e.currentTarget.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e8e4dc";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
            >
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                background: "#071E33",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
                fontSize: 20,
                color: "#fff",
                fontWeight: 600,
                position: "relative",
              }}>
                <div style={{
                  width: 24,
                  height: 16,
                  border: "2px solid #fff",
                  borderRadius: "2px",
                  position: "relative",
                }}>
                  <div style={{
                    position: "absolute",
                    right: -6,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 0,
                    height: 0,
                    borderLeft: "6px solid #fff",
                    borderTop: "4px solid transparent",
                    borderBottom: "4px solid transparent",
                  }} />
                </div>
              </div>
              <h3 style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#071E33",
                margin: "0 0 12px 0",
                fontFamily: "'Playfair Display', Georgia, serif",
              }}>
                Fast & Reliable Delivery
              </h3>
              <p style={{
                fontSize: 15,
                color: "#666",
                lineHeight: 1.7,
                margin: 0,
              }}>
                Timely dispatch & logistics support
              </p>
            </div>

            {/* Service 4 - Custom Manufacturing */}
              <div style={{
              padding: "40px 32px",
              border: "1px solid #e8e4dc",
              borderRadius: 8,
              transition: "all 0.3s ease",
              background: "#fff",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#b08d57";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(176, 141, 87, 0.12)";
              e.currentTarget.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e8e4dc";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
            >
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                background: "#071E33",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
                fontSize: 24,
                color: "#fff",
                fontWeight: 600,
              }}>
                ⚙
              </div>
              <h3 style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#071E33",
                margin: "0 0 12px 0",
                fontFamily: "'Playfair Display', Georgia, serif",
              }}>
                Custom Manufacturing
              </h3>
              <p style={{
                fontSize: 15,
                color: "#666",
                lineHeight: 1.7,
                margin: 0,
              }}>
                Made-to-order designs
              </p>
      </div>

            {/* Service 5 - Transparent Pricing */}
      <div style={{
              padding: "40px 32px",
              border: "1px solid #e8e4dc",
              borderRadius: 8,
              transition: "all 0.3s ease",
              background: "#fff",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#b08d57";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(176, 141, 87, 0.12)";
              e.currentTarget.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e8e4dc";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
            >
              <div style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                background: "#071E33",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
                fontSize: 24,
                color: "#fff",
                fontWeight: 600,
              }}>
                $
              </div>
              <h3 style={{
                fontSize: 20,
                    fontWeight: 700,
                    color: "#071E33",
                margin: "0 0 12px 0",
                    fontFamily: "'Playfair Display', Georgia, serif",
              }}>
                Transparent Pricing
              </h3>
              <p style={{
                fontSize: 15,
                color: "#666",
                lineHeight: 1.7,
                margin: 0,
              }}>
                No hidden charges or fees
              </p>
            </div>

            {/* Service 6 - Dedicated Support */}
            <div style={{
              padding: "40px 32px",
              border: "1px solid #e8e4dc",
              borderRadius: 8,
                    transition: "all 0.3s ease",
              background: "#fff",
                  }}
                  onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#b08d57";
              e.currentTarget.style.boxShadow = "0 4px 16px rgba(176, 141, 87, 0.12)";
              e.currentTarget.style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#e8e4dc";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
            >
                      <div style={{
                width: 64,
                height: 64,
                borderRadius: 8,
                background: "#071E33",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                marginBottom: 24,
                fontSize: 20,
                color: "#fff",
                fontWeight: 600,
                        position: "relative",
              }}>
                    <div style={{ 
                  width: 20,
                  height: 20,
                  border: "2px solid #fff",
                  borderRadius: "50%",
                  position: "relative",
                }}>
                    <div style={{ 
                        position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 8,
                    height: 8,
                    background: "#fff",
                    borderRadius: "50%",
                  }} />
                    </div>
              </div>
              <h3 style={{
                fontSize: 20,
                fontWeight: 700,
                color: "#071E33",
                margin: "0 0 12px 0",
                      fontFamily: "'Playfair Display', Georgia, serif",
                    }}>
                Dedicated B2B Support
              </h3>
              <p style={{
                fontSize: 15,
                color: "#666",
                lineHeight: 1.7,
                margin: 0,
              }}>
                Expert team for your business needs
              </p>
                    </div>
                  </div>
      </div>
      </div>

      {/* CONTACT US BANNER - Final CTA */}
      <div style={{
        position: "relative",
        background: "linear-gradient(135deg, #071E33 0%, #1a2f47 50%, #071E33 100%)",
        padding: "60px 40px",
        overflow: "hidden",
      }}>
        {/* Decorative background elements */}
        <div style={{
          position: "absolute",
          top: -50,
          right: -50,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, transparent 70%)",
          filter: "blur(40px)",
        }} />
        <div style={{
          position: "absolute",
          bottom: -50,
          left: -50,
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, transparent 70%)",
          filter: "blur(40px)",
        }} />
        
        <div style={{
          maxWidth: 1400,
          margin: "0 auto",
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "center",
          gap: 60,
          flexWrap: "wrap",
        }}>
          {/* Left Side - Contact Info */}
          <div style={{
            flex: "1 1 400px",
            textAlign: "left",
        }}>
          <div style={{ 
            fontSize: 12, 
            color: "#d4af37", 
              letterSpacing: 4, 
            marginBottom: 20,
            fontWeight: 600,
            textTransform: "uppercase",
          }}>
              ✦ Get in Touch ✦
          </div>
          <h2 style={{ 
              fontSize: 48, 
            fontWeight: 700, 
            margin: "0 0 20px 0",
            fontFamily: "'Playfair Display', Georgia, serif",
            lineHeight: 1.2,
              color: "#fff",
          }}>
              Contact Us
          </h2>
          <p style={{ 
              fontSize: 18, 
              color: "rgba(255,255,255,0.9)", 
              marginBottom: 32,
            lineHeight: 1.7,
          }}>
              Have questions about our jewelry collection? We'd love to hear from you. 
              Send us a message and our team will get back to you soon.
          </p>
          <div style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
          }}>
            <button
                onClick={() => navigate("/contact")}
              style={{
                background: "#d4af37",
                color: "#071E33",
                border: "none",
                padding: "16px 40px",
                borderRadius: 50,
                fontSize: 15,
                  fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.3s ease",
                  boxShadow: "0 8px 24px rgba(212, 175, 55, 0.4)",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 12px 32px rgba(212, 175, 55, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(212, 175, 55, 0.4)";
              }}
            >
                Send Message
            </button>
            <button
                onClick={() => navigate("/products")}
              style={{
                background: "transparent",
                color: "#fff",
                  border: "2px solid rgba(255,255,255,0.4)",
                padding: "16px 40px",
                borderRadius: 50,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#fff";
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                  e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.4)";
                e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.transform = "translateY(0)";
              }}
            >
                Browse Collection
            </button>
          </div>
        </div>

          {/* Right Side - Community Group Section */}
          <div style={{
            flex: "1 1 400px",
          }}>
            <div style={{
              background: "rgba(255, 255, 255, 0.08)",
              borderRadius: 20,
              padding: "40px",
              border: "1px solid rgba(212, 175, 55, 0.2)",
              backdropFilter: "blur(10px)",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}>
              <div style={{
                fontSize: 16,
                color: "#d4af37",
                fontWeight: 600,
                marginBottom: 16,
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}>
                Join Our Community
              </div>
              <p style={{
                fontSize: 18,
                color: "#fff",
                margin: "0 0 28px 0",
                lineHeight: 1.6,
              }}>
                Join our community group to get first access to latest designs and exclusive offers
              </p>
              <button
                onClick={() => navigate("/contact?joinCommunity=true")}
                style={{
                  background: "transparent",
                  color: "#d4af37",
                  border: "2px solid #d4af37",
                  padding: "16px 40px",
                  borderRadius: 50,
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  alignSelf: "flex-start",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#d4af37";
                  e.currentTarget.style.color = "#071E33";
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 20px rgba(212, 175, 55, 0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "#d4af37";
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                Join Community →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}