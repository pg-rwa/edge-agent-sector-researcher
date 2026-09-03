/**
 * Curated stock-token registry for Robinhood Chain.
 *
 * ANTI-SCAM NOTE: this chain is full of impersonator tokens (e.g. a scam
 * "USDC" named "United States Dump Coin"). Every entry below was verified
 * live against Blockscout (`GET /api/v2/tokens?q=<SYM>`) and included ONLY
 * when the matching entry had:
 *   - icon_url containing "cdn.robinhood.com" (the official Robinhood logo
 *     CDN — impersonators use other hosts, typically coingecko asset CDNs)
 *   - holders_count > 1000
 *
 * Verified 2026-07-23 against https://robinhoodchain.blockscout.com:
 *   NVDA  0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC  holders=30776  "NVIDIA • Robinhood Token"
 *   AAPL  0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9  holders=28166  "Apple • Robinhood Token"
 *   TSLA  0x322F0929c4625eD5bAd873c95208D54E1c003b2d  holders=21149  "Tesla • Robinhood Token"
 *   MSFT  0xe93237C50D904957Cf27E7B1133b510C669c2e74  holders=15450  "Microsoft • Robinhood Token"
 *   AMZN  0x12f190a9F9d7D37a250758b26824B97CE941bF54  holders=17859  "Amazon • Robinhood Token"
 *   GOOGL 0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3  holders=23598  "Alphabet Class A • Robinhood Token"
 *   META  0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35  holders=14891  "Meta Platforms • Robinhood Token"
 *   SPY   0x117cc2133c37B721F49dE2A7a74833232B3B4C0C  holders=10496  "SPDR S&P 500 ETF Trust • Robinhood Token"
 *   QQQ   0xD5f3879160bc7c32ebb4dC785F8a4F505888de68  holders=3427   "Invesco QQQ • Robinhood Token"
 *   COIN  0x6330D8C3178a418788dF01a47479c0ce7CCF450b  holders=12206  "Coinbase • Robinhood Token"
 *
 * OMITTED: HOOD — no entry for symbol "HOOD" had a cdn.robinhood.com icon_url;
 * all matches were unrelated meme/impersonator tokens (e.g. "foreskin",
 * "HOOD99", "Robin Brother Hood"). Do not add HOOD until Robinhood ships a
 * genuine on-chain HOOD token that passes verification.
 */
export const STOCK_TOKENS = [
    {
        symbol: "NVDA",
        name: "NVIDIA • Robinhood Token",
        address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC",
        decimals: 18,
    },
    {
        symbol: "AAPL",
        name: "Apple • Robinhood Token",
        address: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9",
        decimals: 18,
    },
    {
        symbol: "TSLA",
        name: "Tesla • Robinhood Token",
        address: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d",
        decimals: 18,
    },
    {
        symbol: "MSFT",
        name: "Microsoft • Robinhood Token",
        address: "0xe93237C50D904957Cf27E7B1133b510C669c2e74",
        decimals: 18,
    },
    {
        symbol: "AMZN",
        name: "Amazon • Robinhood Token",
        address: "0x12f190a9F9d7D37a250758b26824B97CE941bF54",
        decimals: 18,
    },
    {
        symbol: "GOOGL",
        name: "Alphabet Class A • Robinhood Token",
        address: "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3",
        decimals: 18,
    },
    {
        symbol: "META",
        name: "Meta Platforms • Robinhood Token",
        address: "0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35",
        decimals: 18,
    },
    {
        symbol: "SPY",
        name: "SPDR S&P 500 ETF Trust • Robinhood Token",
        address: "0x117cc2133c37B721F49dE2A7a74833232B3B4C0C",
        decimals: 18,
    },
    {
        symbol: "QQQ",
        name: "Invesco QQQ • Robinhood Token",
        address: "0xD5f3879160bc7c32ebb4dC785F8a4F505888de68",
        decimals: 18,
    },
    {
        symbol: "COIN",
        name: "Coinbase • Robinhood Token",
        address: "0x6330D8C3178a418788dF01a47479c0ce7CCF450b",
        decimals: 18,
    },
];
/**
 * USDG (Global Dollar) — the settlement stablecoin on Robinhood Chain.
 * Verified 2026-07-23: holders=38443, icon_url on cdn.robinhood.com, 6 decimals.
 */
export const USDG_TOKEN = {
    symbol: "USDG",
    name: "Global Dollar",
    address: "0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168",
    decimals: 6,
};
/** Case-insensitive lookup against the curated registry only (no chain calls). */
export function findToken(symbol) {
    const needle = symbol.toUpperCase();
    return STOCK_TOKENS.find((t) => t.symbol === needle);
}
