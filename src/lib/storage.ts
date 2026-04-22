import { createHash } from "node:crypto";

import { createAdminSupabaseClient } from "@/lib/auth";
import { appEnv } from "@/lib/env";
import { createId } from "@/lib/utils";

const ARTWORK_BUCKET = "artwork";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

let artworkBucketPromise: Promise<void> | null = null;

function isBucketExistsError(error: { message?: string; statusCode?: string | number } | null) {
  if (!error) {
    return false;
  }

  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("already exists") ||
    message.includes("duplicate") ||
    error.statusCode === 409 ||
    error.statusCode === "409"
  );
}

async function ensureArtworkBucket() {
  if (!appEnv.hasSupabaseAdmin) {
    return;
  }

  if (!artworkBucketPromise) {
    artworkBucketPromise = (async () => {
      const supabase = createAdminSupabaseClient();
      const created = await supabase.storage.createBucket(ARTWORK_BUCKET, {
        public: true,
        allowedMimeTypes: ["image/webp"],
        fileSizeLimit: `${MAX_UPLOAD_BYTES}`,
      });

      if (created.error && !isBucketExistsError(created.error)) {
        throw new Error(created.error.message);
      }

      const updated = await supabase.storage.updateBucket(ARTWORK_BUCKET, {
        public: true,
        allowedMimeTypes: ["image/webp"],
        fileSizeLimit: `${MAX_UPLOAD_BYTES}`,
      });

      if (updated.error && !isBucketExistsError(updated.error)) {
        throw new Error(updated.error.message);
      }
    })().catch((error) => {
      artworkBucketPromise = null;
      throw error;
    });
  }

  await artworkBucketPromise;
}

function toDataUrl(bytes: Uint8Array, mimeType: string) {
  return `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
}

function createArtworkPath(ownerUserId: string, songId: string | null, bytes: Uint8Array) {
  const checksum = createHash("sha1").update(bytes).digest("hex").slice(0, 12);
  const scope = songId ? `${ownerUserId}/${songId}` : ownerUserId;
  return `${scope}/${createId("artwork")}-${checksum}.webp`;
}

export async function storeArtworkAsset(input: {
  ownerUserId: string;
  songId: string | null;
  bytes: Uint8Array;
  mimeType: string;
}) {
  if (!appEnv.hasSupabaseAdmin) {
    return {
      url: toDataUrl(input.bytes, input.mimeType),
      storagePath: null,
      mode: "inline" as const,
    };
  }

  await ensureArtworkBucket();

  const supabase = createAdminSupabaseClient();
  const path = createArtworkPath(input.ownerUserId, input.songId, input.bytes);
  const upload = await supabase.storage
    .from(ARTWORK_BUCKET)
    .upload(path, input.bytes, {
      contentType: input.mimeType,
      cacheControl: "31536000",
      upsert: false,
    });

  if (upload.error) {
    throw new Error(upload.error.message);
  }

  const { data } = supabase.storage.from(ARTWORK_BUCKET).getPublicUrl(path);

  return {
    url: data.publicUrl,
    storagePath: path,
    mode: "storage" as const,
  };
}
