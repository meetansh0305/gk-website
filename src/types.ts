export type UUID = string;

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: number;
          name: string | null;
          image_url: string | null;
          price: number | null;
          weight: number | null;
          category_id: number | null;
          subcategory_id: number | null;
          is_live_stock: boolean | null;
          created_at: string | null;
          sort_order: number | null;
          position: number | null;
          list_position: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["products"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["products"]["Row"]>;
      };

      categories: {
        Row: {
          id: number;
          name: string;
          banner_url: string | null;
          created_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
      };

      subcategories: {
        Row: {
          id: number;
          name: string;
          category_id: number | null;
          created_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["subcategories"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["subcategories"]["Row"]>;
      };

      profiles: {
        Row: {
          id: UUID;
          email: string | null;
          full_name: string | null;
          phone: string | null;
          state: string | null;
          city: string | null;
          balance_grams: number;
          created_at: string | null;
          is_admin: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };

      orders: {
        Row: {
          id: number;
          user_id: UUID | null;
          status: string;
          total_weight: number | null;
          created_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
      };

      order_items: {
        Row: {
          id: number;
          order_id: number | null;
          product_id: number | null;
          quantity: number;
          weight_at_purchase: number | null;
          price_at_purchase: number | null;
          created_at: string | null;
          product_item_id: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["order_items"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["order_items"]["Row"]>;
      };

      product_items: {
        Row: {
          id: number;
          product_id: number | null;
          sku: string | null;
          weight: number | null;
          image_url: string | null;
          is_live_stock: boolean;
          stock_qty: number;
          sort_order: number | null;
          current_location_id: number | null;
          created_at: string | null;
          updated_at: string | null;
          show_on_website: boolean;
          sold: boolean;
          sold_at: string | null;
          location_history_note: string | null;
          position: number | null;
          sku_position: number | null;
          sold_to: UUID | null;
          sold_to_user: UUID | null;
          sold_to_name: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["product_items"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["product_items"]["Row"]>;
      };

      product_movements: {
        Row: {
          id: number;
          product_item_id: number;
          from_location_id: number | null;
          to_location_id: number | null;
          movement_type: string;
          movement_date: string | null;
          quantity: number;
          performed_by: string | null;
          remarks: string | null;
          created_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["product_movements"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["product_movements"]["Row"]>;
      };

      locations: {
        Row: {
          id: number;
          name: string;
          code: string | null;
          metadata: any | null;
          created_at: string | null;
          type: string;
          is_active: boolean;
        };
        Insert: Partial<Database["public"]["Tables"]["locations"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["locations"]["Row"]>;
      };

      sold_items: {
        Row: {
          id: number;
          product_item_id: number;
          product_id: number;
          weight: number | null;
          sold_to_user: UUID | null;
          sold_to_name: string | null;
          sold_at: string | null;
          remarks: string | null;
          created_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["sold_items"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["sold_items"]["Row"]>;
      };

      raw_gold_ledger: {
        Row: {
          id: number;
          entry_type: string;
          weight: number;
          source: string | null;
          notes: string | null;
          created_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["raw_gold_ledger"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["raw_gold_ledger"]["Row"]>;
      };
    };
  };
};

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Subcategory = Database["public"]["Tables"]["subcategories"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type ProductItem = Database["public"]["Tables"]["product_items"]["Row"];
export type ProductMovement = Database["public"]["Tables"]["product_movements"]["Row"];
export type Location = Database["public"]["Tables"]["locations"]["Row"];
export type SoldItem = Database["public"]["Tables"]["sold_items"]["Row"];
export type RawGoldLedger = Database["public"]["Tables"]["raw_gold_ledger"]["Row"];
