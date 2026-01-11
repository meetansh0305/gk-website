import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import ProductCard from "../components/ProductCard";
import { useCart } from "../state/CartContext";
import { showErrorToast, showInfoToast } from "../utils/toast";

// Hook to detect mobile - initialize immediately
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  return isMobile;
};

type Category = { id: number; name: string };
type Subcategory = { id: number; name: string; category_id: number };
type Product = { id: number; image_url: string | null; weight: number | null; is_live_stock?: boolean; category_id: number; subcategory_id: number | null; name?: string | null; category_name?: string | null; subcategory_name?: string | null };

const WEIGHTS = [
  [0,5],[5,10],[10,15],[15,20],[20,25],[25,30],[30,35],[35,40],[40,45],[45,50],[50,55],[55,60],[60,65],[65,70],[70,75],[75,80]
];

export default function AllProducts() {
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const [cats, setCats] = useState<Category[]>([]);
  const [subs, setSubs] = useState<Subcategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [catIds, setCatIds] = useState<number[]>([]);
  const [subIds, setSubIds] = useState<number[]>([]);
  const [weightKeys, setWeightKeys] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"weight">("weight");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const { add } = useCart();
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
  const [sharing, setSharing] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(false);
  const [expandedSubcategories, setExpandedSubcategories] = useState(false);
  const [expandedWeights, setExpandedWeights] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  
  const INITIAL_ITEMS_SHOWN = 5;

  // Sync filter state with MobileBottomNav
  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent;
      setShowMobileFilters(customEvent.detail.show);
    };

    window.addEventListener('toggleMobileFilters', handleToggle);
    
    return () => {
      window.removeEventListener('toggleMobileFilters', handleToggle);
    };
  }, []);

  // Update filter count in bottom nav whenever filters change
  useEffect(() => {
    const filterCount = catIds.length + subIds.length + weightKeys.length;
    window.dispatchEvent(new CustomEvent('updateFilterState', { 
      detail: { show: showMobileFilters, count: filterCount } 
    }));
  }, [showMobileFilters, catIds.length, subIds.length, weightKeys.length]);

  // Get category, subcategory and weight filters from URL
  useEffect(() => {
    const categoryParam = searchParams.get("category");
    const subcategoryParam = searchParams.get("subcategory");
    
    // Handle category filter
    if (categoryParam && cats.length > 0) {
      const foundCat = cats.find(c => c.name.toLowerCase() === categoryParam.toLowerCase() || c.id === Number(categoryParam));
      if (foundCat) {
        setCatIds([foundCat.id]);
      }
    }
    
    // Handle subcategory filter
    if (subcategoryParam && subs.length > 0) {
      const subId = Number(subcategoryParam);
      const foundSub = subs.find(s => s.id === subId);
      if (foundSub) {
        setSubIds([subId]);
        // Also set the category if not already in URL
        if (!categoryParam) {
          setCatIds([foundSub.category_id]);
        }
      }
    }
    
    const weightMin = searchParams.get("weightMin");
    const weightMax = searchParams.get("weightMax");
    if (weightMin || weightMax) {
      const min = weightMin ? Number(weightMin) : 0;
      const max = weightMax ? Number(weightMax) : Infinity;
      const matchingKeys = WEIGHTS.filter(([a, b]) => {
        if (weightMin && weightMax) {
          return a < max && b > min;
        } else if (weightMin) {
          return b > min;
        } else if (weightMax) {
          return a < max;
        }
        return false;
      }).map(([a, b]) => `${a}-${b}`);
      if (matchingKeys.length > 0) {
        setWeightKeys(matchingKeys);
      }
    }
  }, [searchParams, cats, subs]);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from("categories").select("*").order("name");
      setCats(c ?? []);
      const { data: s } = await supabase.from("subcategories").select("*").order("name");
      setSubs(s ?? []);
      const { data: p } = await supabase
        .from("products")
        .select(`
          id,
          image_url,
          weight,
          is_live_stock,
          category_id,
          subcategory_id,
          name,
          categories(name),
          subcategories(name)
        `)
        .order("weight", { ascending: true });
      
      if (p) {
        const formatted = p.map((pr: any) => ({
          ...pr,
          category_name: pr.categories?.name ?? null,
          subcategory_name: pr.subcategories?.name ?? null,
        }));
        setProducts(formatted as Product[]);
      }
    })();
  }, []);

  // Prevent body scroll when mobile filter is open
  useEffect(() => {
    if (showMobileFilters) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showMobileFilters]);

  const filteredSubs = useMemo(() => {
    if (catIds.length === 0) return subs;
    return subs.filter(s => catIds.includes(s.category_id));
  }, [subs, catIds]);

  const categoryCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    products.forEach(p => {
      counts[p.category_id] = (counts[p.category_id] || 0) + 1;
    });
    return counts;
  }, [products]);

  const subcategoryCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    products.forEach(p => {
      if (p.subcategory_id) {
        counts[p.subcategory_id] = (counts[p.subcategory_id] || 0) + 1;
      }
    });
    return counts;
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = products;
    
    if (catIds.length > 0) {
      list = list.filter(p => catIds.includes(p.category_id));
    }
    
    if (subIds.length > 0) {
      list = list.filter(p => p.subcategory_id && subIds.includes(p.subcategory_id));
    }
    
    if (weightKeys.length > 0) {
      list = list.filter(p => {
        const w = Number(p.weight ?? 0);
        return weightKeys.some(k => {
          const [a,b] = k.split("-").map(Number);
          return w >= a && w < b;
        });
      });
    }
    
    list = [...list].sort((a, b) => {
      const aVal = a.weight ?? 0;
      const bVal = b.weight ?? 0;
        return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    });
    
    return list;
  }, [products, catIds, subIds, weightKeys, sortBy]);

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredProducts.slice(start, start + itemsPerPage);
  }, [filteredProducts, currentPage]);

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
    if (selectedProducts.size === paginatedProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(paginatedProducts.map(p => p.id)));
    }
  };

  // WhatsApp supported MIME types
  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  
  // Helper function to detect image type from URL extension
  const getImageTypeFromUrl = (url: string): { mime: string; ext: string } => {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('.png')) return { mime: 'image/png', ext: 'png' };
    if (urlLower.includes('.webp')) return { mime: 'image/webp', ext: 'webp' };
    if (urlLower.includes('.gif')) return { mime: 'image/gif', ext: 'gif' };
    if (urlLower.includes('.jpg') || urlLower.includes('.jpeg')) return { mime: 'image/jpeg', ext: 'jpg' };
    // Default to jpeg if can't determine
    return { mime: 'image/jpeg', ext: 'jpg' };
  };

  // Helper function to validate file size (WhatsApp limit is ~16MB per file, but we'll use 10MB to be safe)
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
  const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total for batch

  // Safe mobile device detection
  const isMobileDevice = () => {
    return (navigator.maxTouchPoints > 0) && (window.matchMedia?.('(pointer: coarse)').matches ?? false);
  };

  // Helper function to download and validate image as file
  const downloadImageAsFile = async (url: string, productId: number): Promise<File | null> => {
    try {
      // 1. Fetch image from Supabase (or any public URL)
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) {
        console.error(`Failed to fetch image for product ${productId}: ${response.statusText}`);
        return null;
      }

      // 2. Convert HTTP response into binary data
      const blob = await response.blob();

      // 3. Validate file size
      if (blob.size > MAX_FILE_SIZE) {
        console.warn(`Image for product ${productId} is too large (${(blob.size / 1024 / 1024).toFixed(2)} MB), skipping`);
        return null;
      }

      // 4. Detect MIME type from URL extension first (most reliable)
      const urlType = getImageTypeFromUrl(url);
      let blobType = blob.type;
      
      // Force MIME type: If blob type is invalid, empty, or not an image, use URL-based detection
      if (!blobType || blobType === '' || !blobType.startsWith('image/') || blobType === 'application/octet-stream') {
        blobType = urlType.mime; // Force to image/jpeg, image/png, etc. based on URL
      } else if (blobType.startsWith('image/')) {
        // Blob type is valid image type, but we still need to validate it's WhatsApp-supported
        if (!ALLOWED_TYPES.includes(blobType)) {
          // Blob type is image/* but not in WhatsApp whitelist, use URL-based type
          blobType = urlType.mime;
        }
        // Otherwise keep the blob type if it's in the whitelist
      } else {
        // Unknown type, force to URL-based detection
        blobType = urlType.mime;
      }

      // 5. Final validation: Ensure we have a valid WhatsApp-supported MIME type
      if (!blobType.startsWith('image/') || !ALLOWED_TYPES.includes(blobType)) {
        console.warn(`Invalid or unsupported MIME type for product ${productId}: ${blobType}, forcing to ${urlType.mime}`);
        blobType = urlType.mime; // Force to image/jpeg as final fallback
      }

      // 7. Wrap binary data as a File object with correct MIME type
      const fileName = `product-${productId}.${urlType.ext}`;
      const file = new File([blob], fileName, { type: blobType });

      // 8. Validate file was created correctly
      if (file.size === 0) {
        console.warn(`Empty file created for product ${productId}`);
        return null;
      }

      return file;
    } catch (error) {
      // Better CORS error handling
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error(`CORS error for product ${productId}: Images may be blocked by security settings`);
        return null;
      }
      console.error(`Error downloading image for product ${productId}:`, error);
      return null;
    }
  };

  const shareSelectedImages = async () => {
    if (selectedProducts.size === 0) {
      showErrorToast("Please select at least one product to share.");
      return;
    }

    if (selectedProducts.size > 20) {
      showErrorToast("Please select maximum 20 products.");
      return;
    }

    const selected = products.filter(p => selectedProducts.has(p.id));
    const productsWithImages = selected
      .filter(p => p.image_url)
      .slice(0, 20);

    if (productsWithImages.length === 0) {
      showErrorToast("No images to share.");
        return;
      }

    setSharing(true);
    try {
      // Download all images as files using the helper function with progress tracking
      showInfoToast("Preparing images for sharing...");
      const files: File[] = [];
      const total = productsWithImages.length;
      
      for (let i = 0; i < productsWithImages.length; i++) {
        const product = productsWithImages[i];
        
        // Show progress in console (not toast to avoid spam)
        console.log(`Downloading image ${i + 1} of ${total}...`);
        
        // Individual try-catch per image to prevent one failure from crashing entire share
        try {
          const file = await downloadImageAsFile(product.image_url!, product.id);
          
          if (file) {
            files.push(file);
            console.log(`Successfully created file for product ${product.id}:`, file.name, file.type, `(${(file.size / 1024).toFixed(2)} KB)`);
          }
        } catch (error) {
          console.error(`Failed to process image for product ${product.id}:`, error);
          // Continue with next image instead of crashing
          continue;
        }
      }

      if (files.length === 0) {
        showErrorToast("Failed to download images. Please check your connection or security settings.");
        return;
      }

      // Check total file size
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      if (totalSize > MAX_TOTAL_SIZE) {
        showErrorToast(`Total file size (${(totalSize / 1024 / 1024).toFixed(2)} MB) exceeds WhatsApp limit. Please select fewer products.`);
        return;
      }

      console.log(`Prepared ${files.length} files for sharing (total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB)`);

      // Use Web Share API with files (exactly matching user's working code)
      // This opens the native OS share sheet where user can select WhatsApp
      if (navigator.share) {
        // Test if we can share files before attempting
        if (navigator.canShare && navigator.canShare({ files })) {
          try {
            await navigator.share({
              files: files,
              title: "Product Images",
            });
            showInfoToast(`Shared ${files.length} product images!`);
            return;
        } catch (error) {
            // User cancelled the share sheet
            if (error instanceof Error && error.name === 'AbortError') {
              return;
            }
            console.error('Share error:', error);
            // Fall through to fallback
          }
        } else {
          // Try sharing anyway - some browsers support it even if canShare returns false
          try {
            await navigator.share({
              files: files,
              title: "Product Images",
            });
            showInfoToast(`Shared ${files.length} product images!`);
            return;
          } catch (error) {
            // User cancelled
            if (error instanceof Error && error.name === 'AbortError') {
              return;
            }
            console.error('Share error (canShare returned false):', error);
            // Fall through to fallback
          }
        }
      }

      // Fallback: If Web Share API fails or is unavailable
      if (isMobileDevice()) {
        // Mobile: Try WhatsApp Web URL (universal, works on all devices)
        const message = `Check out these ${files.length} products from Gurukrupa Jewellers!`;
        window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
        showErrorToast("Sharing not available. Please use the share button in your browser or try a different browser.");
      } else {
        // Desktop: Open WhatsApp Web with message (no image links since they might be private/expiring)
        const message = `Check out these ${files.length} products from Gurukrupa Jewellers!`;
        window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
        showInfoToast("Opened WhatsApp Web. Please use the share button to share images directly.");
      }
    } catch (error) {
      console.error('Error sharing images:', error);
      if (error instanceof Error && error.name !== 'AbortError') {
        showErrorToast("Failed to share products. Please try again.");
      }
    } finally {
      setSharing(false);
    }
  };

  const requestQuote = async () => {
    if (selectedProducts.size === 0) {
      showErrorToast("Please select at least one product to request a quote.");
      return;
    }

    const selected = products.filter(p => selectedProducts.has(p.id));
    const productsWithImages = selected.filter(p => p.image_url);
    
    if (productsWithImages.length === 0) {
      showErrorToast("Selected products don't have images.");
      return;
    }

    setSharing(true);
    try {
      // Download all images as files using the helper function with progress tracking
      showInfoToast("Preparing images for quote request...");
      const files: File[] = [];
      const total = productsWithImages.length;
      
      for (let i = 0; i < productsWithImages.length; i++) {
        const product = productsWithImages[i];
        
        // Show progress in console (not toast to avoid spam)
        console.log(`Downloading image ${i + 1} of ${total}...`);
        
        // Individual try-catch per image to prevent one failure from crashing entire share
        try {
          const file = await downloadImageAsFile(product.image_url!, product.id);
          
          if (file) {
            files.push(file);
            console.log(`Successfully created file for product ${product.id}:`, file.name, file.type, `(${(file.size / 1024).toFixed(2)} KB)`);
          }
        } catch (error) {
          console.error(`Failed to process image for product ${product.id}:`, error);
          // Continue with next image instead of crashing
          continue;
        }
      }

      if (files.length === 0) {
        showErrorToast("Failed to download images. Please check your connection or security settings.");
        return;
      }

      // Check total file size
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      if (totalSize > MAX_TOTAL_SIZE) {
        showErrorToast(`Total file size (${(totalSize / 1024 / 1024).toFixed(2)} MB) exceeds WhatsApp limit. Please select fewer products.`);
        return;
      }

      console.log(`Prepared ${files.length} files for sharing (total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB)`);

      // Build product details message
      let productDetails = `*Quote Request - ${selected.length} Product(s)*\n\n`;
      selected.forEach((p, index) => {
        productDetails += `*Product ${index + 1}:*\n`;
        productDetails += `ID: ${p.id}\n`;
        if (p.weight) productDetails += `Weight: ${p.weight}g\n`;
        if (p.category_name) productDetails += `Category: ${p.category_name}\n`;
        if (p.subcategory_name) productDetails += `Subcategory: ${p.subcategory_name}\n\n`;
      });
      productDetails += "Please provide more details\n\n";
      productDetails += "Send to: +91 9819583595";

      const phoneNumber = "919819583595"; // +91 9819583595

      // Use Web Share API with files (exactly matching user's working code)
      // This opens the native OS share sheet where user can select WhatsApp
      // User will manually select the contact +91 9819583595
      if (navigator.share) {
        // Test if we can share files before attempting
        if (navigator.canShare && navigator.canShare({ files })) {
          try {
            await navigator.share({
              files: files,
              title: "Product Images",
            });
            showInfoToast(`Quote request shared with ${files.length} product images!`);
            return;
          } catch (error) {
            // User cancelled the share sheet
            if (error instanceof Error && error.name === 'AbortError') {
              return;
            }
            console.error('Share error:', error);
            // Fall through to fallback
          }
        } else {
          // Try sharing anyway - some browsers support it even if canShare returns false
          try {
            await navigator.share({
              files: files,
              title: "Product Images",
            });
            showInfoToast(`Quote request shared with ${files.length} product images!`);
            return;
          } catch (error) {
            // User cancelled
            if (error instanceof Error && error.name === 'AbortError') {
              return;
            }
            console.error('Share error (canShare returned false):', error);
            // Fall through to fallback
          }
        }
      }

      // Fallback: If Web Share API fails, open WhatsApp directly with phone number
      if (isMobileDevice()) {
        // Mobile: Use universal WhatsApp URL (works on all devices)
        window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(productDetails)}`, '_blank');
        showErrorToast("Sharing not available. Please use the share button in your browser or try a different browser.");
      } else {
        // Desktop: Open WhatsApp Web
        window.open(`https://web.whatsapp.com/send?phone=${phoneNumber}&text=${encodeURIComponent(productDetails)}`, '_blank');
        showInfoToast("Opened WhatsApp Web. Please use the share button to share images directly.");
      }
    } catch (error) {
      console.error('Error requesting quote:', error);
      if (error instanceof Error && error.name !== 'AbortError') {
        showErrorToast("Failed to request quote. Please try again.");
      }
    } finally {
      setSharing(false);
    }
  };

  const toggleWeight = (key: string) => setWeightKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const toggleCategory = (catId: number) => {
    setCatIds(prev => {
      if (prev.includes(catId)) {
        const newIds = prev.filter(id => id !== catId);
        if (newIds.length === 0) {
          setSubIds([]);
          setExpandedSubcategories(false);
        }
        return newIds;
      } else {
        return [...prev, catId];
      }
    });
    setCurrentPage(1);
  };
  
  const toggleSubcategory = (subId: number) => {
    setSubIds(prev => prev.includes(subId) ? prev.filter(id => id !== subId) : [...prev, subId]);
    setCurrentPage(1);
  };

  const activeFilterCount = catIds.length + subIds.length + weightKeys.length;

  const clearAllFilters = () => {
    setCatIds([]);
    setSubIds([]);
    setWeightKeys([]);
                setCurrentPage(1);
  };

  // Filter Sidebar Content - reusable for both desktop and mobile
  const FilterContent = () => (
    <>
      <div className="filter-label" style={{ marginTop: 0 }}>Sort By</div>
            <select
              className="input"
              value={sortBy}
              onChange={(e) => {
          setSortBy(e.target.value as "weight");
                setCurrentPage(1);
              }}
        style={{ 
          marginBottom: 24,
          padding: "14px 16px",
          borderRadius: 12,
          border: "1px solid rgba(176, 141, 87, 0.2)",
          fontSize: 15,
          backgroundColor: "#fff",
          cursor: "pointer",
          transition: "all 0.25s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          width: "100%",
        }}
      >
              <option value="weight">Weight</option>
            </select>

      <div className="filter-label">Category</div>
      <div style={{ marginBottom: 20 }}>
        {(expandedCategories ? cats : cats.slice(0, INITIAL_ITEMS_SHOWN)).map(c => {
          const count = categoryCounts[c.id] || 0;
          return (
            <label key={c.id} className="filter-checkbox" style={{ 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              fontWeight: catIds.includes(c.id) ? 600 : 400,
              padding: isMobile ? "14px 12px" : "10px 8px",
              minHeight: isMobile ? 48 : "auto",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <input 
                  type="checkbox" 
                  checked={catIds.includes(c.id)} 
                  onChange={() => toggleCategory(c.id)}
                  style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#b08d57" }}
                />
                <span style={{ fontSize: isMobile ? 15 : 14 }}>{c.name}</span>
              </div>
              <span style={{ color: "#999", fontSize: 13 }}>({count})</span>
            </label>
          );
        })}
        {cats.length > INITIAL_ITEMS_SHOWN && (
          <button
            onClick={() => setExpandedCategories(!expandedCategories)}
            className="show-more-btn"
          >
            <span>{expandedCategories ? "▲" : "▼"}</span>
            <span>{expandedCategories ? "Show less" : `${cats.length - INITIAL_ITEMS_SHOWN} more`}</span>
          </button>
        )}
      </div>

      {catIds.length > 0 && (
        <>
          <div className="filter-label">Subcategory</div>
          <div style={{ marginBottom: 20 }}>
            {filteredSubs.length > 0 ? (
              <>
                {(expandedSubcategories ? filteredSubs : filteredSubs.slice(0, INITIAL_ITEMS_SHOWN)).map(s => {
                  const count = subcategoryCounts[s.id] || 0;
                  return (
                    <label key={s.id} className="filter-checkbox" style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "space-between",
                      fontWeight: subIds.includes(s.id) ? 600 : 400,
                      padding: isMobile ? "14px 12px" : "10px 8px",
                      minHeight: isMobile ? 48 : "auto",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <input 
                          type="checkbox" 
                          checked={subIds.includes(s.id)} 
                          onChange={() => toggleSubcategory(s.id)}
                          style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#b08d57" }}
                        />
                        <span style={{ fontSize: isMobile ? 15 : 14 }}>{s.name}</span>
                      </div>
                      <span style={{ color: "#999", fontSize: 13 }}>({count})</span>
                    </label>
                  );
                })}
                {filteredSubs.length > INITIAL_ITEMS_SHOWN && (
                  <button
                    onClick={() => setExpandedSubcategories(!expandedSubcategories)}
                    className="show-more-btn"
                  >
                    <span>{expandedSubcategories ? "▲" : "▼"}</span>
                    <span>{expandedSubcategories ? "Show less" : `${filteredSubs.length - INITIAL_ITEMS_SHOWN} more`}</span>
                  </button>
                )}
              </>
            ) : (
              <div style={{ color: "#999", fontSize: 14, padding: "12px 0" }}>
                No subcategories available
              </div>
            )}
          </div>
        </>
      )}

          <div className="filter-label">Weight Range</div>
      <div>
        {(expandedWeights ? WEIGHTS : WEIGHTS.slice(0, INITIAL_ITEMS_SHOWN)).map(([a,b]) => {
              const key = `${a}-${b}`;
              return (
            <label key={key} className="filter-checkbox" style={{
              padding: isMobile ? "14px 12px" : "10px 8px",
              minHeight: isMobile ? 48 : "auto",
            }}>
                  <input 
                    type="checkbox" 
                    checked={weightKeys.includes(key)} 
                    onChange={() => toggleWeight(key)} 
                style={{ width: 20, height: 20, marginRight: 12, cursor: "pointer", accentColor: "#b08d57" }}
                  />
              <span style={{ fontSize: isMobile ? 15 : 14 }}>{a}–{b} grams</span>
                </label>
              );
            })}
        {WEIGHTS.length > INITIAL_ITEMS_SHOWN && (
            <button
            onClick={() => setExpandedWeights(!expandedWeights)}
            className="show-more-btn"
            >
            <span>{expandedWeights ? "▲" : "▼"}</span>
            <span>{expandedWeights ? "Show less" : `${WEIGHTS.length - INITIAL_ITEMS_SHOWN} more`}</span>
            </button>
          )}
        </div>
    </>
  );

  return (
    <div 
      className="all-products-page"
      style={{
        width: "100%",
        background: "linear-gradient(180deg, #fefdfb 0%, #faf8f5 30%, #f5f3ed 100%)",
        padding: isMobile ? "50px 16px 120px 16px" : "80px 48px 100px 48px",
        minHeight: "100vh",
        boxSizing: "border-box",
        position: "relative",
      }}
    >
      {/* Page Header */}
      <div style={{ marginBottom: isMobile ? 24 : 48 }} className="all-products-header">
        <div style={{ textAlign: "center" }}>
          <h1 style={{ 
            fontSize: isMobile ? 28 : 42, 
            fontWeight: 700, 
            color: "#071E33", 
            margin: 0,
            marginBottom: isMobile ? 8 : 12,
            fontFamily: "'Playfair Display', Georgia, serif",
            letterSpacing: "-0.8px",
            lineHeight: 1.2,
          }}>
            Our Collection
          </h1>
          <p style={{ 
            color: "#8b7355", 
            fontSize: isMobile ? 14 : 16, 
            margin: 0,
            fontWeight: 500,
            letterSpacing: "0.2px",
          }}>
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} found
          </p>
        </div>
      </div>

      {/* Mobile Category Filter Bar */}
      {isMobile && cats.length > 0 && (
        <div 
          className="mobile-category-filter-bar"
          style={{
            marginBottom: 16,
            padding: "0 16px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              paddingBottom: 4,
            }}
          >
            {/* All Categories button */}
            <button
              onClick={() => {
                setCatIds([]);
                setSubIds([]);
                setCurrentPage(1);
              }}
              style={{
                padding: "6px 12px",
                borderRadius: 16,
                border: "none",
                background: catIds.length === 0 
                  ? "linear-gradient(135deg, #d4a574 0%, #b08d57 100%)" 
                  : "#f5f3ed",
                color: catIds.length === 0 ? "#fff" : "#8b7355",
                fontSize: 11,
                fontWeight: catIds.length === 0 ? 700 : 500,
                textTransform: "uppercase",
                letterSpacing: "0.3px",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
                boxShadow: catIds.length === 0 
                  ? "0 2px 6px rgba(176, 141, 87, 0.3)" 
                  : "0 1px 2px rgba(0,0,0,0.1)",
                flexShrink: 0,
              }}
              onTouchStart={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.95)";
              }}
              onTouchEnd={(e) => {
                setTimeout(() => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                }, 150);
              }}
            >
              All
            </button>
            
            {/* Category buttons */}
            {cats.map(cat => {
              const isActive = catIds.includes(cat.id) && catIds.length === 1;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    if (isActive) {
                      setCatIds([]);
                      setSubIds([]);
                    } else {
                      setCatIds([cat.id]);
                      setSubIds([]);
                    }
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 16,
                    border: "none",
                    background: isActive 
                      ? "linear-gradient(135deg, #d4a574 0%, #b08d57 100%)" 
                      : "#f5f3ed",
                    color: isActive ? "#fff" : "#8b7355",
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.3px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    transition: "all 0.2s ease",
                    boxShadow: isActive 
                      ? "0 2px 6px rgba(176, 141, 87, 0.3)" 
                      : "0 1px 2px rgba(0,0,0,0.1)",
                    flexShrink: 0,
                  }}
                  onTouchStart={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.95)";
                  }}
                  onTouchEnd={(e) => {
                    setTimeout(() => {
                      (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                    }, 150);
                  }}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Filter Button - Fixed at bottom */}
      {isMobile && (
        <button
          onClick={() => setShowMobileFilters(true)}
          className="mobile-filter-fab"
          style={{
            position: "fixed",
            bottom: 90,
            right: 16,
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #b08d57 0%, #8b6641 100%)",
            border: "none",
            boxShadow: "0 4px 20px rgba(176, 141, 87, 0.4), 0 2px 8px rgba(0,0,0,0.15)",
            cursor: "pointer",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            transition: "all 0.3s ease",
          }}
        >
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
          </svg>
          {activeFilterCount > 0 && (
            <span style={{
              position: "absolute",
              top: -4,
              right: -4,
              background: "#dc3545",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              width: 22,
              height: 22,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {activeFilterCount}
            </span>
          )}
        </button>
      )}

      {/* Mobile Filter Overlay */}
      {isMobile && showMobileFilters && (
        <div 
          className="mobile-filter-overlay"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            zIndex: 999,
            animation: "fadeIn 0.2s ease",
          }}
          onClick={() => setShowMobileFilters(false)}
        />
      )}

      {/* Mobile Filter Panel - Slide up from bottom */}
      {isMobile && (
        <div
          className="mobile-filter-panel"
          style={{
            position: "fixed",
            left: 0,
            right: 0,
            bottom: 0,
            maxHeight: "85vh",
            background: "#fff",
            borderRadius: "24px 24px 0 0",
            zIndex: 1000,
            transform: showMobileFilters ? "translateY(0)" : "translateY(100%)",
            transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 -4px 30px rgba(0,0,0,0.15)",
          }}
        >
          {/* Handle bar */}
          <div style={{
            width: 40,
            height: 4,
            background: "#ddd",
            borderRadius: 2,
            margin: "12px auto 0",
          }} />

          {/* Filter Header */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid rgba(176, 141, 87, 0.15)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h3 style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                color: "#071E33",
              }}>
                Filters
              </h3>
              {activeFilterCount > 0 && (
                <span style={{
                  background: "linear-gradient(135deg, #b08d57 0%, #8b6641 100%)",
                  color: "#fff",
                  borderRadius: 12,
                  padding: "4px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  {activeFilterCount}
                </span>
              )}
                </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#b08d57",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "8px 12px",
                  }}
                >
                  Clear All
                </button>
              )}
              <button
                onClick={() => setShowMobileFilters(false)}
                style={{
                  background: "transparent",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  width: 36,
                  height: 36,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  color: "#666",
                }}
              >
                ×
              </button>
            </div>
          </div>

          {/* Scrollable Filter Content */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px 20px 24px",
            WebkitOverflowScrolling: "touch",
          }}>
            <FilterContent />
          </div>

          {/* Apply Button */}
          <div style={{
            padding: "16px 20px",
            borderTop: "1px solid rgba(176, 141, 87, 0.15)",
            background: "#fff",
          }}>
            <button
              onClick={() => setShowMobileFilters(false)}
              style={{
                width: "100%",
                padding: "16px",
                background: "linear-gradient(135deg, #b08d57 0%, #8b6641 100%)",
                color: "#fff",
                border: "none",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Show {filteredProducts.length} Products
            </button>
          </div>
        </div>
      )}

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: isMobile ? "1fr" : "300px 1fr",
        gap: isMobile ? 24 : 56,
        alignItems: "start",
        width: "100%",
        boxSizing: "border-box",
      }}>
        {/* DESKTOP FILTERS SIDEBAR */}
        {!isMobile && (
          <div 
            className="filter-sidebar"
            style={{
              background: "linear-gradient(180deg, #ffffff 0%, #fefdfb 100%)",
              borderRadius: 24,
              padding: "28px",
              position: "sticky",
              top: "24px",
              alignSelf: "flex-start",
              boxShadow: "0 4px 32px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
              width: "100%",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              maxHeight: "calc(100vh - 48px)",
              border: "1px solid rgba(176, 141, 87, 0.12)",
            }}
          >
            {/* Filter Header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 32,
              paddingBottom: 24,
              borderBottom: "2px solid rgba(176, 141, 87, 0.1)",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <h3 style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#071E33",
                }}>
                  Filters
                </h3>
                {activeFilterCount > 0 && (
                  <span style={{
                    background: "linear-gradient(135deg, #b08d57 0%, #8b6641 100%)",
                    color: "#fff",
                    borderRadius: 14,
                    padding: "5px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                  }}>
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <button
                onClick={clearAllFilters}
                disabled={activeFilterCount === 0}
                style={{
                  background: activeFilterCount > 0 
                    ? "linear-gradient(135deg, rgba(176, 141, 87, 0.12) 0%, rgba(139, 102, 65, 0.08) 100%)" 
                    : "transparent",
                  border: activeFilterCount > 0 
                    ? "1px solid rgba(176, 141, 87, 0.2)" 
                    : "1px solid transparent",
                  color: activeFilterCount > 0 ? "#8b6641" : "#999",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: activeFilterCount > 0 ? "pointer" : "not-allowed",
                  padding: "8px 16px",
                  borderRadius: 10,
                  opacity: activeFilterCount > 0 ? 1 : 0.5,
                  transition: "all 0.25s ease",
                }}
              >
                Clear All
              </button>
            </div>

            {/* Scrollable Content */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              overflowX: "hidden",
              paddingRight: 8,
              minHeight: 0,
            }}>
              <FilterContent />
            </div>
          </div>
        )}

        {/* PRODUCTS GRID */}
        <div style={{ width: "100%", minWidth: 0, overflow: "hidden", boxSizing: "border-box" }}>
          {/* Mobile Active Filters */}
          {isMobile && activeFilterCount > 0 && (
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 16,
            }}>
              {catIds.map(id => {
                const cat = cats.find(c => c.id === id);
                return cat ? (
                  <span
                    key={`cat-${id}`}
                    onClick={() => toggleCategory(id)}
                    style={{
                      background: "rgba(176, 141, 87, 0.12)",
                      border: "1px solid rgba(176, 141, 87, 0.25)",
                      color: "#8b6641",
                      padding: "6px 12px",
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      cursor: "pointer",
                    }}
                  >
                    {cat.name}
                    <span style={{ fontSize: 16, lineHeight: 1 }}>×</span>
                  </span>
                ) : null;
              })}
              {weightKeys.map(key => (
                <span
                  key={`weight-${key}`}
                  onClick={() => toggleWeight(key)}
                  style={{
                    background: "rgba(176, 141, 87, 0.12)",
                    border: "1px solid rgba(176, 141, 87, 0.25)",
                    color: "#8b6641",
                    padding: "6px 12px",
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                  }}
                >
                  {key}g
                  <span style={{ fontSize: 16, lineHeight: 1 }}>×</span>
                </span>
              ))}
            </div>
          )}

          {/* Info Banner */}
          <div style={{ 
            marginBottom: 16, 
            padding: isMobile ? 14 : 16, 
            background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
            border: "2px solid #4caf50",
            borderRadius: 12,
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            position: "relative"
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: isMobile ? 6 : 8 }}>
                <svg width={isMobile ? 18 : 20} height={isMobile ? 18 : 20} viewBox="0 0 24 24" fill="#2e7d32">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                </svg>
                <strong style={{ color: "#2e7d32", fontSize: isMobile ? 14 : 15 }}>Share Products via WhatsApp</strong>
              </div>
              <p style={{ color: "#1b5e20", fontSize: isMobile ? 12 : 13, margin: 0, lineHeight: isMobile ? 1.5 : 1.6 }}>
                Select products and share only images on WhatsApp in your community group and your loved ones.
                <strong style={{ display: "block", marginTop: isMobile ? 4 : 6 }}>No links or source details are shared.</strong>
              </p>
            </div>
          </div>

          {/* Instruction Message */}
          <div style={{
            background: "linear-gradient(135deg, #f5f3ed 0%, #e8e4dc 100%)",
            border: "1px solid #d4af37",
            borderRadius: 12,
            padding: isMobile ? "14px 16px" : "16px 20px",
            marginBottom: isMobile ? 16 : 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}>
            <svg width={isMobile ? 20 : 24} height={isMobile ? 20 : 24} viewBox="0 0 24 24" fill="none" stroke="#b08d57" strokeWidth={2}>
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4M12 8h.01"/>
            </svg>
            <p style={{
              margin: 0,
              fontSize: isMobile ? 13 : 14,
              color: "#5a4a3a",
              lineHeight: 1.5,
            }}>
              <strong>Select the products</strong> you're interested in using the checkboxes, then click <strong>"Request for Quote"</strong> to get pricing details via WhatsApp.
            </p>
          </div>

          {/* Selection controls */}
          <div style={{ 
            marginBottom: 16, 
            padding: isMobile ? "12px 14px" : 16, 
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            flexWrap: "wrap", 
            gap: 12 
          }}>
            <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: isMobile ? 13 : 14 }}>
                <input
                  type="checkbox"
                  checked={selectedProducts.size > 0 && selectedProducts.size === paginatedProducts.length}
                  onChange={handleSelectAll}
                style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#b08d57" }}
                />
              <span>Select All ({selectedProducts.size})</span>
              </label>
            {selectedProducts.size > 0 && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={requestQuote}
                  style={{
                    background: "linear-gradient(135deg, #b08d57 0%, #8b6641 100%)",
                    border: "none",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: isMobile ? "10px 14px" : "10px 16px",
                    borderRadius: 8,
                    fontSize: isMobile ? 13 : 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(176, 141, 87, 0.3)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(176, 141, 87, 0.4)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 8px rgba(176, 141, 87, 0.3)";
                  }}
                >
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    <path d="M13 8H3M17 12H3M21 16H3"/>
                  </svg>
                  Request for Quote ({selectedProducts.size})
                </button>
              <button
                onClick={shareSelectedImages}
                disabled={sharing}
                style={{
                  background: "#25D366",
                  border: "none",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: isMobile ? "10px 14px" : "10px 16px",
                  borderRadius: 8,
                  fontSize: isMobile ? 13 : 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                {sharing ? "Sharing..." : (
                  <>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </svg>
                    Share {selectedProducts.size}
                  </>
                )}
              </button>
              </div>
            )}
          </div>

          {/* Products Grid */}
          <div className="all-products-grid" style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, minmax(0, 1fr))",
            gap: isMobile ? 12 : 16,
            width: "100%",
            boxSizing: "border-box",
          }}>
            {paginatedProducts.map(p => (
              <ProductCard 
                key={p.id} 
                p={p} 
                isSelected={selectedProducts.has(p.id)}
                onSelect={handleSelectProduct}
                showCheckbox={true}
                onClickAdd={(product) => add(product)}
              />
            ))}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ 
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center",
              gap: isMobile ? 12 : 8, 
              marginTop: 32, 
              flexWrap: "wrap" 
            }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: isMobile ? "12px 20px" : "10px 16px",
                  background: currentPage === 1 ? "#f5f3ed" : "#fff",
                  border: "1px solid #e8e4de",
                  borderRadius: 8,
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  opacity: currentPage === 1 ? 0.5 : 1,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Previous
              </button>
              <span style={{ 
                padding: "0 16px", 
                color: "#8b7355",
                fontSize: 14,
              }}>
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: isMobile ? "12px 20px" : "10px 16px",
                  background: currentPage === totalPages ? "#f5f3ed" : "#fff",
                  border: "1px solid #e8e4de",
                  borderRadius: 8,
                  cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                Next
              </button>
            </div>
          )}
          
          {filteredProducts.length === 0 && (
            <div style={{ 
              textAlign: "center", 
              padding: isMobile ? 40 : 60, 
              color: "#666" 
            }}>
              <p style={{ fontSize: 18, marginBottom: 8 }}>No products found</p>
              <p style={{ fontSize: 14 }}>Try adjusting your filters</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
