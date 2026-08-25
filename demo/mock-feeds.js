/**
 * Mock platform feeds for the UI demo — serves SDK-shaped /api/read/*
 * responses so the juniors' news/filings/macro sections are fully visible
 * before the platform deploys the real endpoints. Demo-only: the real
 * FeedConfig comes from feedConfigFromEnv() in production.
 */
export const MOCK_FEEDS = {
  baseUrl: "https://edge.polytrade.app",
  fetchImpl: async (url, init) => {
    const body = JSON.parse(init?.body ?? "{}");
    const geo = body.geography ?? body.region ?? "global";
    const payloads = {
      "/api/read/news": {
        items: [
          { title: `${geo} regulator opens sandbox for digital-asset pilots`, url: "https://example.com/1", source: "Edge Wire", publishedAt: "2026-08-22T08:30:00Z", summary: "Sandbox cohorts expand to payments and tokenized assets." },
          { title: `Sector funding in ${geo} hits a quarterly high`, url: "https://example.com/2", source: "Market Daily", publishedAt: "2026-08-21T14:05:00Z", summary: "Late-stage rounds lead the tape." },
          { title: `Incumbent banks strike partnerships with ${geo} challengers`, url: "https://example.com/3", source: "Finance Post", publishedAt: "2026-08-20T09:12:00Z", summary: "Distribution over disruption, this cycle." },
        ],
      },
      "/api/read/filings": {
        items: [
          { form: "10-Q", filer: "Example Corp", filedAt: "2026-08-19", url: "https://example.com/f1", title: "Quarterly report — Q2 2026" },
          { form: "8-K", filer: "Example Holdings", filedAt: "2026-08-15", url: "https://example.com/f2", title: "Material agreement disclosure" },
        ],
      },
      "/api/read/macro": {
        items: [
          { event: "Central bank rate decision", region: geo, date: "2026-09-01", value: null, previous: "5.50%", forecast: "hold", seriesId: "DEMO1" },
          { event: "CPI inflation YoY", region: geo, date: "2026-09-10", value: null, previous: "3.1%", forecast: "3.0%", seriesId: "DEMO2" },
        ],
      },
    };
    const path = new URL(url).pathname;
    const payload = payloads[path];
    return payload
      ? { ok: true, status: 200, json: async () => payload }
      : { ok: false, status: 404, json: async () => ({}) };
  },
};
