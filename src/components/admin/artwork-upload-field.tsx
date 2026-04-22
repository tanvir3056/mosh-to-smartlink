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

interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ProbeImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

const MAX_PROBE_DIMENSION = 1600;
const BACKGROUND_MATCH_THRESHOLD = 0.988;
const COLOR_DISTANCE_THRESHOLD = 44;
const ALPHA_DISTANCE_THRESHOLD = 36;
const FOREGROUND_DISTANCE_THRESHOLD = 54;
const FOREGROUND_ALPHA_THRESHOLD = 30;
const CONTENT_PADDING_RATIO = 0.08;
const CONTENT_PADDING_MAX = 96;
const FOCUS_PADDING_RATIO = 0.22;
const FOCUS_PADDING_MAX = 180;
const FOCUS_BOUNDS_RATIO = 0.84;

function createFullBounds(width: number, height: number): Bounds {
  return {
    x: 0,
    y: 0,
    width,
    height,
  };
}

function scaleBounds(bounds: Bounds, source: { width: number; height: number }, target: { width: number; height: number }): Bounds {
  return {
    x: Math.max(0, Math.round((bounds.x / source.width) * target.width)),
    y: Math.max(0, Math.round((bounds.y / source.height) * target.height)),
    width: Math.max(1, Math.round((bounds.width / source.width) * target.width)),
    height: Math.max(1, Math.round((bounds.height / source.height) * target.height)),
  };
}

function getProbeImageData(image: HTMLImageElement): ProbeImageData {
  const probeCanvas = document.createElement("canvas");
  const scale =
    Math.min(1, MAX_PROBE_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight)) || 1;

  probeCanvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  probeCanvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

  const context = probeCanvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return {
      data: new Uint8ClampedArray(0),
      width: 0,
      height: 0,
    };
  }

  context.drawImage(image, 0, 0, probeCanvas.width, probeCanvas.height);
  const { data, width, height } = context.getImageData(0, 0, probeCanvas.width, probeCanvas.height);

  return { data, width, height };
}

function findAlphaBounds({ data, width, height }: ProbeImageData): Bounds {
  if (!width || !height) {
    return createFullBounds(1, 1);
  }

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
    return createFullBounds(width, height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function samplePixel(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const index = (y * width + x) * 4;
  return {
    r: data[index],
    g: data[index + 1],
    b: data[index + 2],
    a: data[index + 3],
  };
}

function getBackgroundColor({ data, width, height }: ProbeImageData) {
  const sampleRadius = Math.max(1, Math.min(12, Math.floor(Math.min(width, height) * 0.04)));
  const corners = [
    { startX: 0, startY: 0 },
    { startX: Math.max(0, width - sampleRadius), startY: 0 },
    { startX: 0, startY: Math.max(0, height - sampleRadius) },
    {
      startX: Math.max(0, width - sampleRadius),
      startY: Math.max(0, height - sampleRadius),
    },
  ];

  const totals = { r: 0, g: 0, b: 0, a: 0, count: 0 };

  for (const corner of corners) {
    for (let y = corner.startY; y < Math.min(height, corner.startY + sampleRadius); y += 1) {
      for (let x = corner.startX; x < Math.min(width, corner.startX + sampleRadius); x += 1) {
        const pixel = samplePixel(data, width, x, y);
        totals.r += pixel.r;
        totals.g += pixel.g;
        totals.b += pixel.b;
        totals.a += pixel.a;
        totals.count += 1;
      }
    }
  }

  if (totals.count === 0) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  return {
    r: totals.r / totals.count,
    g: totals.g / totals.count,
    b: totals.b / totals.count,
    a: totals.a / totals.count,
  };
}

function isBackgroundLikePixel(
  pixel: { r: number; g: number; b: number; a: number },
  background: { r: number; g: number; b: number; a: number },
) {
  if (pixel.a <= 16) {
    return true;
  }

  const colorDistance =
    Math.abs(pixel.r - background.r) +
    Math.abs(pixel.g - background.g) +
    Math.abs(pixel.b - background.b);
  const alphaDistance = Math.abs(pixel.a - background.a);

  return (
    colorDistance <= COLOR_DISTANCE_THRESHOLD &&
    alphaDistance <= ALPHA_DISTANCE_THRESHOLD
  );
}

function isMostlyBackgroundRow(
  probe: ProbeImageData,
  background: { r: number; g: number; b: number; a: number },
  y: number,
) {
  let matches = 0;
  let samples = 0;

  for (let x = 0; x < probe.width; x += 2) {
    const pixel = samplePixel(probe.data, probe.width, x, y);
    if (isBackgroundLikePixel(pixel, background)) {
      matches += 1;
    }
    samples += 1;
  }

  return samples > 0 && matches / samples >= BACKGROUND_MATCH_THRESHOLD;
}

function isMostlyBackgroundColumn(
  probe: ProbeImageData,
  background: { r: number; g: number; b: number; a: number },
  x: number,
) {
  let matches = 0;
  let samples = 0;

  for (let y = 0; y < probe.height; y += 2) {
    const pixel = samplePixel(probe.data, probe.width, x, y);
    if (isBackgroundLikePixel(pixel, background)) {
      matches += 1;
    }
    samples += 1;
  }

  return samples > 0 && matches / samples >= BACKGROUND_MATCH_THRESHOLD;
}

function findBackgroundBounds(probe: ProbeImageData): Bounds {
  if (!probe.width || !probe.height) {
    return createFullBounds(1, 1);
  }

  const background = getBackgroundColor(probe);
  let top = 0;
  let bottom = probe.height - 1;
  let left = 0;
  let right = probe.width - 1;

  while (top < bottom && isMostlyBackgroundRow(probe, background, top)) {
    top += 1;
  }

  while (bottom > top && isMostlyBackgroundRow(probe, background, bottom)) {
    bottom -= 1;
  }

  while (left < right && isMostlyBackgroundColumn(probe, background, left)) {
    left += 1;
  }

  while (right > left && isMostlyBackgroundColumn(probe, background, right)) {
    right -= 1;
  }

  return {
    x: left,
    y: top,
    width: Math.max(1, right - left + 1),
    height: Math.max(1, bottom - top + 1),
  };
}

function findForegroundBounds(probe: ProbeImageData): Bounds {
  if (!probe.width || !probe.height) {
    return createFullBounds(1, 1);
  }

  const background = getBackgroundColor(probe);
  let minX = probe.width;
  let minY = probe.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < probe.height; y += 1) {
    for (let x = 0; x < probe.width; x += 1) {
      const pixel = samplePixel(probe.data, probe.width, x, y);
      const colorDistance =
        Math.abs(pixel.r - background.r) +
        Math.abs(pixel.g - background.g) +
        Math.abs(pixel.b - background.b);
      const alphaDistance = Math.abs(pixel.a - background.a);

      if (
        pixel.a > FOREGROUND_ALPHA_THRESHOLD &&
        (colorDistance > FOREGROUND_DISTANCE_THRESHOLD ||
          alphaDistance > ALPHA_DISTANCE_THRESHOLD)
      ) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    return createFullBounds(probe.width, probe.height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

function mergeBounds(...bounds: Bounds[]): Bounds {
  const minX = Math.max(...bounds.map((bound) => bound.x));
  const minY = Math.max(...bounds.map((bound) => bound.y));
  const maxX = Math.min(...bounds.map((bound) => bound.x + bound.width));
  const maxY = Math.min(...bounds.map((bound) => bound.y + bound.height));

  if (maxX <= minX || maxY <= minY) {
    return bounds[0];
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function expandBounds(
  bounds: Bounds,
  width: number,
  height: number,
  paddingRatio: number,
  paddingMax: number,
) {
  const padding = Math.min(
    paddingMax,
    Math.round(Math.max(bounds.width, bounds.height) * paddingRatio),
  );
  const x = Math.max(0, bounds.x - padding);
  const y = Math.max(0, bounds.y - padding);
  const maxX = Math.min(width, bounds.x + bounds.width + padding);
  const maxY = Math.min(height, bounds.y + bounds.height + padding);

  return {
    x,
    y,
    width: Math.max(1, maxX - x),
    height: Math.max(1, maxY - y),
  };
}

function getVisibleBounds(image: HTMLImageElement) {
  const probe = getProbeImageData(image);

  if (!probe.width || !probe.height) {
    return createFullBounds(image.naturalWidth, image.naturalHeight);
  }

  const alphaBounds = findAlphaBounds(probe);
  const backgroundBounds = findBackgroundBounds(probe);
  const foregroundBounds = findForegroundBounds(probe);
  const focusBounds = mergeBounds(alphaBounds, foregroundBounds);
  const focusHeightRatio = focusBounds.height / probe.height;
  const focusWidthRatio = focusBounds.width / probe.width;
  const shouldPreferFocusedCrop =
    focusHeightRatio < FOCUS_BOUNDS_RATIO || focusWidthRatio < FOCUS_BOUNDS_RATIO;
  const mergedBounds = shouldPreferFocusedCrop
    ? expandBounds(
        focusBounds,
        probe.width,
        probe.height,
        FOCUS_PADDING_RATIO,
        FOCUS_PADDING_MAX,
      )
    : expandBounds(
        mergeBounds(alphaBounds, backgroundBounds, foregroundBounds),
        probe.width,
        probe.height,
        CONTENT_PADDING_RATIO,
        CONTENT_PADDING_MAX,
      );

  return scaleBounds(
    mergedBounds,
    { width: probe.width, height: probe.height },
    { width: image.naturalWidth, height: image.naturalHeight },
  );
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
