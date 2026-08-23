/**
 * Platform feed fetchers — news, filings, macro. These call HTTP endpoints
 * the Edge platform exposes to agents holding the read:news / read:filings /
 * read:macro capabilities. No endpoint configured => the fetcher refuses
 * with a clear error; a feed is "live" only when the platform wires it.
 *
 * Endpoints (platform contract, v1):
 *   GET {baseUrl}/feeds/news?q=<query>&geo=<geoId>&sector=<sectorId>
 *   GET {baseUrl}/feeds/filings?geo=<geoId>&sector=<sectorId>
 *   GET {baseUrl}/feeds/macro?geo=<geoId>
 * Auth: optional Bearer key injected by the platform at runtime — never in
 * this repo, never in git.
 */

export interface FeedConfig {
  /** Platform feed gateway, e.g. https://edge.polytrade.example/api */
  baseUrl: string;
  /** Optional bearer token injected by the platform session. */
  apiKey?: string;
  /** Injectable fetch — the platform (or tests) can supply their own. */
  fetchImpl?: typeof fetch;
}

export interface NewsItem {
  title: string;
  source: string;
  url?: string;
  publishedAt: string; // ISO
  summary?: string;
}

export interface FilingItem {
  title: string;
  filer: string;
  regulator: string;
  url?: string;
  filedAt: string; // ISO
}

export interface MacroEvent {
  name: string;
  date: string; // ISO
  kind: "rates" | "cpi" | "policy" | "other";
  expectation?: string;
}

function headers(cfg: FeedConfig): Record<string, string> {
  return {
    Accept: "application/json",
    ...(cfg.apiKey ? { Authorization: `Bearer ${cfg.apiKey}` } : {}),
  };
}

async function get<T>(
  cfg: FeedConfig | undefined,
  path: string,
  params: Record<string, string | undefined>,
  parse: (body: unknown) => T[],
  fetchImpl: typeof fetch,
): Promise<T[]> {
  if (!cfg?.baseUrl) {
    throw new Error(`${path} feed not wired: the Edge platform must expose it (capability + baseUrl)`);
  }
  const qs = new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => !!e[1]),
  );
  const res = await fetchImpl(`${cfg.baseUrl}${path}?${qs}`, { headers: headers(cfg) });
  if (!res.ok) throw new Error(`${path} feed failed: ${res.status}`);
  return parse(await res.json());
}

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

function asArray(body: unknown, key: string): unknown[] {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object" && Array.isArray((body as Record<string, unknown>)[key])) {
    return (body as Record<string, unknown[]>)[key];
  }
  return [];
}

export function fetchNews(
  query: { q: string; geoId?: string; sectorId?: string | null },
  cfg: FeedConfig | undefined,
  fetchImpl: typeof fetch = cfg?.fetchImpl ?? fetch,
): Promise<NewsItem[]> {
  return get(
    cfg,
    "/feeds/news",
    { q: query.q, geo: query.geoId, sector: query.sectorId ?? undefined },
    (body) =>
      asArray(body, "items").flatMap((raw) => {
        const r = raw as Record<string, unknown>;
        const title = asString(r.title);
        const publishedAt = asString(r.publishedAt) ?? asString(r.published_at);
        return title && publishedAt
          ? [{
              title,
              source: asString(r.source) ?? "unknown",
              url: asString(r.url),
              publishedAt,
              summary: asString(r.summary),
            }]
          : [];
      }),
    fetchImpl,
  );
}

export function fetchFilings(
  query: { geoId: string; sectorId?: string | null },
  cfg: FeedConfig | undefined,
  fetchImpl: typeof fetch = cfg?.fetchImpl ?? fetch,
): Promise<FilingItem[]> {
  return get(
    cfg,
    "/feeds/filings",
    { geo: query.geoId, sector: query.sectorId ?? undefined },
    (body) =>
      asArray(body, "items").flatMap((raw) => {
        const r = raw as Record<string, unknown>;
        const title = asString(r.title);
        const filedAt = asString(r.filedAt) ?? asString(r.filed_at);
        return title && filedAt
          ? [{
              title,
              filer: asString(r.filer) ?? "unknown",
              regulator: asString(r.regulator) ?? "unknown",
              url: asString(r.url),
              filedAt,
            }]
          : [];
      }),
    fetchImpl,
  );
}

export function fetchMacro(
  query: { geoId: string },
  cfg: FeedConfig | undefined,
  fetchImpl: typeof fetch = cfg?.fetchImpl ?? fetch,
): Promise<MacroEvent[]> {
  const KINDS = new Set(["rates", "cpi", "policy", "other"]);
  return get(
    cfg,
    "/feeds/macro",
    { geo: query.geoId },
    (body) =>
      asArray(body, "items").flatMap((raw) => {
        const r = raw as Record<string, unknown>;
        const name = asString(r.name);
        const date = asString(r.date);
        const kind = asString(r.kind);
        return name && date
          ? [{
              name,
              date,
              kind: (KINDS.has(kind ?? "") ? kind : "other") as MacroEvent["kind"],
              expectation: asString(r.expectation),
            }]
          : [];
      }),
    fetchImpl,
  );
}
