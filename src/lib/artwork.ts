import sharp from "sharp";

const MAX_ARTWORK_DIMENSION = 1200;
const TARGET_ARTWORK_BYTES = 450 * 1024;
const QUALITY_STEPS = [86, 80, 74, 68, 60] as const;

export interface ArtworkCropSelection {
  cropSize: number;
  sourceX: number;
  sourceY: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function normalizeCropSelection(
  selection: ArtworkCropSelection | null | undefined,
  width: number,
  height: number,
) {
  const maxCropSize = Math.max(1, Math.min(width, height));

  if (!selection) {
    const cropSize = maxCropSize;
    return {
      cropSize,
      sourceX: Math.max(0, Math.floor((width - cropSize) / 2)),
      sourceY: Math.max(0, Math.floor((height - cropSize) / 2)),
    };
  }

  const cropSize = clamp(Math.round(selection.cropSize), 1, maxCropSize);
  return {
    cropSize,
    sourceX: clamp(Math.round(selection.sourceX), 0, Math.max(0, width - cropSize)),
    sourceY: clamp(Math.round(selection.sourceY), 0, Math.max(0, height - cropSize)),
  };
}

export async function processArtworkUpload(input: {
  bytes: Uint8Array;
  crop: ArtworkCropSelection | null;
}) {
  const image = sharp(input.bytes, {
    failOn: "none",
    limitInputPixels: false,
  }).rotate();

  const metadata = await image.metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (!width || !height) {
    throw new Error("The uploaded file is not a valid image.");
  }

  const crop = normalizeCropSelection(input.crop, width, height);
  let lastBuffer: Buffer | null = null;

  for (const quality of QUALITY_STEPS) {
    const buffer = await image
      .clone()
      .extract({
        left: crop.sourceX,
        top: crop.sourceY,
        width: crop.cropSize,
        height: crop.cropSize,
      })
      .resize({
        width: MAX_ARTWORK_DIMENSION,
        height: MAX_ARTWORK_DIMENSION,
        fit: "cover",
      })
      .webp({
        quality,
        effort: 4,
      })
      .toBuffer();

    lastBuffer = buffer;

    if (buffer.byteLength <= TARGET_ARTWORK_BYTES || quality === QUALITY_STEPS.at(-1)) {
      return {
        bytes: new Uint8Array(buffer),
        mimeType: "image/webp" as const,
      };
    }
  }

  if (!lastBuffer) {
    throw new Error("The artwork file could not be optimized.");
  }

  return {
    bytes: new Uint8Array(lastBuffer),
    mimeType: "image/webp" as const,
  };
}
