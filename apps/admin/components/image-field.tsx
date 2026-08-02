"use client";

import { useId, useRef, useState } from "react";
import { cn } from "@repo/ui/utils";
import { controlClass } from "./ui";

/**
 * Pick-a-picture field.
 *
 * The value the surrounding form submits is always a URL in a hidden input,
 * exactly as before — but the Publisher gets a file picker, drag-and-drop and
 * a live preview instead of being asked to produce a URL from somewhere. The
 * upload happens immediately against /api/uploads so the preview is truthful:
 * what you see is the image already stored, not a local object URL that would
 * vanish if the form failed to save.
 *
 * Pasting a URL is still possible, behind a link — it's the escape hatch for
 * an image already hosted elsewhere (and the only route for SVG, which the
 * upload endpoint refuses).
 */
export function ImageField({
  name,
  label,
  help,
  defaultValue,
  shape = "cover",
}: {
  name: string;
  label: string;
  help?: string;
  defaultValue?: string | null;
  /** Preview proportions — a book cover is tall, a banner is wide. */
  shape?: "cover" | "wide" | "square";
}) {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultValue ?? "");
  const [status, setStatus] = useState<"idle" | "uploading">("idle");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  async function upload(file: File) {
    setStatus("uploading");
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/uploads", { method: "POST", body });
      const payload: unknown = await response.json().catch(() => null);
      const message =
        payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : null;

      if (!response.ok) {
        setError(message ?? "Upload failed. Please try again.");
        return;
      }
      const uploaded =
        payload && typeof payload === "object" && "url" in payload && typeof payload.url === "string"
          ? payload.url
          : null;
      if (!uploaded) {
        setError("Upload finished but no image came back. Please try again.");
        return;
      }
      setUrl(uploaded);
      setShowUrlInput(false);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setStatus("idle");
    }
  }

  const previewBox =
    shape === "cover" ? "h-40 w-[6.75rem]" : shape === "square" ? "h-32 w-32" : "h-28 w-full max-w-xs";

  return (
    <div>
      <span className="block text-sm font-semibold text-ink">{label}</span>
      {help && <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{help}</p>}

      {/* What the form actually posts. */}
      <input type="hidden" name={name} value={url} />

      <div className="mt-2 flex flex-wrap items-start gap-4">
        <div
          className={cn(
            "grid shrink-0 place-items-center overflow-hidden rounded-btn border bg-tile",
            previewBox,
            url ? "border-line" : "border-dashed border-line-strong"
          )}
        >
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="px-2 text-center text-[11px] font-semibold leading-tight text-ink-subtle">No image</span>
          )}
        </div>

        <div className="min-w-[15rem] flex-1">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files?.[0];
              if (file) void upload(file);
            }}
            className={cn(
              "rounded-btn border border-dashed p-4 text-center transition-colors",
              dragging ? "border-brand bg-brand-soft" : "border-line-strong bg-tile-3"
            )}
          >
            <input
              ref={fileRef}
              id={inputId}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                // Let the same file be re-picked after an error.
                event.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={status === "uploading"}
              onClick={() => fileRef.current?.click()}
              className="rounded-btn bg-brand px-3.5 py-2 text-sm font-bold text-on-brand transition-colors hover:bg-brand-press disabled:opacity-60"
            >
              {status === "uploading" ? "Uploading…" : url ? "Choose a different image" : "Choose an image"}
            </button>
            <p className="mt-2 text-[12px] leading-snug text-ink-muted">
              or drag one here · JPG, PNG, WebP, GIF or AVIF · up to 4 MB
            </p>
          </div>

          {error && (
            <p role="alert" className="mt-2 text-[13px] font-medium text-sale">
              {error}
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
            <button
              type="button"
              onClick={() => setShowUrlInput((open) => !open)}
              className="font-semibold text-brand hover:underline"
            >
              {showUrlInput ? "Hide link box" : "Use a link instead"}
            </button>
            {url && (
              <button
                type="button"
                onClick={() => {
                  setUrl("");
                  setError(null);
                }}
                className="font-semibold text-sale hover:underline"
              >
                Remove image
              </button>
            )}
          </div>

          {showUrlInput && (
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example.com/cover.jpg"
              aria-label={`${label} — image link`}
              className={cn(controlClass, "mt-2")}
            />
          )}
        </div>
      </div>
    </div>
  );
}
