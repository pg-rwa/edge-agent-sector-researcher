/**
 * Runtime wiring for the platform feeds. When the agent is deployed on a
 * sibling *.edge.polytrade.app subdomain, the platform session provides the
 * pieces — no code change needed, the juniors' news/filings/macro sources
 * flip from "needs-platform" to "live".
 *
 * Resolution order:
 *   1. explicit args (the host passes the session cookie per-request)
 *   2. env: EDGE_PLATFORM_URL + EDGE_SESSION_COOKIE
 *   3. undefined — feeds stay "needs-platform", honestly reported.
 */
import type { FeedConfig } from "./feeds.js";

export function feedConfigFromEnv(
  env: Record<string, string | undefined> = typeof process !== "undefined" ? process.env : {},
  cookie?: string,
): FeedConfig | undefined {
  const baseUrl = env.EDGE_PLATFORM_URL;
  if (!baseUrl) return undefined;
  return { baseUrl, cookie: cookie ?? env.EDGE_SESSION_COOKIE };
}
