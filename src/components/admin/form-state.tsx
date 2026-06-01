const DATABASE_ERROR_PATTERNS = [
  "failed sql statement",
  "foreign key constraint",
  "pg-mem",
  "streaming_links_song_id_fk",
  "insert into streaming_links",
];

function getDisplayError(error: string | null | undefined) {
  if (!error) {
    return null;
  }

  const normalized = error.toLowerCase();

  if (DATABASE_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    return "Backstage could not finish saving that change. Reload Backstage and try again.";
  }

  return error;
}

export function FormStateMessage({
  error,
  success,
}: {
  error?: string | null;
  success?: string | null;
}) {
  const displayError = getDisplayError(error);

  if (!displayError && !success) {
    return null;
  }

  const isError = Boolean(displayError);

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={`rounded-2xl border px-4 py-3 text-sm ${
        isError
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {displayError ?? success}
    </div>
  );
}
