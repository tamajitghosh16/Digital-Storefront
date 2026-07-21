import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Back Office — Shashibhushan's New School Book Press",
  description: "Internal admin: catalogue, orders, submissions, royalties, analytics.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <div className="flex">
          <aside className="min-h-screen w-56 shrink-0 space-y-1 border-r border-slate-200 bg-white p-4 text-sm">
            <p className="mb-4 font-semibold text-brand-navy">Back Office</p>
            <a className="block rounded px-2 py-1.5 hover:bg-slate-100" href="/">Dashboard</a>
            <a className="block rounded px-2 py-1.5 hover:bg-slate-100" href="/catalogue">Catalogue</a>
            <a className="block rounded px-2 py-1.5 hover:bg-slate-100" href="/orders">Orders</a>
            <a className="block rounded px-2 py-1.5 hover:bg-slate-100" href="/submissions">Submissions Queue</a>
            <a className="block rounded px-2 py-1.5 hover:bg-slate-100" href="/royalties">Royalties</a>
            <a className="block rounded px-2 py-1.5 hover:bg-slate-100" href="/reviews">Reviews</a>
            <a className="block rounded px-2 py-1.5 hover:bg-slate-100" href="/analytics">Analytics</a>
            <p className="mb-1 mt-4 px-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Storefront CMS</p>
            <a className="block rounded px-2 py-1.5 hover:bg-slate-100" href="/settings/site">Site Settings</a>
            <a className="block rounded px-2 py-1.5 hover:bg-slate-100" href="/settings/navigation">Navigation</a>
            <a className="block rounded px-2 py-1.5 hover:bg-slate-100" href="/content/banners">Homepage Banners</a>
            <a className="block rounded px-2 py-1.5 hover:bg-slate-100" href="/content/faqs">FAQs</a>
            <a className="block rounded px-2 py-1.5 hover:bg-slate-100" href="/content/testimonials">Testimonials</a>
            <a className="block rounded px-2 py-1.5 hover:bg-slate-100" href="/settings/roles">Roles</a>
          </aside>
          <main className="flex-1 p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
