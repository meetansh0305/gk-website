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

        products:product_id!inner (
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
  if (filters.location_id) {
    query = query.eq("current_location_id", filters.location_id);
  }

  if (filters.category_id) {
    query = query.eq("products.category_id", filters.category_id);
  }

  if (filters.subcategory_id) {
    query = query.eq("products.subcategory_id", filters.subcategory_id);
  }

  if (filters.weight_range) {
    const [min, max] = filters.weight_range.split("-").map(Number);
    query = query.gte("weight", min).lte("weight", max);
  }

  if (filters.show_on_website !== undefined) {
    query = query.eq("show_on_website", filters.show_on_website);
  }

  if (filters.sold !== undefined) {
    query = query.eq("sold", filters.sold);
  }

  // ------ RUN QUERY -------
  const { data, error } = await query;

  if (error) {
    console.error("Supabase error:", error);
    return { data: [], error };
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
  to_loc: number | null,
  performed_by: string,
  remarks: string
) {
  const { error: insertErr } = await supabase
    .from("product_movements")
    .insert({
      product_item_id: item_id,
      from_location_id: from_loc,
      to_location_id: to_loc,
      movement_type: 'TRANSFER',
      performed_by,
      remarks,
    });

  if (insertErr) return { error: insertErr };

  const { error: updateErr } = await supabase
    .from("product_items")
    .update({ current_location_id: to_loc })
    .eq("id", item_id);

  return { error: updateErr };
}

/* --------------------------------------------
   7) MARK AS SOLD
---------------------------------------------*/
export async function markProductSold(
  item_id: number,
  from_loc: number | null,
  performed_by: string,
  remarks: string
) {
  const { error } = await supabase.from("product_movements").insert({
    product_item_id: item_id,
    from_location_id: from_loc,
    to_location_id: null,
    movement_type: 'SALE',
    performed_by,
    remarks,
  });

  if (error) return { error };

  const { error: updateErr } = await supabase
    .from("product_items")
    .update({
      sold: true,
      sold_at: new Date().toISOString(),
      current_location_id: null,
    })
    .eq("id", item_id);

  return { error: updateErr };
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
    weight_grams: weight,
    notes,
  });
}
