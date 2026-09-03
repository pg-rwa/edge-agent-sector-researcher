/**
 * The beats the Research Master can staff. Junior researchers are only ever
 * spun up on a named geography + sector pair — a junior that covers
 * everything ends up knowing nothing, so the catalog is deliberately finite.
 */
export const GEOGRAPHIES = [
    { id: "us", label: "United States", keywords: ["us", "usa", "u\\.s\\.a?", "united states", "america", "american"] },
    { id: "europe", label: "Europe", keywords: ["europe", "europe?an", "eu", "eurozone", "germany", "france", "spain", "nordics?"] },
    { id: "uk", label: "United Kingdom", keywords: ["uk", "u\\.k\\.", "united kingdom", "britain", "british", "london"] },
    { id: "india", label: "India", keywords: ["india", "indian"] },
    { id: "china", label: "China", keywords: ["china", "chinese"] },
    { id: "japan", label: "Japan", keywords: ["japan", "japanese"] },
    { id: "sea", label: "Southeast Asia", keywords: ["southeast asia", "sea", "singapore", "indonesia", "vietnam", "thailand", "philippines", "malaysia"] },
    { id: "latam", label: "Latin America", keywords: ["latam", "latin america", "brazil", "mexico", "argentina", "chile", "colombia"] },
    { id: "mena", label: "MENA", keywords: ["mena", "middle east", "uae", "dubai", "saudi", "gulf", "qatar"] },
    { id: "africa", label: "Africa", keywords: ["africa", "african", "nigeria", "kenya", "south africa"] },
    { id: "global", label: "Global", keywords: ["global", "worldwide", "international"] },
];
export const SECTORS = [
    { id: "fintech", label: "Fintech", keywords: ["fintech", "payments?", "banking", "neobanks?", "lending"] },
    { id: "energy", label: "Energy", keywords: ["energy", "oil", "gas", "renewables?", "solar", "wind", "utilities", "power"] },
    { id: "healthcare", label: "Healthcare", keywords: ["healthcare", "health", "pharma", "hospitals?", "medtech"] },
    { id: "biotech", label: "Biotech", keywords: ["biotech", "biotechnology", "genomics?"] },
    { id: "ai-tech", label: "AI & Tech", keywords: ["ai", "artificial intelligence", "tech", "software", "saas", "semiconductors?", "chips?"] },
    { id: "real-estate", label: "Real Estate", keywords: ["real estate", "property", "reits?", "housing"] },
    { id: "consumer", label: "Consumer", keywords: ["consumer", "retail", "e-?commerce", "fmcg", "brands?"] },
    { id: "industrials", label: "Industrials", keywords: ["industrials?", "manufacturing", "infra(?:structure)?", "logistics"] },
    { id: "crypto-rwa", label: "Crypto & RWA", keywords: ["crypto", "rwa", "real[- ]world assets?", "defi", "tokeni[sz]ation", "web3", "bitcoin", "ethereum"] },
    { id: "defense", label: "Defense & Aerospace", keywords: ["defen[cs]e", "aerospace", "military", "space"] },
];
/** Length of the matched keyword if it appears as a whole word, else 0. */
function matchLen(haystack, keyword) {
    const m = new RegExp(`\\b(${keyword})\\b`, "i").exec(haystack);
    return m ? m[1].length : 0;
}
/**
 * Best match wins: the entry whose longest matching keyword is longest.
 * "Latin America" must beat the bare "america" keyword of the US entry.
 */
function bestMatch(entries, message) {
    let best;
    let bestLen = 0;
    for (const entry of entries) {
        const len = Math.max(0, ...entry.keywords.map((k) => matchLen(message, k)));
        if (len > bestLen) {
            best = entry;
            bestLen = len;
        }
    }
    return best;
}
/** Best-matching geography in the message, else undefined. */
export function matchGeography(message) {
    return bestMatch(GEOGRAPHIES, message);
}
/** Best-matching sector in the message, else undefined. */
export function matchSector(message) {
    return bestMatch(SECTORS, message);
}
