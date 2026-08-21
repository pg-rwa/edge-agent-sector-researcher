// Proof the agent resolves the SDK's capability layer at build time.
import manifest from "./agent.manifest.js";
import { canonicalAsset } from "@polytrade-edge/core";
export function boot() {
  console.log(`[${manifest.id}] built against Edge SDK; sample capability read:`,
    typeof canonicalAsset === "function" ? "canonicalAsset() available" : "MISSING");
  return manifest;
}
