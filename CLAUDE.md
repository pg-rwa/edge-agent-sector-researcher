# Working in this repo (read first)

This is a **Polytrade Edge agent** — a standalone repo that plugs into the
Polytrade Edge platform. It is intentionally isolated so it can be built in its
own Claude session, in parallel with other agents, without collisions. Stay
within THIS agent's scope; don't reach for other repos.

## What this agent is
Read `src/agent.manifest.ts` — the `AgentManifest` is this agent's identity and,
importantly, the **capabilities** it's allowed to use. The Edge Directory reads
this manifest to list + mount the agent. If you add a capability, add it there.

## The capability layer (the moat — don't reinvent it)
The audited platform logic comes from **`@polytrade-edge/core`**, vendored as the
**`sdk/` git submodule** (ships prebuilt `dist`). Import chains, adapters, the
verified-asset registries, routing, and agent cores from it — never re-implement
fund/chain logic here.
- Fund-moving client executors (guarded signing, wallet hooks) will come from
  `@polytrade-edge/client` (Phase 2 — not in the SDK yet). Until then, a
  fund-agent's runtime still lives in the `polytrade-edge` platform repo.
- Read-only agents (researchers) need only `@polytrade-edge/core` + the read/
  `session` capabilities — build freely.

## Non-custodial — non-negotiable
The agent **prepares** work; the **user signs** every fund/permission move.
Never hold keys or funds, never auto-execute, never store a secret or private
key. Anything that moves value is a user-signed transaction. Copy is impersonal
("a research crew," "not advice"), never financial advice.

## Build / test
`pnpm install && pnpm build` (the `sdk/` submodule is prebuilt — no build step).
Bump the SDK deliberately: `cd sdk && git pull && cd .. && git add sdk && git
commit -m "bump sdk"` — it's audited shared code, treat like a versioned lib.
Keep secrets out of the client bundle and out of git.

## Where things live
- `polytrade-edge` — the platform/host (Directory, auth, wallet shell).
- `polytrade-edge-sdk` — the capability SDK (this repo's `sdk/` submodule).
- This repo — this agent's UI + logic + manifest only.
