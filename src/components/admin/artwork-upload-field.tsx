"use client";
/* eslint-disable @next/next/no-img-element */

import { ImagePlus, LoaderCircle, RotateCcw, Scissors, X, ZoomIn } from "lucide-react";
import { useId, useMemo, useRef, useState, type CSSProperties } from "react";

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
  file: File;
  image: HTMLImageElement;
  imageDataUrl: string;
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
}

const MAX_PROBE_DIMENSION = 1600;
const BACKGROUND_MATCH_THRESHOLD = 0.988;
const COLOR_DISTANCE_THRESHOLD = 44;
const ALPHA_DISTANCE_THRESHOLD = 36;
const FOREGROUND_DISTANCE_THRESHOLD = 54;
const FOREGROUND_ALPHA_THRESHOLD = 30;
const HIGHLIGHT_LUMA_THRESHOLD = 118;
const HIGHLIGHT_CONTRAST_THRESHOLD = 56;
const CONTENT_PADDING_RATIO = 0.08;
const CONTENT_PADDING_MAX = 96;
const FOCUS_PADDING_RATIO = 0.22;
const FOCUS_PADDING_MAX = 180;
const FOCUS_BOUNDS_RATIO = 0.84;
const HIGHLIGHT_BOUNDS_RATIO = 0.44;

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

function getLuminance(pixel: { r: number; g: number; b: number }) {
  return 0.2126 * pixel.r + 0.7152 * pixel.g + 0.0722 * pixel.b;
}

function findHighlightBounds(probe: ProbeImageData): Bounds {
  if (!probe.width || !probe.height) {
    return createFullBounds(1, 1);
  }

  const background = getBackgroundColor(probe);
  const backgroundLuminance = getLuminance(background);
  let minX = probe.width;
  let minY = probe.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < probe.height; y += 1) {
    for (let x = 0; x < probe.width; x += 1) {
      const pixel = samplePixel(probe.data, probe.width, x, y);

      if (pixel.a <= FOREGROUND_ALPHA_THRESHOLD) {
        continue;
      }

      const luminance = getLuminance(pixel);
      const contrast =
        Math.abs(pixel.r - background.r) +
        Math.abs(pixel.g - background.g) +
        Math.abs(pixel.b - background.b);

      if (
        luminance >= Math.max(HIGHLIGHT_LUMA_THRESHOLD, backgroundLuminance + 34) ||
        (luminance >= backgroundLuminance + 18 && contrast >= HIGHLIGHT_CONTRAST_THRESHOLD)
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

function intersectBounds(...bounds: Bounds[]): Bounds {
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

function getBoundsCoverage(bounds: Bounds, width: number, height: number) {
  return (bounds.width * bounds.height) / (width * height);
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
  const highlightBounds = findHighlightBounds(probe);
  const highlightCoverage = getBoundsCoverage(highlightBounds, probe.width, probe.height);
  const foregroundCoverage = getBoundsCoverage(foregroundBounds, probe.width, probe.height);
  const focusCandidate =
    highlightCoverage < HIGHLIGHT_BOUNDS_RATIO
      ? highlightBounds
      : intersectBounds(alphaBounds, foregroundBounds);
  const focusHeightRatio = focusCandidate.height / probe.height;
  const focusWidthRatio = focusCandidate.width / probe.width;
  const mergedBounds =
    focusHeightRatio < FOCUS_BOUNDS_RATIO ||
    focusWidthRatio < FOCUS_BOUNDS_RATIO ||
    foregroundCoverage < FOCUS_BOUNDS_RATIO
      ? expandBounds(
          focusCandidate,
          probe.width,
          probe.height,
          FOCUS_PADDING_RATIO,
          FOCUS_PADDING_MAX,
        )
      : expandBounds(
          intersectBounds(alphaBounds, backgroundBounds, foregroundBounds),
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
  };
}

function getSuggestedCropSession(
  file: File,
  image: HTMLImageElement,
  imageDataUrl: string,
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
    file,
    image,
    imageDataUrl,
    centerX: geometry.centerX,
    centerY: geometry.centerY,
    zoom: geometry.zoom,
    defaultCenterX: geometry.centerX,
    defaultCenterY: geometry.centerY,
    defaultZoom: geometry.zoom,
    maxZoom,
  };
}

function normalizeCropSession(session: CropSession): CropSession {
  const geometry = getCropGeometry(session.image, session);

  return {
    ...session,
    centerX: geometry.centerX,
    centerY: geometry.centerY,
    zoom: geometry.zoom,
  };
}

function getArtworkFrameStyle(
  session: CropSession,
  geometry: CropGeometry,
): CSSProperties {
  return {
    width: `${(session.image.naturalWidth / geometry.cropSize) * 100}%`,
    height: `${(session.image.naturalHeight / geometry.cropSize) * 100}%`,
    left: `${-(geometry.sourceX / geometry.cropSize) * 100}%`,
    top: `${-(geometry.sourceY / geometry.cropSize) * 100}%`,
  };
}

async function uploadArtworkSelection(input: {
  file: File;
  songId: string | null;
  crop: CropGeometry;
}) {
  const formData = new FormData();
  formData.set("file", input.file);

  if (input.songId) {
    formData.set("songId", input.songId);
  }

  formData.set("sourceX", String(input.crop.sourceX));
  formData.set("sourceY", String(input.crop.sourceY));
  formData.set("cropSize", String(input.crop.cropSize));

  const response = await fetch("/api/admin/artwork", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json()) as {
    artworkUrl?: string;
    error?: string;
  };

  if (!response.ok || !payload.artworkUrl) {
    throw new Error(payload.error || "The artwork upload failed.");
  }

  return payload.artworkUrl;
}

export function ArtworkUploadField({
  value,
  onChange,
  songId,
}: {
  value: string;
  onChange: (value: string) => void;
  songId: string | null;
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
    surfaceSize: number;
  } | null>(null);

  const cropGeometry = useMemo(() => {
    if (!cropSession) {
      return null;
    }

    return getCropGeometry(cropSession.image, cropSession);
  }, [cropSession]);

  const artworkFrameStyle = useMemo(() => {
    if (!cropSession || !cropGeometry) {
      return undefined;
    }

    return getArtworkFrameStyle(cropSession, cropGeometry);
  }, [cropGeometry, cropSession]);

  const updateCropSession = (
    updater: (current: CropSession) => Partial<CropSession>,
  ) => {
    setCropSession((current) =>
      current ? normalizeCropSession({ ...current, ...updater(current) }) : current,
    );
  };

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
            Pick an image, drag the crop, and the server handles the final square export and compression.
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
              setCropSession(
                getSuggestedCropSession(file, image, imageDataUrl),
              );
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

      {cropSession && cropGeometry && artworkFrameStyle ? (
        <div className="fixed inset-0 z-[70] bg-[rgba(7,9,12,0.7)] px-4 py-6 backdrop-blur-[3px]">
          <div className="mx-auto grid max-h-full w-full max-w-4xl gap-5 overflow-auto rounded-[2rem] border border-white/10 bg-[#0f131a] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:p-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="grid gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/42">
                    Crop artwork
                  </p>
                  <h3 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-white">
                    Choose the final square cover
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-7 text-white/58">
                    Drag the image to reposition it. Use zoom only if you want a tighter crop.
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

              <div
                role="img"
                aria-label="Artwork crop editor"
                className="relative mx-auto aspect-square w-full max-w-[440px] touch-none overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#090c11] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                onPointerDown={(event) => {
                  dragState.current = {
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startY: event.clientY,
                    centerX: cropSession.centerX,
                    centerY: cropSession.centerY,
                    surfaceSize: event.currentTarget.getBoundingClientRect().width,
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
                  const scaleBase = Math.max(dragState.current.surfaceSize, 1);
                  const nextCenterX =
                    dragState.current.centerX - (deltaX / scaleBase) * cropGeometry.cropSize;
                  const nextCenterY =
                    dragState.current.centerY - (deltaY / scaleBase) * cropGeometry.cropSize;

                  updateCropSession(() => ({
                    centerX: nextCenterX,
                    centerY: nextCenterY,
                  }));
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
                onWheel={(event) => {
                  event.preventDefault();
                  const direction = event.deltaY < 0 ? 0.16 : -0.16;
                  updateCropSession((current) => ({
                    zoom: current.zoom + direction,
                  }));
                }}
              >
                <img
                  src={cropSession.imageDataUrl}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  className="pointer-events-none absolute max-w-none select-none"
                  style={artworkFrameStyle}
                />
                <div className="absolute inset-0 border border-white/14" />
                <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-white/12" />
                <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/12" />
              </div>
            </div>

            <div className="grid content-start gap-4">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/42">
                  Final cover
                </p>
                <div className="relative mt-3 aspect-square overflow-hidden rounded-[1.2rem] border border-white/10 bg-[#090c11]">
                  <img
                    src={cropSession.imageDataUrl}
                    alt=""
                    aria-hidden="true"
                    draggable={false}
                    className="pointer-events-none absolute max-w-none select-none"
                    style={artworkFrameStyle}
                  />
                </div>
                <div className="mt-3 text-xs leading-6 text-white/52">
                  {cropSession.image.naturalWidth}×{cropSession.image.naturalHeight} source
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/10 bg-[#0b0f15] p-4">
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
                      updateCropSession(() => ({ zoom }));
                    }}
                  />
                </label>
              </div>

              <div className="flex flex-col gap-3 border-t border-white/10 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    updateCropSession((current) => ({
                      centerX: current.defaultCenterX,
                      centerY: current.defaultCenterY,
                      zoom: current.defaultZoom,
                    }))
                  }
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 text-sm font-semibold text-white/82 transition hover:bg-white/10"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset suggested crop
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
                        const nextValue = await uploadArtworkSelection({
                          file: cropSession.file,
                          songId,
                          crop: cropGeometry,
                        });
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
