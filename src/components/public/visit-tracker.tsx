function escapeForInlineScript(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

export function VisitTracker({
  username,
  slug,
}: {
  username: string;
  slug: string;
}) {
  const payload = escapeForInlineScript({
    username,
    slug,
  });

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (() => {
            const payload = ${payload};
            const path = window.location.pathname;
            const searchString = window.location.search.startsWith("?")
              ? window.location.search.slice(1)
              : window.location.search;
            const cacheKey = [payload.username, payload.slug, path, searchString].join("::");

            if (window.__ffmLastTrackedVisit === cacheKey) {
              return;
            }

            window.__ffmLastTrackedVisit = cacheKey;

            const body = JSON.stringify({
              ...payload,
              path,
              searchString,
              referrer: document.referrer || null,
            });

            const sendVisit = () => {
              fetch("/api/analytics/visit", {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                },
                body,
                keepalive: true,
              }).catch(() => {});
            };

            if ("requestIdleCallback" in window) {
              window.requestIdleCallback(sendVisit, { timeout: 1200 });
              return;
            }

            window.setTimeout(sendVisit, 0);
          })();
        `,
      }}
    />
  );
}
