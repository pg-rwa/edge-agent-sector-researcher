/**
 * Browser shim for the UI demo: the agent's compiled modules import
 * "@polytrade-edge/core" (a bare specifier browsers can't resolve), so the
 * import map in app.html points that specifier here. Re-exports ONLY the
 * pieces the demo's import chain actually uses, from vendored copies of the
 * SDK's dependency-free dist files (the full SDK index pulls in viem & co.
 * for the fund-moving executors — not wanted in a browser demo).
 * Node/tests use the real package; this shim is demo-only.
 */
export { findToken } from "./vendor/sdk/registry.js";
export { getXyzPerps } from "./vendor/sdk/hyperliquid.js";
export { fetchNews, fetchFilings, fetchMacro } from "./vendor/sdk/read-client.js";
export { defineAgent } from "./vendor/sdk/manifest.js";
