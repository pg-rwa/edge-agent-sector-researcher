import { test } from "node:test";
import assert from "node:assert/strict";
import { ResearchMaster } from "../master.js";
import { JuniorResearcher } from "../junior.js";
import { sourcesFor } from "./sources.js";
import { fetchNews, fetchFilings, fetchMacro, type FeedConfig } from "./feeds.js";

const CFG: FeedConfig = { baseUrl: "https://feeds.example", apiKey: "k" };

function fakeFetch(routes: Record<string, unknown>): typeof fetch {
  return (async (url: string) => {
    for (const [path, body] of Object.entries(routes)) {
      if (url.startsWith(`https://feeds.example${path}`)) {
        return { ok: true, json: async () => body } as Response;
      }
    }
    return { ok: false, status: 404 } as Response;
  }) as typeof fetch;
}

test("fetchers refuse clearly when no feed config is wired", async () => {
  await assert.rejects(fetchNews({ q: "fintech" }, undefined), /not wired/);
  await assert.rejects(fetchFilings({ geoId: "india" }, undefined), /not wired/);
  await assert.rejects(fetchMacro({ geoId: "india" }, undefined), /not wired/);
});

test("fetchNews parses items and passes geo/sector query params", async () => {
  let seen = "";
  const f = (async (url: string) => {
    seen = url;
    return {
      ok: true,
      json: async () => ({
        items: [
          { title: "RBI opens UPI to wallets", source: "Moneycontrol", publishedAt: "2026-08-20T09:00:00Z" },
          { title: 42 }, // malformed — dropped
        ],
      }),
    } as Response;
  }) as typeof fetch;
  const items = await fetchNews({ q: "fintech", geoId: "india", sectorId: "fintech" }, CFG, f);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "RBI opens UPI to wallets");
  assert.match(seen, /q=fintech/);
  assert.match(seen, /geo=india/);
  assert.match(seen, /sector=fintech/);
});

test("fetchFilings and fetchMacro parse their shapes", async () => {
  const f = fakeFetch({
    "/feeds/filings": { items: [{ title: "Q1 results", filer: "Paytm", regulator: "SEBI", filedAt: "2026-08-19" }] },
    "/feeds/macro": { items: [{ name: "RBI rate decision", date: "2026-09-01", kind: "rates", expectation: "hold" }] },
  });
  const filings = await fetchFilings({ geoId: "india" }, CFG, f);
  assert.equal(filings[0].regulator, "SEBI");
  const macro = await fetchMacro({ geoId: "india" }, CFG, f);
  assert.equal(macro[0].kind, "rates");
});

test("sources flip to live when a FeedConfig is wired, and name their fetcher", () => {
  const m = new ResearchMaster();
  m.handle("fintech in India");
  m.handle("payments");
  m.handle("months");
  m.handle("daily brief");
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
  const m = new ResearchMaster();
  m.handle("fintech in India");
  m.handle("payments, NVDA");
  m.handle("months");
  m.handle("daily brief");
  const cfg: FeedConfig = {
    baseUrl: "https://feeds.example",
    fetchImpl: fakeFetch({
      "/feeds/news": { items: [{ title: "RBI opens UPI to wallets", source: "Moneycontrol", publishedAt: "2026-08-20T09:00:00Z" }] },
      "/feeds/filings": { items: [{ title: "Q1 results", filer: "Paytm", regulator: "SEBI", filedAt: "2026-08-19" }] },
      "/feeds/macro": { items: [{ name: "RBI rate decision", date: "2026-09-01", kind: "rates", expectation: "hold" }] },
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
  assert.match(r.text, /Paytm → SEBI/);
  assert.match(r.text, /Macro calendar/);
  assert.match(r.text, /RBI rate decision/);
  assert.match(r.text, /🟢 live now/);
  assert.match(r.text, /news wire/);
  assert.doesNotMatch(r.text, /unreachable/);
});

test("deep dive reports a failing feed instead of hiding it", async () => {
  const m = new ResearchMaster();
  m.handle("fintech in India");
  m.handle("payments");
  m.handle("months");
  m.handle("daily brief");
  const cfg: FeedConfig = {
    baseUrl: "https://feeds.example",
    fetchImpl: fakeFetch({
      "/feeds/news": { items: [{ title: "RBI opens UPI to wallets", source: "Moneycontrol", publishedAt: "2026-08-20T09:00:00Z" }] },
      // filings + macro 404
    }),
  };
  const j = new JuniorResearcher(m.crew()[0], { getXyzPerps: async () => ({}) }, cfg);
  const r = await j.handle("deep dive");
  assert.match(r.text, /Fresh off the wire/);
  assert.match(r.text, /filings, macro feeds unreachable/);
});
