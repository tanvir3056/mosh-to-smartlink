import type {
  EmailCaptureConfig,
  ResolvedEmailCaptureConfig,
  SongPageWithLinks,
} from "@/lib/types";

function cleanValue(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeLeadEmail(value: string) {
  return value.trim().toLowerCase();
}

export function splitConnectorTags(value: string | null | undefined) {
  const unique = new Set<string>();

  for (const entry of (value ?? "").split(",")) {
    const trimmed = entry.trim();

    if (trimmed) {
      unique.add(trimmed);
    }
  }

  return [...unique];
}

export function resolveEmailCaptureConfig(
  page: Pick<SongPageWithLinks, "song" | "emailCapture">,
): ResolvedEmailCaptureConfig {
  const capture: EmailCaptureConfig = page.emailCapture;
  const downloadUrl = cleanValue(capture.downloadUrl);
  const hasDownload = Boolean(downloadUrl);
  const title = cleanValue(capture.title);
  const description = cleanValue(capture.description);
  const buttonLabel = cleanValue(capture.buttonLabel);
  const downloadLabel = cleanValue(capture.downloadLabel);
  const tag = cleanValue(capture.tag);

  return {
    enabled: capture.enabled,
    title:
      title ??
      (hasDownload ? "Download the song for free" : `Stay in the loop with ${page.song.artistName}`),
    description:
      description ??
      (hasDownload
        ? `Drop your email to unlock ${page.song.title} and hear about future releases first.`
        : `Join the list for new music, early drops, and release updates from ${page.song.artistName}.`),
    buttonLabel:
      buttonLabel ?? (hasDownload ? "Get the download" : "Join the list"),
    downloadUrl,
    downloadLabel: downloadLabel ?? (hasDownload ? `Download ${page.song.title}` : "Open reward"),
    tag,
    badgeLabel: hasDownload ? "Free download" : "Email capture",
  };
}
