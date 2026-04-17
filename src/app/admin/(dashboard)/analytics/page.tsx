import { SERVICE_LABELS } from "@/lib/constants";
import { getAnalyticsSnapshot } from "@/lib/data";

export default async function AdminAnalyticsPage() {
  const analytics = await getAnalyticsSnapshot();

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Page visits", value: analytics.totalVisits },
          { label: "Unique visitors", value: analytics.uniqueVisitors },
          { label: "Outbound clicks", value: analytics.totalClicks },
        ].map((card) => (
          <div
            key={card.label}
            className="app-card-soft rounded-[1.5rem] p-5"
          >
            <div className="app-kicker">
              {card.label}
            </div>
            <div className="mt-3 text-3xl font-semibold text-[var(--app-text)]">
              {card.value}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="app-card rounded-[1.75rem] p-5">
          <h2 className="text-xl font-semibold text-[var(--app-text)]">Clicks by service</h2>
          <div className="mt-4 grid gap-3">
            {analytics.serviceBreakdown.map((row) => (
              <div
                key={row.service}
                className="flex items-center justify-between rounded-2xl border border-[var(--app-line)] bg-white/78 px-4 py-3"
              >
                <span className="text-[var(--app-text)]">{SERVICE_LABELS[row.service]}</span>
                <span className="font-semibold text-[var(--app-text)]">{row.clicks}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="app-card rounded-[1.75rem] p-5">
          <h2 className="text-xl font-semibold text-[var(--app-text)]">Top referrers</h2>
          <div className="mt-4 grid gap-3">
            {analytics.referrers.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between rounded-2xl border border-[var(--app-line)] bg-white/78 px-4 py-3"
              >
                <span className="text-[var(--app-text)]">{row.label}</span>
                <span className="font-semibold text-[var(--app-text)]">{row.visits}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="app-card rounded-[1.75rem] p-5">
          <h2 className="text-xl font-semibold text-[var(--app-text)]">UTM campaigns</h2>
          <div className="mt-4 grid gap-3">
            {analytics.utms.map((row) => (
              <div
                key={`${row.source}-${row.medium}-${row.campaign}`}
                className="rounded-2xl border border-[var(--app-line)] bg-white/78 px-4 py-3"
              >
                <div className="font-medium text-[var(--app-text)]">{row.source}</div>
                <div className="mt-1 text-sm text-[var(--app-muted)]">
                  {row.medium} • {row.campaign}
                </div>
                <div className="mt-2 text-sm text-[var(--app-text)]">{row.visits} visits</div>
              </div>
            ))}
          </div>
        </div>

        <div className="app-card rounded-[1.75rem] p-5">
          <h2 className="text-xl font-semibold text-[var(--app-text)]">Country and city</h2>
          <div className="mt-4 grid gap-3">
            {analytics.geos.map((row) => (
              <div
                key={`${row.country}-${row.city}`}
                className="flex items-center justify-between rounded-2xl border border-[var(--app-line)] bg-white/78 px-4 py-3"
              >
                <span className="text-[var(--app-text)]">
                  {row.country}
                  {row.city !== "Unknown" ? ` • ${row.city}` : ""}
                </span>
                <span className="font-semibold text-[var(--app-text)]">{row.visits}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="app-card rounded-[1.75rem] p-5">
        <h2 className="text-xl font-semibold text-[var(--app-text)]">Song performance</h2>
        <div className="mt-4 grid gap-3">
          {analytics.songs.map((row) => (
            <div
              key={row.songId}
              className="flex flex-col gap-1 rounded-2xl border border-[var(--app-line)] bg-white/78 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="font-medium text-[var(--app-text)]">{row.title}</div>
                <div className="text-sm text-[var(--app-muted)]">/{row.slug}</div>
              </div>
              <div className="text-sm text-[var(--app-muted)]">
                {row.visits} visits • {row.clicks} clicks
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
