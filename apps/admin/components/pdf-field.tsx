"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@repo/ui/utils";

/**
 * Pick-a-PDF field, for the e-book file a customer downloads after buying.
 *
 * Mirrors ImageField's shape — the form only ever submits plain hidden
 * inputs — but the bytes never touch the app server: the browser asks
 * `/api/uploads/ebook` for a one-time signed URL and `PUT`s the file
 * straight to the private Supabase `ebooks` bucket, so there's no upload
 * size ceiling. The preview is truthful: what you see named here is the file
 * already stored, not a local handle that would vanish if the form failed.
 */
export function PdfField({
  name,
  label,
  help,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  help?: string;
  defaultValue?: { path: string; fileName: string; sizeBytes: number } | null;
  /** Block the form's submit, with the browser's own message, until a PDF is stored. */
  required?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const requiredRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue ?? null);
  const [status, setStatus] = useState<"idle" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);

  // Hidden inputs are skipped by browser validation, so `required` is
  // carried by an invisible text input mirroring the stored path; this
  // swaps its generic "fill in this field" bubble for plain wording.
  useEffect(() => {
    requiredRef.current?.setCustomValidity(value ? "" : "Please upload the PDF file.");
  }, [value]);

  async function upload(file: File) {
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      setError("Please choose a PDF file.");
      return;
    }
    setStatus("uploading");
    setError(null);
    try {
      const signRes = await fetch("/api/uploads/ebook", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileName: file.name, sizeBytes: file.size }),
      });
      const signed: unknown = await signRes.json().catch(() => null);
      const message =
        signed && typeof signed === "object" && "error" in signed && typeof signed.error === "string"
          ? signed.error
          : null;
      if (!signRes.ok) {
        setError(message ?? "Couldn't start the upload. Please try again.");
        return;
      }
      const path = signed && typeof signed === "object" && "path" in signed ? String(signed.path) : "";
      const uploadUrl =
        signed && typeof signed === "object" && "uploadUrl" in signed ? String(signed.uploadUrl) : "";
      if (!path || !uploadUrl) {
        setError("Upload couldn't be prepared. Please try again.");
        return;
      }

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "content-type": "application/pdf", "x-upsert": "true" },
        body: file,
      });
      if (!putRes.ok) {
        setError("The file didn't finish uploading. Please try again.");
        return;
      }
      setValue({ path, fileName: file.name, sizeBytes: file.size });
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <div>
      <span className="block text-sm font-semibold text-ink">
        {label}
        {required && (
          <span className="ml-1 text-sale" aria-hidden>
            *
          </span>
        )}
      </span>
      {help && <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{help}</p>}

      {/* What the form actually posts. */}
      <input type="hidden" name={`${name}Path`} value={value?.path ?? ""} />
      <input type="hidden" name={`${name}Name`} value={value?.fileName ?? ""} />
      <input type="hidden" name={`${name}Size`} value={value?.sizeBytes ?? ""} />

      <div className="relative mt-2 rounded-btn border border-dashed border-line-strong bg-tile-3 p-4">
        {required && (
          <input
            ref={requiredRef}
            aria-hidden
            tabIndex={-1}
            required
            value={value?.path ?? ""}
            onChange={() => {}}
            className="pointer-events-none absolute bottom-0 left-1/2 h-px w-px opacity-0"
          />
        )}
        {value ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-btn border border-line bg-ground px-3 py-1.5 text-sm font-semibold text-ink">
              <span aria-hidden>📄</span>
              <span className="max-w-[22rem] truncate">{value.fileName}</span>
              <span className="text-[12px] font-normal text-ink-subtle">{formatBytes(value.sizeBytes)}</span>
            </span>
            <button
              type="button"
              disabled={status === "uploading"}
              onClick={() => fileRef.current?.click()}
              className="text-[13px] font-semibold text-brand hover:underline disabled:opacity-60"
            >
              {status === "uploading" ? "Uploading…" : "Replace PDF"}
            </button>
            <button
              type="button"
              onClick={() => {
                setValue(null);
                setError(null);
              }}
              className="text-[13px] font-semibold text-sale hover:underline"
            >
              Remove PDF
            </button>
          </div>
        ) : (
          <div className="text-center">
            <button
              type="button"
              disabled={status === "uploading"}
              onClick={() => fileRef.current?.click()}
              className="rounded-btn bg-brand px-3.5 py-2 text-sm font-bold text-on-brand transition-colors hover:bg-brand-press disabled:opacity-60"
            >
              {status === "uploading" ? "Uploading…" : "Choose a PDF"}
            </button>
            <p className="mt-2 text-[12px] leading-snug text-ink-muted">PDF only · uploaded straight to secure storage</p>
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />
      </div>

      {error && (
        <p role="alert" className={cn("mt-2 text-[13px] font-medium text-sale")}>
          {error}
        </p>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
