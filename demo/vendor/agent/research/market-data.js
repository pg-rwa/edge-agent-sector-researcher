/**
 * Live market data for juniors — the "live" source from the source layer.
 * Wraps the SDK's read-only market functions behind an injectable deps
 * interface, so tests and the platform can substitute their own fetchers.
 *
 * Verified tickers only: symbols resolve through the SDK's curated registry
 * (`findToken`), which exists because the chain is full of impersonators.
 */
import { findToken, getXyzPerps } from "@polytrade-edge/core";
/** Default deps: the SDK's real, unauthenticated Hyperliquid read. */
export const defaultMarketDeps = { getXyzPerps };
/**
 * Pulls verified tickers out of free text (focus items, a user message).
 * Returns the tickers found and the remaining non-ticker text items.
 */
export function extractTickers(texts) {
    const tickers = new Set();
    const rest = [];
    for (const text of texts) {
        const words = text.replace(/[^a-zA-Z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
        const found = words.map((w) => w.toUpperCase()).filter((w) => findToken(w));
        if (found.length > 0 && words.length <= 3) {
            found.forEach((t) => tickers.add(t));
        }
        else {
            rest.push(text);
        }
    }
    return { tickers: [...tickers], rest };
}
/**
 * Live snapshot for verified symbols. Unverified symbols are dropped, never
 * guessed. A failing feed throws — callers catch and report honestly.
 */
export async function snapshotTickers(symbols, deps) {
    const verified = symbols
        .map((s) => ({ symbol: s.toUpperCase(), token: findToken(s) }))
        .filter((x) => !!x.token);
    if (verified.length === 0)
        return [];
    let perps = {};
    if (deps.getXyzPerps)
        perps = await deps.getXyzPerps();
    const out = [];
    for (const { symbol, token } of verified) {
        const snap = { symbol, name: token.name };
        if (perps[symbol])
            snap.perp = perps[symbol];
        if (deps.poolPriceUsd) {
            try {
                snap.poolPriceUsd = await deps.poolPriceUsd(symbol);
            }
            catch {
                // pool price is best-effort on top of the perp read — its absence is
                // visible in the output (field missing), not hidden by a fake value.
            }
        }
        out.push(snap);
    }
    return out;
}
/** Annualized funding as a percentage, from the SDK's hourly rate. */
export function annualFundingPct(fundingHourly) {
    return fundingHourly * 24 * 365 * 100;
}
