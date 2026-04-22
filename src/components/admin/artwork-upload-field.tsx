"use client";

import { ImagePlus, LoaderCircle, RotateCcw, Scissors, X, ZoomIn } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";

const MAX_ARTWORK_DIMENSION = 1200;
const TARGET_ARTWORK_BYTES = 450 * 1024;
const QUALITY_STEPS = [0.86, 0.8, 0.74, 0.68, 0.6] as const;
const FINAL_QUALITY_STEP = QUALITY_STEPS[QUALITY_STEPS.length - 1];
const PREVIEW_SIZE = 300;

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

interface CropSession {
  image: HTMLImageElement;
  imageDataUrl: string;
  fileName: string;
  centerX: number;
  centerY: number;
  zoom: number;
  defaultCenterX: number;
  defaultCenterY: number;
  defaultZoom: number;
  maxZoom: number;
}

interface CropGeometry {
  centerX: number;
  centerY: number;
  zoom: number;
  cropSize: number;
  sourceX: number;
  sourceY: number;
  outputSize: number;
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

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createFullBounds(width: number, height: number): Bounds {
  return {
    x: 0,
    y: 0,
    width,
    height,
  };
}

function scaleBounds(
  bounds: Bounds,
  source: { width: number; height: number },
  target: { width: number; height: number },
): Bounds {
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
  const mergedBounds =
    focusHeightRatio < FOCUS_BOUNDS_RATIO || focusWidthRatio < FOCUS_BOUNDS_RATIO
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

function getMaxZoom(image: HTMLImageElement) {
  const baseCropSize = Math.min(image.naturalWidth, image.naturalHeight);
  return Math.max(1, Math.min(8, baseCropSize / 140));
}

function getCropGeometry(
  image: HTMLImageElement,
  crop: Pick<CropSession, "centerX" | "centerY" | "zoom">,
): CropGeometry {
  const baseCropSize = Math.min(image.naturalWidth, image.naturalHeight);
  const zoom = clamp(crop.zoom, 1, getMaxZoom(image));
  const cropSize = baseCropSize / zoom;
  const half = cropSize / 2;
  const centerX = clamp(crop.centerX, half, image.naturalWidth - half);
  const centerY = clamp(crop.centerY, half, image.naturalHeight - half);
  const sourceX = clamp(centerX - half, 0, image.naturalWidth - cropSize);
  const sourceY = clamp(centerY - half, 0, image.naturalHeight - cropSize);

  return {
    centerX,
    centerY,
    zoom,
    cropSize,
    sourceX,
    sourceY,
    outputSize: Math.max(1, Math.min(Math.round(cropSize), MAX_ARTWORK_DIMENSION)),
  };
}

function getSuggestedCropSession(
  image: HTMLImageElement,
  imageDataUrl: string,
  fileName: string,
): CropSession {
  const bounds = getVisibleBounds(image);
  const maxZoom = getMaxZoom(image);
  const baseCropSize = Math.min(image.naturalWidth, image.naturalHeight);
  const focusSize = Math.max(bounds.width, bounds.height);
  const desiredCropSize = clamp(focusSize, 160, baseCropSize);
  const zoom = clamp(baseCropSize / desiredCropSize, 1, maxZoom);
  const geometry = getCropGeometry(image, {
    centerX: bounds.x + bounds.width / 2,
    centerY: bounds.y + bounds.height / 2,
    zoom,
  });

  return {
    image,
    imageDataUrl,
    fileName,
    centerX: geometry.centerX,
    centerY: geometry.centerY,
    zoom: geometry.zoom,
    defaultCenterX: geometry.centerX,
    defaultCenterY: geometry.centerY,
    defaultZoom: geometry.zoom,
    maxZoom,
  };
}

async function exportArtwork(
  image: HTMLImageElement,
  crop: Pick<CropSession, "centerX" | "centerY" | "zoom">,
) {
  const geometry = getCropGeometry(image, crop);
  const canvas = document.createElement("canvas");
  canvas.width = geometry.outputSize;
  canvas.height = geometry.outputSize;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("The browser could not process this image.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.fillStyle = "#0b0d11";
  context.fillRect(0, 0, geometry.outputSize, geometry.outputSize);
  context.drawImage(
    image,
    Math.round(geometry.sourceX),
    Math.round(geometry.sourceY),
    Math.round(geometry.cropSize),
    Math.round(geometry.cropSize),
    0,
    0,
    geometry.outputSize,
    geometry.outputSize,
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
  const [cropSession, setCropSession] = useState<CropSession | null>(null);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    centerX: number;
    centerY: number;
  } | null>(null);

  const cropGeometry = useMemo(() => {
    if (!cropSession) {
      return null;
    }

    return getCropGeometry(cropSession.image, cropSession);
  }, [cropSession]);

  const previewStyle =
    cropSession && cropGeometry
      ? {
          backgroundImage: `url(${cropSession.imageDataUrl})`,
          backgroundSize: `${(cropSession.image.naturalWidth / cropGeometry.cropSize) * PREVIEW_SIZE}px ${(cropSession.image.naturalHeight / cropGeometry.cropSize) * PREVIEW_SIZE}px`,
          backgroundPosition: `${-(cropGeometry.sourceX / cropGeometry.cropSize) * PREVIEW_SIZE}px ${-(cropGeometry.sourceY / cropGeometry.cropSize) * PREVIEW_SIZE}px`,
        }
      : undefined;

  return (
    <>
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
            {busy ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            Upload artwork manually
          </label>
          <span className="text-xs leading-6 text-[var(--app-muted)]">
            Uploads are automatically compressed. After choosing a file, you can drag and zoom the square crop before saving.
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
              const imageDataUrl = await fileToDataUrl(file);
              const image = await loadImage(imageDataUrl);
              setCropSession(getSuggestedCropSession(image, imageDataUrl, file.name));
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

      {cropSession && cropGeometry ? (
        <div className="fixed inset-0 z-[70] bg-[rgba(7,9,12,0.7)] px-4 py-6 backdrop-blur-[3px]">
          <div className="mx-auto grid max-h-full w-full max-w-4xl gap-5 overflow-auto rounded-[2rem] border border-white/10 bg-[#0f131a] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:p-6 lg:grid-cols-[340px_minmax(0,1fr)]">
            <div>
              <div
                role="img"
                aria-label="Artwork crop preview"
                className="relative mx-auto aspect-square w-full max-w-[300px] touch-none overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#090c11] bg-no-repeat shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                style={previewStyle}
                onPointerDown={(event) => {
                  dragState.current = {
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startY: event.clientY,
                    centerX: cropSession.centerX,
                    centerY: cropSession.centerY,
                  };
                  event.currentTarget.setPointerCapture(event.pointerId);
                }}
                onPointerMove={(event) => {
                  if (
                    !dragState.current ||
                    dragState.current.pointerId !== event.pointerId
                  ) {
                    return;
                  }

                  const deltaX = event.clientX - dragState.current.startX;
                  const deltaY = event.clientY - dragState.current.startY;
                  const nextCenterX =
                    dragState.current.centerX - (deltaX / PREVIEW_SIZE) * cropGeometry.cropSize;
                  const nextCenterY =
                    dragState.current.centerY - (deltaY / PREVIEW_SIZE) * cropGeometry.cropSize;

                  setCropSession((current) =>
                    current
                      ? {
                          ...current,
                          centerX: nextCenterX,
                          centerY: nextCenterY,
                        }
                      : current,
                  );
                }}
                onPointerUp={(event) => {
                  if (dragState.current?.pointerId === event.pointerId) {
                    dragState.current = null;
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
                onPointerCancel={(event) => {
                  if (dragState.current?.pointerId === event.pointerId) {
                    dragState.current = null;
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
              >
                <div className="absolute inset-0 border border-white/14" />
                <div className="pointer-events-none absolute inset-[14%] rounded-[1.35rem] border border-white/28 shadow-[0_0_0_999px_rgba(7,9,12,0.18)]" />
                <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/12" />
                <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/12" />
              </div>

              <p className="mt-3 text-center text-xs leading-6 text-white/52">
                Drag the artwork preview to reposition it inside the square.
              </p>
            </div>

            <div className="grid gap-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/42">
                    Artwork crop
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                    Choose exactly what fans see
                  </h3>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-white/58">
                    Sparse artwork and black-heavy covers can fool auto-crop. Adjust the square manually, then the final image is exported as a compressed WebP for faster public loads.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setCropSession(null)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/72 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close crop editor"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-white">
                    <ZoomIn className="h-4 w-4 text-white/58" />
                    Zoom
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={cropSession.maxZoom}
                    step={0.01}
                    value={cropSession.zoom}
                    onChange={(event) => {
                      const zoom = Number.parseFloat(event.target.value);
                      setCropSession((current) =>
                        current
                          ? {
                              ...current,
                              zoom,
                            }
                          : current,
                      );
                    }}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-white">Horizontal position</span>
                  <input
                    type="range"
                    min={cropGeometry.cropSize / 2}
                    max={cropSession.image.naturalWidth - cropGeometry.cropSize / 2}
                    step={1}
                    value={cropGeometry.centerX}
                    onChange={(event) => {
                      const centerX = Number.parseFloat(event.target.value);
                      setCropSession((current) =>
                        current
                          ? {
                              ...current,
                              centerX,
                            }
                          : current,
                      );
                    }}
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium text-white">Vertical position</span>
                  <input
                    type="range"
                    min={cropGeometry.cropSize / 2}
                    max={cropSession.image.naturalHeight - cropGeometry.cropSize / 2}
                    step={1}
                    value={cropGeometry.centerY}
                    onChange={(event) => {
                      const centerY = Number.parseFloat(event.target.value);
                      setCropSession((current) =>
                        current
                          ? {
                              ...current,
                              centerY,
                            }
                          : current,
                      );
                    }}
                  />
                </label>
              </div>

              <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setCropSession((current) =>
                      current
                        ? {
                            ...current,
                            centerX: current.defaultCenterX,
                            centerY: current.defaultCenterY,
                            zoom: current.defaultZoom,
                          }
                        : current,
                    )
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 text-sm font-semibold text-white/82 transition hover:bg-white/10"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset auto crop
                </button>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => setCropSession(null)}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-transparent px-4 text-sm font-semibold text-white/72 transition hover:bg-white/6 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setBusy(true);
                      setError(null);

                      try {
                        const nextValue = await exportArtwork(cropSession.image, cropSession);
                        onChange(nextValue);
                        setCropSession(null);
                      } catch (nextError) {
                        setError(
                          nextError instanceof Error
                            ? nextError.message
                            : "The artwork upload failed.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                    disabled={busy}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-[#10141b] transition hover:bg-[#f1ede3] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Scissors className="h-4 w-4" />
                    )}
                    Apply crop
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
