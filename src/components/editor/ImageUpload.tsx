"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const MAX_EDGE = 1600;
const QUALITY = 0.82;

/**
 * Resizes and re-encodes a picked image in the browser before uploading.
 *
 * Without this, a phone photo lands in Storage at 5–8 MB and every reader pays
 * for it. Canvas re-encoding gets a typical cover down to a few hundred KB.
 */
async function compress(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", QUALITY),
  );

  // If WebP encoding isn't available, fall back to the original file.
  return blob ?? file;
}

export function ImageUpload({
  bucket,
  name,
  initialUrl,
  label = "Cover image",
  aspect = "h-48",
}: {
  bucket: "covers" | "avatars";
  name: string;
  initialUrl?: string | null;
  label?: string;
  aspect?: string;
}) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("Your session expired — please log in again.");
        return;
      }

      const blob = await compress(file);
      // The storage policy requires the first path segment to be the user id.
      const path = `${user.id}/${crypto.randomUUID()}.webp`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, blob, { contentType: "image/webp", upsert: false });

      if (uploadError) {
        setError(uploadError.message);
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(path);

      setUrl(publicUrl);
    } catch {
      setError("That image could not be processed. Try a different file.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      {/* The uploaded URL travels with the form; the file itself never hits
          the server action. */}
      <input type="hidden" name={name} value={url} />

      {url ? (
        <div className="relative mb-2 overflow-hidden rounded-[10px] border border-border">
          <Image
            src={url}
            alt=""
            width={760}
            height={340}
            className={`w-full object-cover ${aspect}`}
            unoptimized
          />
          <button
            type="button"
            onClick={() => setUrl("")}
            className="absolute right-2 top-2 cursor-pointer rounded-full bg-surface/90 px-3 py-1.5 text-[12.5px] font-semibold text-ink transition-colors hover:bg-surface"
          >
            Remove
          </button>
        </div>
      ) : null}

      <label
        className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-subtle px-4 py-2 text-[13px] font-semibold text-ink-label transition-colors hover:bg-surface ${
          busy ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {busy ? "Uploading…" : url ? `Replace ${label.toLowerCase()}` : `Upload ${label.toLowerCase()}`}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          onChange={onPick}
          className="sr-only"
        />
      </label>

      {error ? (
        <p role="alert" className="mt-1.5 text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
