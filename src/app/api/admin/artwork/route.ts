import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth";
import { storeArtworkAsset } from "@/lib/storage";

export const runtime = "nodejs";

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

  const mimeType = file.type || "image/webp";

  if (mimeType !== "image/webp") {
    return NextResponse.json(
      {
        error: "Artwork uploads must be exported as WebP.",
      },
      { status: 400 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const stored = await storeArtworkAsset({
    ownerUserId: session.userId,
    songId: typeof songId === "string" && songId.length > 0 ? songId : null,
    bytes,
    mimeType,
  });

  return NextResponse.json({
    ok: true,
    artworkUrl: stored.url,
    mode: stored.mode,
  });
}
