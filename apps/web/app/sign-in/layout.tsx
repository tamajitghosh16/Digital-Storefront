import type { Metadata } from "next";

// The page itself is a Client Component, so its <title> is set here.
export const metadata: Metadata = { title: "Sign in" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
