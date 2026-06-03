import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth";
import { processArtworkUpload } from "@/lib/artwork";
import { updateUserAvatarUrl } from "@/lib/data";
import { storeArtworkAsset } from "@/lib/storage";

export const runtime = "nodejs";

const MAX_AVATAR_UPLOAD_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const session = await getUserSession();

  if (!session) {
    return NextResponse.json(
      {
        error: "Sign in before uploading an avatar.",
      },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      {
        error: "No avatar file was provided.",
      },
      { status: 400 },
    );
  }

  if (file.size <= 0 || file.size > MAX_AVATAR_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error: "Avatar uploads must be a valid image under 8 MB.",
      },
      { status: 400 },
    );
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      {
        error: "Avatar uploads must be image files.",
      },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  let processed: Awaited<ReturnType<typeof processArtworkUpload>>;

  try {
    processed = await processArtworkUpload({
      bytes,
      crop: null,
    });
  } catch (error) {
    console.error("Avatar upload could not be processed.", error);

    return NextResponse.json(
      {
        error: "Avatar uploads must be valid image files.",
      },
      { status: 400 },
    );
  }

  let stored: Awaited<ReturnType<typeof storeArtworkAsset>>;

  try {
    stored = await storeArtworkAsset({
      ownerUserId: session.userId,
      songId: null,
      bytes: processed.bytes,
      mimeType: processed.mimeType,
    });
  } catch (error) {
    console.error("Avatar upload could not be stored.", error);

    return NextResponse.json(
      {
        error: "Avatar could not be saved right now. Please try again.",
      },
      { status: 500 },
    );
  }

  try {
    await updateUserAvatarUrl(session.userId, stored.url);
  } catch (error) {
    console.error("Avatar URL could not be saved.", error);

    return NextResponse.json(
      {
        error: "Avatar could not be saved right now. Please try again.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    avatarUrl: stored.url,
    mode: stored.mode,
  });
}
