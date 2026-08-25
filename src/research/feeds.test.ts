import { test } from "node:test";
import assert from "node:assert/strict";
import { ResearchMaster } from "../master.js";
import { JuniorResearcher } from "../junior.js";
import { sourcesFor } from "./sources.js";
import { fetchNews, fetchFilings, fetchMacro, type FeedConfig } from "./feeds.js";
import { feedConfigFromEnv } from "./config.js";

const CFG: FeedConfig = { baseUrl: "https://edge.example", cookie: "sess=abc" };

/** Fake fetch keyed on /api/read/* path; responds with the SDK's envelope. */
function fakeFetch(routes: Record<string, { status?: number; body: unknown }>): typeof fetch {
  return (async (url: string) => {
    for (const [path, r] of Object.entries(routes)) {
      if (url === `https://edge.example${path}`) {
        const status = r.status ?? 200;
        return { ok: status < 400, status, json: async () => r.body } as Response;
      }
    }
    return { ok: false, status: 404, json: async () => ({}) } as Response;
  }) as typeof fetch;
}

function spinJunior(market = {
  getXyzPerps: async () => ({}),
}): { m: ResearchMaster } {
  const m = new ResearchMaster();
  m.handle("fintech in India");
  m.handle("payments, NVDA");
  m.handle("months");
  m.handle("daily brief");
  void market;
  return { m };
}

test("fetchers refuse clearly when no feed config is wired", async () => {
  await assert.rejects(fetchNews({ q: "fintech" }, undefined), /not wired/);
  await assert.rejects(fetchFilings({ geoId: "india" }, undefined), /not wired/);
  await assert.rejects(fetchMacro({ geoId: "india" }, undefined), /not wired/);
});

test("fetchNews POSTs the SDK contract with agent header + session cookie", async () => {
  let seenUrl = "";
  let seenInit: RequestInit = {};
  const f = (async (url: string, init: RequestInit) => {
    seenUrl = url;
    seenInit = init;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          { title: "RBI opens UPI to wallets", url: "https://x", source: "Moneycontrol", publishedAt: "2026-08-20T09:00:00Z", summary: "s" },
          { title: "Undated item", url: "https://y", source: "Wire", publishedAt: null, summary: "" },
        ],
      }),
    } as Response;
  }) as typeof fetch;
  const items = await fetchNews({ q: "fintech", geoId: "india", sectorId: "fintech" }, CFG, f);

  assert.equal(seenUrl, "https://edge.example/api/read/news");
  assert.equal(seenInit.method, "POST");
  const headers = seenInit.headers as Record<string, string>;
  assert.equal(headers["X-Edge-Agent"], "research-master");
  assert.equal(headers["Cookie"], "sess=abc");
  // sector folds into the free-text beat, geo maps to geography
  const body = JSON.parse(seenInit.body as string);
  assert.equal(body.beat, "fintech"); // already contains the sector — not duplicated
  assert.equal(body.geography, "india");

  assert.equal(items.length, 2);
  assert.equal(items[0].title, "RBI opens UPI to wallets");
  assert.equal(items[1].publishedAt, null); // null dates pass through
});

test("fetchNews folds a distinct sector into the beat", async () => {
  let body: { beat?: string } = {};
  const f = (async (_url: string, init: RequestInit) => {
    body = JSON.parse(init.body as string);
    return { ok: true, status: 200, json: async () => ({ items: [] }) } as Response;
  }) as typeof fetch;
  await fetchNews({ q: "payments", geoId: "india", sectorId: "fintech" }, CFG, f);
  assert.equal(body.beat, "payments fintech");
});

test("fetchFilings and fetchMacro map SDK DTOs, deriving the gaps", async () => {
  const f = fakeFetch({
    "/api/read/filings": { body: { items: [{ form: "10-Q", filer: "Paytm", filedAt: "2026-08-19", url: "https://z", title: "Q1 results" }] } },
    "/api/read/macro": { body: { items: [{ event: "RBI rate decision", region: "india", date: "2026-09-01", value: null, previous: null, forecast: "hold", seriesId: "X" }] } },
  });
  const filings = await fetchFilings({ geoId: "india" }, CFG, f);
  assert.equal(filings[0].regulator, "SEC"); // derived — the DTO has no regulator field
  assert.equal(filings[0].title, "Q1 results");
  const macro = await fetchMacro({ geoId: "india" }, CFG, f);
  assert.equal(macro[0].kind, "rates"); // derived from the event name
  assert.equal(macro[0].expectation, "hold"); // forecast -> expectation
});

test("429/502 degrade to a graceful empty list, other failures throw", async () => {
  const limited = fakeFetch({ "/api/read/news": { status: 429, body: { error: "rate_limited", resetAt: 123 } } });
  assert.deepEqual(await fetchNews({ q: "x" }, CFG, limited), []);
  const down = fakeFetch({ "/api/read/macro": { status: 502, body: { error: "source_unavailable" } } });
  assert.deepEqual(await fetchMacro({ geoId: "india" }, CFG, down), []);
  const forbidden = fakeFetch({ "/api/read/filings": { status: 403, body: { error: "capability_not_granted" } } });
  await assert.rejects(fetchFilings({ geoId: "india" }, CFG, forbidden), /403/);
});

test("feedConfigFromEnv resolves the platform session or stays undefined", () => {
  assert.equal(feedConfigFromEnv({}), undefined);
  assert.deepEqual(feedConfigFromEnv({ EDGE_PLATFORM_URL: "https://edge.example" }), {
    baseUrl: "https://edge.example",
    cookie: undefined,
  });
  const cfg = feedConfigFromEnv(
    { EDGE_PLATFORM_URL: "https://edge.example", EDGE_SESSION_COOKIE: "env-cookie" },
    "arg-cookie",
  );
  assert.equal(cfg?.cookie, "arg-cookie"); // explicit per-request cookie wins
});

test("sources flip to live when a FeedConfig is wired, and name their fetcher", () => {
  const { m } = spinJunior();
  const spec = m.crew()[0];

  const offline = sourcesFor(spec);
  assert.ok(offline.find((s) => s.id === "news-wire")?.availability === "needs-platform");

  const wired = sourcesFor(spec, CFG);
  for (const id of ["news-wire", "filings", "macro"]) {
    const src = wired.find((s) => s.id === id)!;
    assert.equal(src.availability, "live");
    assert.ok(src.fetcher?.startsWith("fetch"));
    assert.match(src.capability ?? "", /^read:(news|filings|macro)$/);
  }
});

test("deep dive includes wire/filings/macro sections when feeds are live", async () => {
  const { m } = spinJunior();
  const cfg: FeedConfig = {
    baseUrl: "https://edge.example",
    fetchImpl: fakeFetch({
      "/api/read/news": { body: { items: [{ title: "RBI opens UPI to wallets", url: "https://x", source: "Moneycontrol", publishedAt: "2026-08-20T09:00:00Z", summary: "" }] } },
      "/api/read/filings": { body: { items: [{ form: "10-Q", filer: "Paytm", filedAt: "2026-08-19", url: "https://z", title: "Q1 results" }] } },
      "/api/read/macro": { body: { items: [{ event: "RBI rate decision", region: "india", date: "2026-09-01", value: null, previous: null, forecast: "hold", seriesId: "X" }] } },
    }),
  };
  const j = new JuniorResearcher(
    m.crew()[0],
    {
      getXyzPerps: async () => ({
        NVDA: { midPx: 180, markPx: 180.1, oraclePx: 180.05, fundingHourly: 0.00001, maxLeverage: 5 },
      }),
    },
    cfg,
  );
  const r = await j.handle("deep dive");
  assert.match(r.text, /Fresh off the wire/);
  assert.match(r.text, /RBI opens UPI to wallets/);
  assert.match(r.text, /Latest filings/);
  assert.match(r.text, /Paytm → SEC/);
  assert.match(r.text, /Macro calendar/);
  assert.match(r.text, /RBI rate decision/);
  assert.match(r.text, /🟢 live now/);
  assert.doesNotMatch(r.text, /unreachable/);
});

test("deep dive reports a failing feed instead of hiding it", async () => {
  const { m } = spinJunior();
  const cfg: FeedConfig = {
    baseUrl: "https://edge.example",
    fetchImpl: fakeFetch({
      "/api/read/news": { body: { items: [{ title: "RBI opens UPI to wallets", url: "https://x", source: "Moneycontrol", publishedAt: "2026-08-20T09:00:00Z", summary: "" }] } },
      // filings + macro 404
    }),
  };
  const j = new JuniorResearcher(m.crew()[0], { getXyzPerps: async () => ({}) }, cfg);
  const r = await j.handle("deep dive");
  assert.match(r.text, /Fresh off the wire/);
  assert.match(r.text, /filings, macro feeds unreachable/);
});
