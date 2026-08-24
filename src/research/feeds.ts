/**
 * Platform feed fetchers — thin adapter over the SDK's read client
 * (`fetchNews` / `fetchFilings` / `fetchMacro` from @polytrade-edge/core),
 * keeping this repo's internal DTOs.
 *
 * Transport (the platform contract): POST {baseUrl}/api/read/* with the
 * calling agent identified via the `X-Edge-Agent` header and the user's
 * session cookie forwarded for server-to-server auth. No Bearer token —
 * the cookie comes from the platform session at runtime, never from this
 * repo or git.
 *
 * Honest runtime caveat: even fully wired, these feeds are not live until
 * the agent app and the platform run as sibling *.edge.polytrade.app
 * subdomains with SESSION_COOKIE_DOMAIN set and /api/read/* deployed.
 * Until then, wire + test against a mocked fetchImpl. The macro feed
 * additionally needs FRED_API_KEY on the platform side (else it degrades
 * to an empty list).
 */
import {
  fetchFilings as sdkFetchFilings,
  fetchMacro as sdkFetchMacro,
  fetchNews as sdkFetchNews,
  type ReadClientConfig,
  type ReadClientResult,
} from "@polytrade-edge/core";
import manifest from "../agent.manifest.js";

export interface FeedConfig {
  /** Platform origin, e.g. https://edge.polytrade.app */
  baseUrl: string;
  /** The user's session cookie, forwarded by the platform session. */
  cookie?: string;
  /** Injectable fetch — the platform (or tests) can supply their own. */
  fetchImpl?: typeof fetch;
}

export interface NewsItem {
  title: string;
  source: string;
  url?: string;
  /** ISO date, or null when the source didn't provide one. */
  publishedAt: string | null;
  summary?: string;
}

export interface FilingItem {
  title: string;
  filer: string;
  /** The SDK's Filing DTO has no regulator field; the platform's filings
   *  feed is SEC-backed, so it defaults to "SEC". */
  regulator: string;
  url?: string;
  filedAt: string;
}

export interface MacroEvent {
  name: string;
  date: string; // ISO
  kind: "rates" | "cpi" | "policy" | "other";
  expectation?: string;
}

function clientConfig(cfg: FeedConfig): ReadClientConfig {
  return { baseUrl: cfg.baseUrl, agentId: manifest.id, cookie: cfg.cookie, fetchImpl: cfg.fetchImpl };
}

/**
 * Unwraps the SDK's typed result. 429 (rate-limited) and 502 (source
 * unavailable) degrade to a graceful empty list; anything else throws so
 * callers can report the failure honestly. A missing config refuses loudly.
 */
function unwrap<R>(result: ReadClientResult<R>, feed: string): R[] {
  if (result.ok) return result.items;
  if (result.status === 429 || result.status === 502) return [];
  throw new Error(`${feed} feed failed: ${result.status} ${result.error}`);
}

function requireCfg(cfg: FeedConfig | undefined, feed: string): FeedConfig {
  if (!cfg?.baseUrl) {
    throw new Error(`${feed} feed not wired: the Edge platform must expose /api/read/* (capability + baseUrl)`);
  }
  return cfg;
}

/** Fold an optional sector into the SDK's free-text beat/query field. */
function foldSector(text: string, sectorId?: string | null): string {
  if (!sectorId) return text;
  return text.toLowerCase().includes(sectorId.toLowerCase()) ? text : `${text} ${sectorId}`;
}

function macroKind(eventName: string): MacroEvent["kind"] {
  if (/rate|interest|fomc|central bank|yield/i.test(eventName)) return "rates";
  if (/cpi|inflation|pce|price/i.test(eventName)) return "cpi";
  if (/policy|budget|election|tariff|fiscal/i.test(eventName)) return "policy";
  return "other";
}

export async function fetchNews(
  query: { q: string; geoId?: string; sectorId?: string | null },
  cfg: FeedConfig | undefined,
  fetchImpl?: typeof fetch,
): Promise<NewsItem[]> {
  const c = requireCfg(cfg, "news");
  const result = await sdkFetchNews(
    { ...clientConfig(c), fetchImpl: fetchImpl ?? c.fetchImpl },
    { beat: foldSector(query.q, query.sectorId), geography: query.geoId ?? "global" },
  );
  return unwrap(result, "news").map((n) => ({
    title: n.title,
    source: n.source,
    url: n.url,
    publishedAt: n.publishedAt,
    summary: n.summary || undefined,
  }));
}

export async function fetchFilings(
  query: { geoId: string; sectorId?: string | null },
  cfg: FeedConfig | undefined,
  fetchImpl?: typeof fetch,
): Promise<FilingItem[]> {
  const c = requireCfg(cfg, "filings");
  const result = await sdkFetchFilings(
    { ...clientConfig(c), fetchImpl: fetchImpl ?? c.fetchImpl },
    { query: foldSector(query.geoId, query.sectorId), geography: query.geoId },
  );
  return unwrap(result, "filings").map((f) => ({
    title: f.title,
    filer: f.filer,
    regulator: "SEC",
    url: f.url,
    filedAt: f.filedAt,
  }));
}

export async function fetchMacro(
  query: { geoId: string },
  cfg: FeedConfig | undefined,
  fetchImpl?: typeof fetch,
): Promise<MacroEvent[]> {
  const c = requireCfg(cfg, "macro");
  const result = await sdkFetchMacro(
    { ...clientConfig(c), fetchImpl: fetchImpl ?? c.fetchImpl },
    { region: query.geoId },
  );
  return unwrap(result, "macro").map((m) => ({
    name: m.event,
    date: m.date,
    kind: macroKind(m.event),
    expectation: m.forecast ?? undefined,
  }));
}
