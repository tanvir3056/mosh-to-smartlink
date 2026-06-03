"use client";

import { Upload } from "lucide-react";
import { useId, useRef, useState } from "react";

import { AccountAvatar } from "@/components/admin/account-avatar";
import { Button } from "@/components/ui/button";

interface AvatarUploadResponse {
  avatarUrl?: unknown;
  error?: unknown;
}

function getUploadErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Avatar could not be uploaded. Try again.";
}

export function AvatarUploadControl({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl: string | null;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(avatarUrl);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch("/api/admin/avatar", {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => ({}))) as AvatarUploadResponse;

      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Avatar could not be uploaded. Try again.",
        );
      }

      if (typeof payload.avatarUrl !== "string") {
        throw new Error("Avatar could not be uploaded. Try again.");
      }

      setCurrentAvatarUrl(payload.avatarUrl);
    } catch (uploadError) {
      setError(getUploadErrorMessage(uploadError));
    } finally {
      setIsUploading(false);
      input.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <AccountAvatar
        avatarUrl={currentAvatarUrl}
        username={username}
        className="inline-flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[var(--r-full)] bg-[linear-gradient(140deg,oklch(0.7_0.13_50),oklch(0.55_0.18_18))] text-[17px] font-semibold text-[var(--app-text-on)]"
      />
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
      />
      <div className="grid gap-1.5">
        <Button
          type="button"
          tone="subtle"
          busy={isUploading}
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" />
          Upload avatar
        </Button>
        {error ? (
          <p role="status" className="max-w-[220px] text-[12.5px] leading-5 text-[var(--app-red-text)]">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
