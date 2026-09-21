"use client";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Browser Supabase client — uses the anon key only.
// After security hardening, anon has zero table access (REVOKE ALL).
// This client is used only for:
//   1. Supabase Auth (login/signup for staff)
//   2. Realtime subscriptions (which respect RLS)
// All data reads go through authenticated sessions (after login).

let client: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseBrowserClient() {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  client = createClient<Database>(url, anonKey);
  return client;
}
