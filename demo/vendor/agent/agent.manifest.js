import { defineAgent } from "@polytrade-edge/core";
// The Research Master: a read-only "personal researcher" that staffs junior
// researchers on specific geography + sector beats. No wallet, no fund code.
// This is all it takes to declare a new Edge agent.
export default defineAgent({
    id: "research-master",
    name: "Research Master",
    tagline: "Name a beat — geography + sector — and I'll staff a junior researcher for it. Not advice — a research crew.",
    icon: "🧭",
    accent: "#1f5c40",
    capabilities: ["read:markets", "read:news", "read:filings", "read:macro", "read:exposure", "session"],
    needsWallet: false,
    category: "researcher",
    sdkVersion: "0.0.1",
});
