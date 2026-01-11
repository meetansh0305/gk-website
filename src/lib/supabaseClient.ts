import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase configuration!");
  console.error("VITE_SUPABASE_URL:", SUPABASE_URL ? "✓ Set" : "✗ Missing");
  console.error("VITE_SUPABASE_ANON_KEY:", SUPABASE_ANON_KEY ? "✓ Set" : "✗ Missing");
  throw new Error("Supabase configuration is missing. Please check your .env file.");
}

// Simplified auth config - PKCE was causing the signInWithPassword to hang
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Removed flowType: 'pkce' - it was causing signInWithPassword to hang
  },
});
