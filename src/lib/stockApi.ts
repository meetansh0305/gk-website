// src/lib/stockApi.ts
import { supabase } from "./supabaseClient";

/* --------------------------------------------
   1) LOCATION SUMMARY
---------------------------------------------*/
export async function getLocationsSummary() {
  return await supabase
    .from("product_stock_by_location")
    .select("*")
    .order("location_id");
}

/* --------------------------------------------
   2) GET CATEGORIES / SUBCATEGORIES
---------------------------------------------*/
export async function getCategories() {
  return await supabase.from("categories").select("*").order("name");
}

export async function getSubcategories() {
  return await supabase.from("subcategories").select("*").order("name");
}

/* --------------------------------------------
   3) DIRECT VIEW (optional compatibility)
---------------------------------------------*/
export async function getItemsInLocation(location_id: number) {
  return await supabase
    .from("v_stock_items_detailed")
    .select("*")
    .eq("current_location_id", location_id)
    .order("item_id", { ascending: false });
}

/* --------------------------------------------
   4) ⭐ FIXED — GET FILTERED ITEMS (full working)
---------------------------------------------*/
export async function getFilteredItems(filters: any) {
  let query = supabase
    .from("product_items")
    .select(
      `
      id,
      product_id,
      weight,
      image_url,
      show_on_website,
      sold,
      sold_at,
      current_location_id,

      products:product_id (
        id,
        name,
        category_id,
        subcategory_id,
        category:category_id ( id, name ),
        subcategory:subcategory_id ( id, name )
      ),

      current_location:current_location_id (
        id,
        name
      )
    `
    )
    .order("id", { ascending: false });

  // ------- FILTERS ----------
  
  // 🔥 SOLD FILTER - Apply FIRST before other filters
  if (filters.sold !== undefined) {
    console.log("🔍 Applying sold filter:", filters.sold);
    query = query.eq("sold", filters.sold);
  }

  // Location filter - only apply if location_id is provided AND we're not showing sold items
  if (filters.location_id !== undefined && filters.location_id !== null && filters.sold !== true) {
    console.log("🔍 Applying location filter:", filters.location_id);
    query = query.eq("current_location_id", filters.location_id);
  }

  // Category filter - use inner join syntax for better performance
  if (filters.category_id) {
    query = query.eq("products.category_id", filters.category_id);
  }

  // Subcategory filter
  if (filters.subcategory_id) {
    query = query.eq("products.subcategory_id", filters.subcategory_id);
  }

  // Weight range filter
  if (filters.weight_range) {
    const [min, max] = filters.weight_range.split("-").map(Number);
    query = query.gte("weight", min).lte("weight", max);
  }

  // Show on website filter
  if (filters.show_on_website !== undefined) {
    query = query.eq("show_on_website", filters.show_on_website);
  }

  // ------ RUN QUERY -------
  const { data, error } = await query;

  if (error) {
    console.error("❌ Supabase error:", error);
    console.error("❌ Error details:", JSON.stringify(error, null, 2));
    return { data: [], error };
  }

  console.log("🔍 Query successful, returned", data?.length || 0, "items");
  if (data && data.length > 0) {
    console.log("🔍 First item sold status:", data[0].sold);
    console.log("🔍 Sample item:", { id: data[0].id, sold: data[0].sold, location: data[0].current_location_id });
  }

  // ------ CLEAN DATA -------
  const cleaned = data.map((row: any) => ({
    id: row.id,
    product_id: row.product_id,

    product_name: row.products?.name ?? null,
    category_id: row.products?.category_id ?? null,
    category_name: row.products?.category?.name ?? null,
    subcategory_id: row.products?.subcategory_id ?? null,
    subcategory_name: row.products?.subcategory?.name ?? null,

    weight: row.weight,
    image_url: row.image_url,
    show_on_website: row.show_on_website,

    sold: row.sold,
    sold_at: row.sold_at,

    current_location_id: row.current_location_id,
    current_location_name: row.current_location?.name ?? null,
  }));

  return { data: cleaned, error: null };
}

/* --------------------------------------------
   5) Toggle show_on_website
---------------------------------------------*/
export async function toggleShowOnWebsite(id: number, show: boolean) {
  return await supabase
    .from("product_items")
    .update({ show_on_website: show })
    .eq("id", id);
}

/* --------------------------------------------
   6) MOVE PRODUCT ITEM
---------------------------------------------*/
export async function moveProductItem(
  item_id: number,
  from_loc: number | null,
  to_loc: number,
  performed_by: string,
  remarks: string
) {
  // 1) Insert movement row
  const { error: movementErr } = await supabase
    .from("product_movements")
    .insert({
      product_item_id: item_id,
      from_location_id: from_loc,
      to_location_id: to_loc,
      movement_type: "MOVE",
      performed_by,
      remarks,
    });

  if (movementErr) return { error: movementErr };

  // 2) Update current location on the item
  const { error: updateErr } = await supabase
    .from("product_items")
    .update({ current_location_id: to_loc })
    .eq("id", item_id);

  return { error: updateErr };
}

/* --------------------------------------------
   7) MARK PRODUCT AS SOLD (final clean version)
---------------------------------------------*/
export async function markProductSold(
  item_id: number,
  from_loc: number | null,
  performed_by: string,
  remarks: string,
  sold_to_user: string | null = null,
  sold_to_name: string | null = null
) {
  // First, get the product_id and weight from the item
  const { data: itemData, error: itemError } = await supabase
    .from("product_items")
    .select("product_id, weight")
    .eq("id", item_id)
    .single();

  if (itemError || !itemData) {
    console.error("Error fetching item data:", itemError);
    return { error: itemError };
  }

  // 1) Insert sale movement
  const { error: movementErr } = await supabase
    .from("product_movements")
    .insert({
      product_item_id: item_id,
      from_location_id: from_loc,
      to_location_id: null,
      movement_type: "SALE",
      performed_by,
      remarks,
    });
  
  if (movementErr) {
    console.error("Movement error:", movementErr);
    return { error: movementErr };
  }

  // 2) Update product item
  const { error: updateErr } = await supabase
    .from("product_items")
    .update({
      sold: true,
      sold_at: new Date().toISOString(),
      current_location_id: null,
      sold_to_user: sold_to_user,
      sold_to_name: sold_to_name,
    })
    .eq("id", item_id);

  if (updateErr) {
    console.error("Update error:", updateErr);
    return { error: updateErr };
  }

  // 3) Insert into sold_items table
  const { error: soldItemErr } = await supabase
    .from("sold_items")
    .insert({
      product_item_id: item_id,
      product_id: itemData.product_id,
      weight: itemData.weight,
      sold_to_user: sold_to_user,
      sold_to_name: sold_to_name,
      remarks: remarks,
    });

  if (soldItemErr) {
    console.error("Sold items error:", soldItemErr);
    return { error: soldItemErr };
  }

  return { error: null };
}

/**
 * Ensure that a given physical item (product_items.id)
 * is represented exactly once in order_items.
 *
 * - If order_items already has product_item_id = item_id, do nothing.
 * - Otherwise, create a simple internal order (user_id = null)
 *   and attach this item as a single order_item.
 *
 * This is for reporting/analytics only. It does NOT affect stock,
 * which is fully controlled by product_items + product_movements.
 */
async function ensureOrderRecordForItem(item_id: number) {
  // 1) Check if this item is already recorded in any order_items
  const { data: existing, error: existingErr } = await supabase
    .from("order_items")
    .select("id")
    .eq("product_item_id", item_id)
    .limit(1);

  if (existingErr) {
    console.error("Error checking existing order_items for item:", item_id, existingErr);
    return;
  }

  if (existing && existing.length > 0) {
    // Already counted in orders; nothing to do.
    return;
  }

  // 2) Fetch the product item to know product_id and weight
  const { data: itemRow, error: itemErr } = await supabase
    .from("product_items")
    .select("product_id, weight")
    .eq("id", item_id)
    .single();

  if (itemErr || !itemRow) {
    console.error("Error fetching product_item for ensureOrderRecordForItem:", item_id, itemErr);
    return;
  }

  const { product_id, weight } = itemRow;

  // 3) Create a simple internal order (no user_id, purely for reporting)
  const { data: orderRow, error: orderErr } = await supabase
    .from("orders")
    .insert({
      user_id: null,           // internal/admin sale; we can later link this to a profile
      status: "delivered",     // since stock is already gone
      total_weight: weight ?? 0,
    })
    .select("id")
    .single();

  if (orderErr || !orderRow) {
    console.error("Error creating internal order for item:", item_id, orderErr);
    return;
  }

  const orderId = orderRow.id;

  // 4) Insert the order_item linked to this exact physical item
  const { error: oiErr } = await supabase.from("order_items").insert({
    order_id: orderId,
    product_id,
    product_item_id: item_id,
    quantity: 1,
    weight_at_purchase: weight,
    price_at_purchase: null, // you can fill this later if you start storing price
  });

  if (oiErr) {
    console.error("Error creating order_item for item:", item_id, oiErr);
  }
}


/* --------------------------------------------
   8) GET HISTORY
---------------------------------------------*/
export async function getProductHistory(item_id: number) {
  return await supabase
    .from("product_movements")
    .select(
      `*, 
       from_location:from_location_id (id,name,code), 
       to_location:to_location_id (id,name,code)`
    )
    .eq("product_item_id", item_id)
    .order("movement_date", { ascending: false });
}

/* --------------------------------------------
   9) RAW GOLD
---------------------------------------------*/
export async function getRawGoldAvailable() {
  return await supabase.from("raw_gold_available").select("*");
}

export async function addRawGoldEntry(type: string, weight: number, notes: string) {
  return await supabase.from("raw_gold_ledger").insert({
    entry_type: type,
    weight: weight,
    notes,
  });
}