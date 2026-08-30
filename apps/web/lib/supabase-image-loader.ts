/**
 * Custom `next/image` loader (wired up as `images.loaderFile` in
 * `next.config.ts`, so it applies to every `<Image>` in this app).
 *
 * Admin uploads book covers and banner art straight to the public
 * `images` bucket in Supabase Storage (see apps/admin/CLAUDE.md). Routing
 * those through Next's built-in `/_next/image` optimizer breaks on any
 * network that resolves `*.supabase.co` via DNS64/NAT64: Next 16's SSRF
 * guard sees the `64:ff9b::/96` address, classifies it as private, and
 * refuses the fetch — the image renders as a broken `alt` text.
 *
 * Instead we hand the browser a URL it fetches directly. For Supabase
 * public objects that's Supabase Storage's own on-the-fly image transform
 * endpoint (`/render/image/public/...`), which resizes and re-encodes at
 * the CDN edge — so we keep width/quality optimization without proxying
 * bytes through our server. Any other URL (a cover pasted in by hand, a
 * Vercel Blob asset) is passed through untouched.
 */

const SUPABASE_PUBLIC_OBJECT =
  /^(https:\/\/[a-z0-9-]+\.supabase\.co)\/storage\/v1\/object\/public\/(.+)$/i;

export default function supabaseImageLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  const match = src.match(SUPABASE_PUBLIC_OBJECT);
  if (!match) return src;

  const [, origin, objectPath] = match;
  const params = new URLSearchParams({
    width: String(width),
    quality: String(quality ?? 75),
  });
  return `${origin}/storage/v1/render/image/public/${objectPath}?${params.toString()}`;
}
