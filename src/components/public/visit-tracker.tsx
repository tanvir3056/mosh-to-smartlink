function escapeForInlineScript(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export function VisitTracker({
  username,
  slug,
  path,
  searchString,
}: {
  username: string;
  slug: string;
  path: string;
  searchString: string;
}) {
  const payload = escapeForInlineScript({
    username,
    slug,
    path,
    searchString,
  });

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (() => {
            const payload = ${payload};
            const cacheKey = [payload.username, payload.slug, payload.path, payload.searchString].join("::");

            if (window.__ffmLastTrackedVisit === cacheKey) {
              return;
            }

            window.__ffmLastTrackedVisit = cacheKey;

            const body = JSON.stringify({
              ...payload,
              referrer: document.referrer || null,
            });

            fetch("/api/analytics/visit", {
              method: "POST",
              headers: {
                "content-type": "application/json",
              },
              body,
              keepalive: true,
            }).catch(() => {});
          })();
        `,
      }}
    />
  );
}
