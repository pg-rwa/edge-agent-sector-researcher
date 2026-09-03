export function sourcesFor(spec, feeds) {
    const beat = spec.sector ? `${spec.geography} ${spec.sector}` : `${spec.geography} markets`;
    const feedAvailability = feeds?.baseUrl ? "live" : "needs-platform";
    const feedWiring = "Edge platform injects the session (FeedConfig: baseUrl + cookie) at runtime — capability declared in the manifest";
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
