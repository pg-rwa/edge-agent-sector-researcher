// The Research Master agent: manifest (its Edge Directory identity) plus the
// conversational engine that staffs junior researchers on sharp beats.
import manifest from "./agent.manifest.js";

export { default as manifest } from "./agent.manifest.js";
export { ResearchMaster, NOT_ADVICE } from "./master.js";
export type { Reply, JuniorAgentSpec } from "./master.js";
export { JuniorResearcher } from "./junior.js";
export { fetchNews, fetchFilings, fetchMacro } from "./research/feeds.js";
export type { FeedConfig, NewsItem, FilingItem, MacroEvent } from "./research/feeds.js";
export { sourcesFor } from "./research/sources.js";
export { buildAgenda } from "./research/plan.js";
export { snapshotTickers, extractTickers } from "./research/market-data.js";
export { GEOGRAPHIES, SECTORS } from "./taxonomy.js";

export function boot() {
  console.log(`[${manifest.id}] ${manifest.name} — read-only research crew, no wallet needed.`);
  return manifest;
}

// Run `node dist/index.js` for a scripted demo of the conversation flows.
if (import.meta.url === `file://${process.argv[1]}`) {
  const { ResearchMaster } = await import("./master.js");
  const master = new ResearchMaster();
  const script = [
    "hi",
    "can you be my general researcher?",
    "fintech",
    "India",
    "payments and neobanks, especially UPI",
    "months",
    "weekly deep-dive",
    "crew",
    "energy in MENA",
    "solar and utilities",
    "years",
    "daily brief",
    "Latin America",
    "keep it general",
    "crew",
  ];
  console.log(`MASTER: ${master.greeting().text}\n`);
  for (const line of script) {
    const reply = master.handle(line);
    console.log(`USER: ${line}`);
    console.log(`MASTER: ${reply.text}`);
    if (reply.suggestions) console.log(`  [chips: ${reply.suggestions.join(" | ")}]`);
    console.log();
  }
}
