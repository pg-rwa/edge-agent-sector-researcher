/**
 * The source layer: what a junior can actually draw on, and how honestly it
 * is wired. Three availability states, no fakes:
 *
 *  - "live"           — works today: SDK market reads, and platform feeds
 *                       (news / filings / macro) once a FeedConfig is wired.
 *  - "needs-key"      — the code path exists; it needs an API key the Edge
 *                       platform injects (kept out of this repo, out of git).
 *  - "needs-platform" — a feed the Edge platform must expose as a capability;
 *                       juniors say so plainly instead of pretending.
 *
 * The news / filings / macro sources are wired to fetchNews / fetchFilings /
 * fetchMacro in `feeds.ts` and require the read:news / read:filings /
 * read:macro capabilities declared in the agent manifest.
 */
import type { JuniorAgentSpec } from "../master.js";
import type { FeedConfig } from "./feeds.js";

export type SourceAvailability = "live" | "needs-key" | "needs-platform";

export type FeedFetcherId = "fetchNews" | "fetchFilings" | "fetchMacro";

export interface ResearchSource {
  id: string;
  label: string;
  kind: "market-data" | "onchain" | "news" | "filings" | "macro";
  availability: SourceAvailability;
  /** For feed sources: which fetcher in feeds.ts serves this source. */
  fetcher?: FeedFetcherId;
  /** The manifest capability this source consumes, when it has one. */
  capability?: "read:markets" | "read:news" | "read:filings" | "read:macro";
  /** For non-live sources: exactly what wires them up. */
  wiring?: string;
}

export function sourcesFor(spec: JuniorAgentSpec, feeds?: FeedConfig): ResearchSource[] {
  const beat = spec.sector ? `${spec.geography} ${spec.sector}` : `${spec.geography} markets`;
  const feedAvailability: SourceAvailability = feeds?.baseUrl ? "live" : "needs-platform";
  const feedWiring = "Edge platform injects a feed baseUrl at runtime (FeedConfig) — capability declared in the manifest";
  return [
    {
      id: "hl-equity-perps",
      label: "Hyperliquid equity-perp markets — live price, funding, leverage",
      kind: "market-data",
      availability: "live",
      capability: "read:markets",
    },
    {
      id: "rh-chain-pools",
      label: "Robinhood Chain stock-token pools — live spot price",
      kind: "onchain",
      availability: "needs-key",
      capability: "read:markets",
      wiring: "Edge platform injects a Uniswap API key at runtime (never in this repo)",
    },
    {
      id: "news-wire",
      label: `${beat} news wire`,
      kind: "news",
      availability: feedAvailability,
      fetcher: "fetchNews",
      capability: "read:news",
      wiring: feedWiring,
    },
    {
      id: "filings",
      label: `${spec.geography} regulator filings & disclosures`,
      kind: "filings",
      availability: feedAvailability,
      fetcher: "fetchFilings",
      capability: "read:filings",
      wiring: feedWiring,
    },
    {
      id: "macro",
      label: `${spec.geography} macro calendar (rates, CPI, policy)`,
      kind: "macro",
      availability: feedAvailability,
      fetcher: "fetchMacro",
      capability: "read:macro",
      wiring: feedWiring,
    },
  ];
}
