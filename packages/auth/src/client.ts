"use client";

import { createBrowserClient } from "@supabase/ssr";
import { authSupabasePublishableKey, authSupabaseUrl } from "./env";

/**
 * Browser-side Supabase client for use in Client Components. Talks to this
 * app's auth project — the storefront project for `apps/web`, the dedicated
 * staff-only project for `apps/admin` (see ./env).
 */
export function createClient() {
  return createBrowserClient(authSupabaseUrl(), authSupabasePublishableKey());
}
