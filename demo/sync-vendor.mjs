/**
 * Vendors the compiled agent + the dependency-free SDK dist files into
 * demo/vendor/ so the demo can be statically deployed (GitHub Pages serves
 * neither gitignored dist/ nor the sdk/ submodule's contents). Run after
 * `pnpm build` — `pnpm ui` and deploys call this via `pnpm sync:demo`.
 */
import { copyFile, mkdir, rm } from "node:fs/promises";

const AGENT_FILES = [
  "master.js",
  "taxonomy.js",
  "junior.js",
  "session.js",
  "agent.manifest.js",
  "research/sources.js",
  "research/market-data.js",
  "research/feeds.js",
  "research/plan.js",
  "research/config.js",
];
const SDK_FILES = ["registry.js", "hyperliquid.js", "read-client.js", "manifest.js"];

await rm("demo/vendor", { recursive: true, force: true });
await mkdir("demo/vendor/agent/research", { recursive: true });
await mkdir("demo/vendor/sdk", { recursive: true });

for (const f of AGENT_FILES) await copyFile(`dist/${f}`, `demo/vendor/agent/${f}`);
for (const f of SDK_FILES) await copyFile(`sdk/dist/${f}`, `demo/vendor/sdk/${f}`);

console.log(`vendored ${AGENT_FILES.length} agent + ${SDK_FILES.length} sdk modules → demo/vendor/`);
