import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth";
import { processArtworkUpload, type ArtworkCropSelection } from "@/lib/artwork";
import { storeArtworkAsset } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_SOURCE_UPLOAD_BYTES = 15 * 1024 * 1024;

function parseCropNumber(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : null;
}

export async function POST(request: Request) {
  const session = await getUserSession();

  if (!session) {
    return NextResponse.json(
      {
        error: "Sign in before uploading artwork.",
      },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const songId = formData.get("songId");

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        error: "No artwork file was provided.",
      },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > MAX_SOURCE_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: "Artwork uploads must be a valid image under 15 MB.",
      },
      { status: 400 },
    );
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      {
        error: "Artwork uploads must be image files.",
      },
      { status: 400 },
    );
  }

  const cropSize = parseCropNumber(formData, "cropSize");
  const sourceX = parseCropNumber(formData, "sourceX");
  const sourceY = parseCropNumber(formData, "sourceY");

  const crop: ArtworkCropSelection | null =
    cropSize !== null && sourceX !== null && sourceY !== null
      ? {
          cropSize,
          sourceX,
          sourceY,
        }
      : null;

  const bytes = new Uint8Array(await file.arrayBuffer());
  let processed: Awaited<ReturnType<typeof processArtworkUpload>>;

  try {
    processed = await processArtworkUpload({
      bytes,
      crop,
    });
  } catch (error) {
    console.error("Artwork upload could not be processed.", error);

    return NextResponse.json(
      {
        error: "Artwork uploads must be valid image files.",
      },
      { status: 400 },
    );
  }

  let stored: Awaited<ReturnType<typeof storeArtworkAsset>>;

  try {
    stored = await storeArtworkAsset({
      ownerUserId: session.userId,
      songId: typeof songId === "string" && songId.length > 0 ? songId : null,
      bytes: processed.bytes,
      mimeType: processed.mimeType,
    });
  } catch (error) {
    console.error("Artwork upload could not be stored.", error);

    return NextResponse.json(
      {
        error: "Artwork could not be saved right now. Please try again.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    artworkUrl: stored.url,
    mode: stored.mode,
  });
}
