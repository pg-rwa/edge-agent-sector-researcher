# edge-agent-template

Clone-me to build a new Polytrade Edge agent in **its own repo** (its own
Claude session). You get the audited capability layer as a submodule and a
one-file manifest — the platform Directory does the rest.

## Start a new agent
1. Copy this repo, rename, edit `src/agent.manifest.ts` (id, name, capabilities).
2. `pnpm install && pnpm build`  (builds the `sdk` submodule, then your agent).
3. Build your agent's UI/logic importing capabilities from `@polytrade-edge/core`.
4. Register the manifest with the Edge Directory (Phase-1 contract).

The `sdk/` submodule pins a `polytrade-edge-sdk` commit — bump deliberately.
Read-only agents (researchers) need only read capabilities + `session`.
Fund-moving agents also use `execute:*` (client executors — Phase 2).
