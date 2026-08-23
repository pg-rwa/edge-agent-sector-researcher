/**
 * Interactive terminal demo: chat with the Research Master like you would on
 * the Edge platform. Run `pnpm play`. Type "crew" for your roster, "reset" to
 * start over, "quit" to exit.
 */
import { createInterface } from "node:readline";
import { ResearchMaster, type Reply } from "./master.js";

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

function render(reply: Reply): void {
  console.log(`\n${CYAN}${BOLD}MASTER${RESET} ${reply.text}`);
  if (reply.suggestions?.length) {
    console.log(`${DIM}  chips: ${reply.suggestions.join("  ·  ")}${RESET}`);
  }
  process.stdout.write(`\n${BOLD}YOU${RESET} `);
}

const master = new ResearchMaster();
const rl = createInterface({ input: process.stdin, output: process.stdout });

render(master.greeting());
console.log(`${DIM}(type below — "crew" lists juniors, "reset" restarts, "quit" exits)${RESET}`);
process.stdout.write(`\n${BOLD}YOU${RESET} `);

for await (const line of rl) {
  const text = line.trim();
  if (/^(quit|exit|q)$/i.test(text)) break;
  render(master.handle(text));
}

rl.close();
console.log("\nMaster out. 🧭");
