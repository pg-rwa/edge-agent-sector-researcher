import { defineAgent } from "@polytrade-edge/core";
// A read-only "personal researcher" — needs no wallet, no fund code.
// This is all it takes to declare a new Edge agent.
export default defineAgent({
  id: "sector-researcher",
  name: "Sector Researcher",
  tagline: "Reads the market for you. Not advice — a research crew.",
  icon: "🔭",
  accent: "#4f8cff",
  capabilities: ["read:markets", "read:exposure", "session"],
  needsWallet: false,
  category: "researcher",
  sdkVersion: "0.0.1",
});
