import { NextResponse } from "next/server";
import { getCurrentStaff } from "@repo/auth/server";
import { CATALOGUE_WRITE_ROLES } from "@repo/auth/roles";
import { createEbookUploadUrl, isEbookStorageConfigured } from "@repo/storage";

/**
 * Signs a one-time upload URL for an e-book PDF.
 *
 * The PDF never passes through this route (or through Vercel's 4.5 MB
 * request-body limit) — the browser gets a short-lived signed URL from here
 * and `PUT`s the file straight to the private Supabase `ebooks` bucket. This
 * route only authorises the request and hands back the URL.
 *
 * Same trust model as the image route (`../route.ts`): a signed-in
 * EDITOR/OWNER, so there's no malware scan. The magic-byte check images get
 * isn't possible here because the bytes don't come through, but the file
 * type is constrained client-side and by the `.pdf` name check below.
 */
const MAX_BYTES = 100 * 1024 * 1024; // generous ceiling; a book PDF that big is almost certainly a mistake

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const user = await getCurrentStaff();
  if (!user?.role || !CATALOGUE_WRITE_ROLES.includes(user.role)) {
    return fail("You don't have permission to upload e-book files.", 403);
  }

  if (!isEbookStorageConfigured()) {
    return fail(
      "E-book storage isn't configured yet. Ask your developer to set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, and to create a private \"ebooks\" Storage bucket.",
      503
    );
  }

  let fileName: unknown;
  let sizeBytes: unknown;
  try {
    const body = await request.json();
    fileName = body?.fileName;
    sizeBytes = body?.sizeBytes;
  } catch {
    return fail("That request didn't arrive in one piece. Please try again.", 400);
  }

  if (typeof fileName !== "string" || !/\.pdf$/i.test(fileName.trim())) {
    return fail("Please choose a PDF file.", 415);
  }
  if (typeof sizeBytes !== "number" || !Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return fail("That file looks empty.", 400);
  }
  if (sizeBytes > MAX_BYTES) {
    return fail(`That file is ${(sizeBytes / 1024 / 1024).toFixed(0)} MB. Please use one under 100 MB.`, 413);
  }

  try {
    const { path, uploadUrl } = await createEbookUploadUrl(fileName.trim());
    return NextResponse.json({ path, uploadUrl });
  } catch (error) {
    console.error("[uploads/ebook] failed to sign upload URL", error);
    return fail("Couldn't start the upload. Please try again.", 502);
  }
}
