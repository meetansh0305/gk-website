export type UUID = string;

export type Database = {
  public: {
    Tables: {
      products: {
        Row: {
          id: number;
          name: string;
          image_url: string | null;
          price: number | null;
          weight: number | null;
          category_id: number | null;
          subcategory_id: number | null;
          is_live_stock: boolean | null;
        };
        Insert: Partial<Database["public"]["Tables"]["products"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["products"]["Row"]>;
      };

      categories: {
        Row: {
          id: number;
          name: string;
        };
        Insert: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
      };

      subcategories: {
        Row: {
          id: number;
          name: string;
          category_id: number;
        };
        Insert: Partial<Database["public"]["Tables"]["subcategories"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["subcategories"]["Row"]>;
      };

      profiles: {
        Row: {
          id: UUID;
          state: string | null;
          city: string | null;
          phone: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      };

      orders: {
        Row: {
          id: number;
          user_id: UUID;
          status: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["orders"]["Row"]>;
      };

      order_items: {
        Row: {
          id: number;
          order_id: number;
          product_id: number;
          quantity: number;
          price_at_purchase: number | null;
          weight_at_purchase: number | null;
        };
        Insert: Partial<Database["public"]["Tables"]["order_items"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["order_items"]["Row"]>;
      };
    };
  };
};

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Category = Database["public"]["Tables"]["categories"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
