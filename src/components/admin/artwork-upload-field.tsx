"use client";

import { ImagePlus, LoaderCircle } from "lucide-react";
import { useId, useState } from "react";

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("The artwork file could not be read."));
    reader.readAsDataURL(file);
  });
}

async function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The uploaded file is not a valid image."));
    image.src = dataUrl;
  });
}

async function compressArtwork(file: File) {
  const dataUrl = await fileToDataUrl(file);
  const image = await loadImage(dataUrl);
  const maxSide = 1600;
  const largestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = largestSide > maxSide ? maxSide / largestSide : 1;
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("The browser could not process this image.");
  }

  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/webp", 0.9);
}

export function ArtworkUploadField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const inputId = useId();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid gap-3">
      <label className="grid gap-2">
        <span className="text-sm font-medium text-[var(--app-text)]">Artwork URL</span>
        <input
          name="artwork_url"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="app-input"
        />
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label
          htmlFor={inputId}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[var(--app-line)] bg-white px-4 text-sm font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-panel-muted)]"
        >
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          Upload artwork manually
        </label>
        <span className="text-xs leading-6 text-[var(--app-muted)]">
          Large uploads are resized automatically and stored directly with the song page in V1.
        </span>
      </div>

      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={async (event) => {
          const file = event.target.files?.[0];

          if (!file) {
            return;
          }

          setBusy(true);
          setError(null);

          try {
            const nextValue = await compressArtwork(file);
            onChange(nextValue);
          } catch (nextError) {
            setError(
              nextError instanceof Error
                ? nextError.message
                : "The artwork upload failed.",
            );
          } finally {
            setBusy(false);
            event.target.value = "";
          }
        }}
      />

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}
    </div>
  );
}
