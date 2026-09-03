import { NextResponse } from "next/server";
import { getCurrentStaff } from "@repo/auth/server";
import { CATALOGUE_WRITE_ROLES, CONTENT_WRITE_ROLES } from "@repo/auth/roles";
import { uploadImage, isImageUploadConfigured } from "@repo/storage";

/**
 * Image upload endpoint behind the admin's ImageField.
 *
 * A Route Handler rather than a Server Action because the field uploads the
 * moment a picture is chosen — before the surrounding form is submitted — so
 * the Publisher sees a preview and a saved URL while they're still typing the
 * rest of the record. The form itself only ever stores the returned URL.
 */

/** Vercel's serverless request-body ceiling is 4.5 MB; stay under it. */
const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Accepted types. SVG is excluded on purpose: it can carry script, and
 * nothing here sanitises it. An SVG logo can still be pointed at by pasting
 * its URL into the field, which doesn't put it on our upload path.
 */
const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);

/**
 * First bytes of each accepted format. Checked because `file.type` is
 * attacker-controlled — it's whatever the browser was told, not what the
 * file is.
 */
const SIGNATURES: { type: string; bytes: number[]; offset?: number }[] = [
  { type: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { type: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { type: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  // WebP and AVIF are both container formats: a 4-byte size field sits
  // between the magic and the brand, so match the brand at its offset.
  { type: "image/webp", bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
  { type: "image/avif", bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
];

function sniff(bytes: Uint8Array): string | null {
  for (const signature of SIGNATURES) {
    const offset = signature.offset ?? 0;
    if (bytes.length < offset + signature.bytes.length) continue;
    if (signature.bytes.every((byte, index) => bytes[offset + index] === byte)) return signature.type;
  }
  return null;
}

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentStaff();
  // Either write role may upload — catalogue editors need covers, content
  // editors need banner art, and today both resolve to EDITOR/OWNER.
  const allowed = [...new Set([...CATALOGUE_WRITE_ROLES, ...CONTENT_WRITE_ROLES])];
  if (!user?.role || !allowed.includes(user.role)) {
    return fail("You don't have permission to upload images.", 403);
  }

  if (!isImageUploadConfigured()) {
    return fail("Image storage isn't configured yet. Paste an image URL instead, or ask your developer to set the Supabase environment variables.", 503);
  }

  let file: File | null = null;
  try {
    const formData = await request.formData();
    const entry = formData.get("file");
    if (entry instanceof File) file = entry;
  } catch {
    return fail("That upload didn't arrive in one piece. Please try again.", 400);
  }

  if (!file) return fail("No image was attached.", 400);
  if (file.size === 0) return fail("That file is empty.", 400);
  if (file.size > MAX_BYTES) {
    return fail(`That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. Please use one under 4 MB.`, 413);
  }
  if (!ACCEPTED.has(file.type)) {
    return fail("Please choose a JPG, PNG, WebP, GIF, or AVIF image.", 415);
  }

  const buffer = await file.arrayBuffer();
  const actualType = sniff(new Uint8Array(buffer.slice(0, 16)));
  if (!actualType) {
    return fail("That file doesn't look like an image. Please choose a JPG, PNG, WebP, GIF, or AVIF.", 415);
  }

  try {
    const blob = await uploadImage(new Blob([buffer], { type: actualType }), file.name || "image");
    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("[uploads] blob upload failed", error);
    return fail("Upload failed. Please try again, or paste an image URL instead.", 502);
  }
}
