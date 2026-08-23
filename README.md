# edge-agent-research-master

The **Research Master** — a read-only Polytrade Edge agent that staffs a crew
of junior researchers. The user names a beat (a **geography** + a **sector**),
the Master runs a short intake (focus, horizon, cadence), and a crisp junior
researcher spec comes out. One junior per beat, as many beats as the user likes.

## Rules of the crew
- **No general researchers.** A request for one is refused, and the user is
  guided to pick a geography + sector instead.
- **Geography-only is allowed with a warning.** The junior will be a
  generalist — broad market knowledge, no specific sector/domain depth — and
  the user must confirm that's what they want.
- **Every junior goes through intake** (specific asks: focus/themes/tickers,
  time horizon, reporting cadence) so it is sharp about exactly what the user
  asked for.
- **Always framed as personal research the user requested — never investment
  advice.** Read-only, non-custodial, no wallet.

## Layout
- `src/agent.manifest.ts` — the Edge Directory identity (`research-master`).
- `src/taxonomy.ts` — the finite geography/sector catalog juniors can staff.
- `src/master.ts` — the conversational engine: pure, UI-agnostic; feed a
  message, get a reply with quick-reply suggestion chips.
- `src/junior.ts` — the per-junior persona + chat, wired to the research layer.
- `src/research/` — what juniors actually draw on:
  - `sources.ts` — the source registry with honest availability (`live` /
    `needs-key` / `needs-platform`). No fake feeds.
  - `market-data.ts` — live market snapshots via the SDK (Hyperliquid
    equity-perp reads, verified stock-token registry only; pool spot prices
    when the platform injects a Uniswap key).
  - `plan.ts` — the research agenda generated from each junior's brief
    (questions, metrics, triggers — a plan of attack, not fake findings).
- `src/master.test.ts`, `src/junior.test.ts` — node:test coverage of the
  guardrails and the research wiring.

## Commands
- `pnpm build` / `pnpm check` — compile / typecheck.
- `pnpm test` — build + run the guardrail tests.
- `pnpm ui` — Slack-style web demo at http://localhost:4173 (chat, quick-reply
  chips, crew roster sidebar, confetti on spin-up). Zero extra deps — the
  browser imports the compiled engine straight from `dist/`.
- `pnpm play` — interactive terminal chat with the Research Master.
- `pnpm demo` — a scripted conversation through all the flows.

The `sdk/` submodule pins a `polytrade-edge-sdk` commit — bump deliberately.
