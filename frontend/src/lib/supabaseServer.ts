// src/lib/supabaseServer.ts
import { createClient } from "@supabase/supabase-js";

// This file is SERVER-ONLY. Never import this in client components.
export function createSupabaseServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // ✅ Service role — bypasses RLS
    {
      auth: {
        persistSession: false, // ✅ No session caching on the server
        autoRefreshToken: false,
      },
    }
  );
}
