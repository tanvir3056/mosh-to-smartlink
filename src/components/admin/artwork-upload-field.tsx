"use client";

import { ImagePlus, LoaderCircle } from "lucide-react";
import { useId, useState } from "react";

const MAX_ARTWORK_DIMENSION = 1200;
const TARGET_ARTWORK_BYTES = 450 * 1024;
const QUALITY_STEPS = [0.86, 0.8, 0.74, 0.68, 0.6] as const;
const FINAL_QUALITY_STEP = QUALITY_STEPS[QUALITY_STEPS.length - 1];

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

async function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("The artwork file could not be processed."));
    reader.readAsDataURL(blob);
  });
}

async function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("The browser could not encode this image."));
          return;
        }

        resolve(blob);
      },
      "image/webp",
      quality,
    );
  });
}

function getVisibleBounds(image: HTMLImageElement) {
  const probeCanvas = document.createElement("canvas");
  probeCanvas.width = image.naturalWidth;
  probeCanvas.height = image.naturalHeight;

  const context = probeCanvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return {
      x: 0,
      y: 0,
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  }

  context.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);
  const { data, width, height } = context.getImageData(
    0,
    0,
    image.naturalWidth,
    image.naturalHeight,
  );

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const alpha = data[index + 3];

      if (alpha > 16) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return {
      x: 0,
      y: 0,
      width: image.naturalWidth,
      height: image.naturalHeight,
    };
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

async function compressArtwork(file: File) {
  const dataUrl = await fileToDataUrl(file);
  const image = await loadImage(dataUrl);
  const bounds = getVisibleBounds(image);
  const cropSize = Math.min(bounds.width, bounds.height);
  const outputSize = Math.max(1, Math.min(cropSize, MAX_ARTWORK_DIMENSION));
  const sourceX = Math.max(
    0,
    Math.round(bounds.x + (bounds.width - cropSize) / 2),
  );
  const sourceY = Math.max(
    0,
    Math.round(bounds.y + (bounds.height - cropSize) / 2),
  );

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("The browser could not process this image.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = "#0b0d11";
  context.fillRect(0, 0, outputSize, outputSize);
  context.drawImage(
    image,
    sourceX,
    sourceY,
    cropSize,
    cropSize,
    0,
    0,
    outputSize,
    outputSize,
  );

  for (const quality of QUALITY_STEPS) {
    const blob = await canvasToBlob(canvas, quality);

    if (blob.size <= TARGET_ARTWORK_BYTES || quality === FINAL_QUALITY_STEP) {
      return blobToDataUrl(blob);
    }
  }

  throw new Error("The artwork file could not be optimized.");
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
          Large uploads are trimmed, square-cropped, compressed automatically, and stored directly with the song page in V1.
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
