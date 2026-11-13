"use client";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/**
 * The browser's cache of server data (TanStack Query) — the client-side
 * layer of docs/adr/0001-caching-strategy.md. It holds what client-heavy
 * screens fetch after the first render: the catalogue's infinite-scroll
 * pages (`BooksGrid`) and the cart's live stock and covers (`CartScreen`).
 * Mounted once in the root layout, so it outlives navigations: leave a
 * listing and come back and the pages already scrolled through are still
 * there, without asking the server again.
 *
 * Defaults: data counts as fresh for a minute and is forgotten five minutes
 * after nothing shows it — the same five-minute worst case as the server's
 * caches. Only public, display-only data goes through here; checkout never
 * reads from it.
 *
 * One client per browser tab (`useState`), never shared between requests on
 * the server.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
