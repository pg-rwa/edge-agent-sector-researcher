# `feeds.ts` ↔ platform read API — reconciliation (do this before wiring `baseUrl`)

`src/research/feeds.ts` currently calls a feed contract that **does not exist on
the platform**. The platform ships the read feeds as the SDK read client
(`fetchNews`/`fetchFilings`/`fetchMacro`), which is now in your bumped SDK
(`@polytrade-edge/core`, submodule at `b99f5a0`). Point `feeds.ts` at that client
and the sources flip from `needs-platform` → `live`. As-is, every call 404s
(wrong path) or 403s (no `X-Edge-Agent`).

Identifiers already line up: manifest `id: "research-master"` matches the
platform's `READ_CAPABILITY_REGISTRY["research-master"]` granting
`read:news`/`read:filings`/`read:macro`. Only the **wire contract** in `feeds.ts`
is wrong.

## The mismatch

| | `feeds.ts` calls today | Platform actually serves |
| --- | --- | --- |
| Path | `{baseUrl}/feeds/news` etc. | `{baseUrl}/api/read/{news,filings,macro}` |
| Method | `GET ?q=&geo=&sector=` | `POST` JSON body |
| Auth | `Authorization: Bearer {apiKey}` | session **Cookie** + `X-Edge-Agent: research-master` |
| Response envelope | `{ items: [...] }` | `{ items: [...] }` — **already matches** ✓ |
| News item fields | `title, source, url, publishedAt, summary` | SDK `NewsItem` = same fields ✓ (`publishedAt` may be `null`) |
| Filing fields | `title, filer, regulator, url, filedAt` | SDK `Filing` = `form, filer, filedAt, url, title` — **no `regulator`**, has `form` |
| Macro fields | `name, date, kind, expectation` | SDK `MacroEvent` = `event, region, date, value, previous, forecast, seriesId` — **no `name`/`kind`** |

## The fix: make `feeds.ts` a thin adapter over the SDK client

Replace the hand-rolled `get()` + `/feeds/*` calls with the SDK client. Keep your
internal `NewsItem`/`FilingItem`/`MacroEvent` types (the rest of the research
layer depends on them) and map the SDK DTOs into them.

### 1. Config: `FeedConfig` → `ReadClientConfig`
```ts
import { fetchNews as sdkNews, fetchFilings as sdkFilings, fetchMacro as sdkMacro,
         type ReadClientConfig } from "@polytrade-edge/core";

export interface FeedConfig {
  baseUrl: string;                 // e.g. https://edge.polytrade.app  (NO /api suffix)
  cookie?: string;                 // the user's edge_session cookie, forwarded for auth
  fetchImpl?: typeof fetch;
}
const AGENT_ID = "research-master"; // MUST equal the manifest id (capability-checked)

function toReadCfg(cfg: FeedConfig): ReadClientConfig {
  return { baseUrl: cfg.baseUrl, agentId: AGENT_ID, cookie: cfg.cookie, fetchImpl: cfg.fetchImpl };
}
```
Drop `apiKey`/`Authorization: Bearer` — the platform authenticates by the
shared-subdomain session cookie, not a bearer token. (`baseUrl` is the platform
ORIGIN; the SDK client appends `/api/read/...` itself — don't include `/api`.)

### 2. Query mapping (your params → SDK query)
The SDK news/filings queries have no separate `sector` field — fold sector into
the free-text `beat`/`query`:
```ts
const beat = query.sectorId ? `${query.geoId ?? ""} ${query.sectorId}`.trim() : (query.geoId ?? query.q);
// news:    sdkNews(cfg,    { beat: query.q + (sector ? ` ${sector}` : ""), geography: query.geoId ?? "" })
// filings: sdkFilings(cfg, { query: [query.geoId, query.sectorId, "filings"].filter(Boolean).join(" "), geography: query.geoId })
// macro:   sdkMacro(cfg,   { region: query.geoId })
```

### 3. DTO mapping (SDK → your internal types)
```ts
// News — near 1:1; SDK publishedAt can be null, your type wants a string.
(n) => ({ title: n.title, source: n.source, url: n.url || undefined,
          publishedAt: n.publishedAt ?? "", summary: n.summary || undefined })

// Filing — SDK has no `regulator`; EDGAR (the current provider) is the US SEC.
(f) => ({ title: f.title, filer: f.filer, regulator: "SEC",
          url: f.url || undefined, filedAt: f.filedAt })

// Macro — SDK has no `name`/`kind`; derive them.
(m) => ({ name: m.event, date: m.date,
          kind: /cpi|inflation/i.test(m.event) ? "cpi"
              : /rate|fomc|policy/i.test(m.event) ? "rates"
              : /policy/i.test(m.event) ? "policy" : "other",
          expectation: m.forecast ?? m.value ?? undefined })
```

### 4. Error handling
The SDK client returns a typed result, not a throw:
```ts
const r = await sdkNews(toReadCfg(cfg), { beat, geography });
if (!r.ok) {
  // r.status: 401 (no session) · 403 (capability/agent mismatch) · 429 (r.resetAt) · 502 (source down) · 0 (network)
  if (r.status === 429) return [];         // over daily budget — degrade, don't crash
  if (r.status === 502) return [];         // upstream feed unavailable — the honest empty
  throw new Error(`news feed: ${r.status} ${r.error}`);
}
return r.items.map(/* map fn above */);
```
Keep the "not wired" guard for a missing `baseUrl` (it's still the right dev signal).

## Tests
`feeds.test.ts` asserts the "not wired" path — keep that. Add cases that inject a
`fetchImpl` returning `{ items: [...] }` with the **SDK** field shapes (news
`{title,url,source,publishedAt,summary}`, filing `{form,filer,filedAt,url,title}`,
macro `{event,region,date,forecast,...}`) and assert your mapped internal types,
plus that a `429`/`502` status yields `[]` rather than throwing.

## Runtime reality (why it's not live yet even after this)
`feeds.ts` runs on the researcher's **server**, and the SDK client forwards the
user's `edge_session` cookie to the platform. That cookie only reaches both apps
once they're sibling subdomains of `edge.polytrade.app` with
`SESSION_COOKIE_DOMAIN=.edge.polytrade.app` set — see the platform's read-cap
spec. Until this agent is deployed at `research.edge.polytrade.app` and the
platform's `/api/read/*` is deployed, wire + test against a mocked `fetchImpl`.
Also: `macro` needs `FRED_API_KEY` on the platform (absent → the platform returns
`502` and macro degrades to `[]`); news + filings work without it.
