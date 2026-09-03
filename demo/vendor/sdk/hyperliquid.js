export const HL_INFO = "https://api.hyperliquid.xyz/info";
export const HL_EQUITY_DEX = "xyz";
export function parseXyzPerps(metaAndCtxs) {
    const [meta, ctxs] = metaAndCtxs;
    const out = {};
    meta.universe.forEach((u, i) => {
        const c = ctxs[i];
        if (!c)
            return;
        const sym = u.name.replace(/^xyz:/, "");
        out[sym] = { midPx: Number(c.midPx), markPx: Number(c.markPx), oraclePx: Number(c.oraclePx),
            fundingHourly: Number(c.funding), maxLeverage: u.maxLeverage };
    });
    return out;
}
export async function getXyzPerps(fetchImpl = fetch) {
    const res = await fetchImpl(HL_INFO, { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "metaAndAssetCtxs", dex: HL_EQUITY_DEX }) });
    if (!res.ok)
        throw new Error(`hyperliquid info failed: ${res.status}`);
    return parseXyzPerps(await res.json());
}
export function perpHoldingCost(notionalUsd, fundingHourly, holdDays) {
    const annualPct = fundingHourly * 24 * 365;
    return notionalUsd * annualPct * (holdDays / 365);
}
