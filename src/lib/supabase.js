import { createClient } from "@supabase/supabase-js";

// These are public client settings. Row Level Security protects every financial row.
const url = import.meta.env.VITE_SUPABASE_URL || "https://umvlozdoztgzfjctrcim.supabase.co";
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_7EY2iQiFQqigXw90aZrVYw_d3ar1ybv";

export const supabaseConfigured = Boolean(url && publishableKey);
export const supabase = supabaseConfigured
  ? createClient(url, publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
