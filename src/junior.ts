/**
 * JuniorResearcher — the playful per-junior conversation, now with teeth:
 * "deep dive" pulls live market data (through the SDK, verified tickers
 * only), builds a research agenda from the spin-up brief, and states plainly
 * which sources are live vs. waiting on platform feeds.
 *
 * Same house rules as the Master: personal research the user requested,
 * never investment advice, read-only.
 */
import { NOT_ADVICE, type JuniorAgentSpec, type Reply } from "./master.js";
import { sourcesFor } from "./research/sources.js";
import {
  annualFundingPct,
  defaultMarketDeps,
  extractTickers,
  snapshotTickers,
  type MarketDeps,
} from "./research/market-data.js";
import {
  fetchFilings,
  fetchMacro,
  fetchNews,
  type FeedConfig,
} from "./research/feeds.js";
import { buildAgenda } from "./research/plan.js";

const FACES = ["🦊", "🦉", "🐙", "🐝", "🦜", "🐢", "🦎", "🐧"];

const IDLE_LINES = [
  `I'm buried in {beat} reading as we speak 📚 — say "deep dive" and I'll show you my working.`,
  "Fun corner of the world, {beat}. Ask me what I'm tracking, or throw me a ticker to pull a live read on. 🐾",
  "Eyes on {beat} 👀 — while you think, I'm sorting signal from noise.",
  "I live for {beat}. Seriously, it's my whole personality now. Want a deep dive?",
];

export class JuniorResearcher {
  private idleIndex = 0;

  constructor(
    readonly spec: JuniorAgentSpec,
    private readonly market: MarketDeps = defaultMarketDeps,
    /** Wired by the platform when the read:news/filings/macro feeds are live. */
    private readonly feeds?: FeedConfig,
  ) {}

  private get beat(): string {
    return this.spec.sector
      ? `${this.spec.geography} ${this.spec.sector}`
      : `${this.spec.geography} markets`;
  }

  /** Stable emoji face, derived from the junior's id. */
  get face(): string {
    const n = parseInt(this.spec.id.replace(/\D/g, ""), 10) || 0;
    return FACES[(n - 1) % FACES.length];
  }

  greeting(): Reply {
    const s = this.spec;
    const watching = s.focus.length
      ? `I'm already watching *${s.focus.join(", ")}*`
      : `I'm scanning the whole ${this.beat} space`;
    return {
      text:
        `${s.codename} reporting for duty! ${this.face}\n\n` +
        `I'm your *${s.displayName}* junior — ${watching}` +
        (s.horizon ? `, thinking in *${s.horizon}*` : "") +
        (s.cadence ? `, reporting via *${s.cadence}*` : "") +
        `.\n\nSay "deep dive" and I'll pull live market data plus my full research agenda. 🧵\n\n_${NOT_ADVICE}_`,
      suggestions: ["Deep dive", "What are you tracking?", "Status report"],
    };
  }

  async handle(rawMessage: string): Promise<Reply> {
    const message = rawMessage.trim();
    if (/^(hi|hello|hey|yo)\b/i.test(message)) return this.greeting();

    if (/deep dive|research|brief|analy[sz]e|dig/i.test(message)) {
      return this.deepDive(message);
    }

    if (/what.*(track|watch|cover|follow)/i.test(message)) {
      const s = this.spec;
      return {
        text:
          `My beat, top to bottom: 🗺️\n\n` +
          `• *Where:* ${s.geography}\n` +
          `• *What:* ${s.sector ?? "the whole market (generalist — no sector depth)"}\n` +
          (s.focus.length ? `• *Zeroed in on:* ${s.focus.join(", ")}\n` : "") +
          (s.horizon ? `• *Horizon:* ${s.horizon}\n` : "") +
          (s.cadence ? `• *Cadence:* ${s.cadence}\n` : "") +
          `\n_${NOT_ADVICE}_`,
        suggestions: ["Deep dive", "Status report"],
      };
    }

    if (/status|report|update|digest/i.test(message)) {
      return {
        text:
          `Status from the field 📋\n\n` +
          `Channels are being combed — when I have something worth your time on ` +
          `*${this.beat}*, it lands here first${this.spec.cadence ? ` (that's the ${this.spec.cadence} you asked for)` : ""}. ` +
          `Until then: no noise, only signal. Say "deep dive" if you want my full working now.\n\n_${NOT_ADVICE}_`,
        suggestions: ["Deep dive"],
      };
    }

    if (/know|knowledge|deep|expert|sources?/i.test(message)) {
      return { text: this.sourceReport(), suggestions: ["Deep dive", "What are you tracking?"] };
    }

    // Fallback: rotate through playful idle lines, always on-beat.
    const line = IDLE_LINES[this.idleIndex++ % IDLE_LINES.length].replaceAll("{beat}", this.beat);
    return {
      text: `${line}\n\n_${NOT_ADVICE}_`,
      suggestions: ["Deep dive", "What are you tracking?", "Status report"],
    };
  }

  /** What this junior knows, and exactly how honestly each source is wired. */
  private sourceReport(): string {
    const lines = sourcesFor(this.spec, this.feeds).map((src) => {
      const state =
        src.availability === "live"
          ? "🟢 live"
          : src.availability === "needs-key"
            ? `🟡 needs an API key — ${src.wiring}`
            : `🔌 needs a platform feed — ${src.wiring}`;
      return `• ${src.label} — ${state}`;
    });
    return `${this.spec.knowledgeNote}\n\n*My sources:*\n${lines.join("\n")}\n\n_${NOT_ADVICE}_`;
  }

  /**
   * Platform feed reads for the deep dive: news, filings, macro. Only runs
   * when the platform wired a FeedConfig; each failing feed is reported, not
   * hidden. Returns "" when no feeds are configured.
   */
  private async wireSection(): Promise<string> {
    if (!this.feeds?.baseUrl) return "";
    const s = this.spec;
    const [news, filings, macro] = await Promise.all([
      fetchNews({ q: s.sector ?? s.geography, geoId: s.geographyId, sectorId: s.sectorId }, this.feeds).catch((e: Error) => e),
      fetchFilings({ geoId: s.geographyId, sectorId: s.sectorId }, this.feeds).catch((e: Error) => e),
      fetchMacro({ geoId: s.geographyId }, this.feeds).catch((e: Error) => e),
    ]);

    const blocks: string[] = [];
    if (Array.isArray(news) && news.length > 0) {
      blocks.push(
        "*Fresh off the wire:*\n" +
          news.slice(0, 3).map((n) => `• ${n.title} — _${n.source}, ${n.publishedAt.slice(0, 10)}_`).join("\n"),
      );
    }
    if (Array.isArray(filings) && filings.length > 0) {
      blocks.push(
        "*Latest filings:*\n" +
          filings.slice(0, 3).map((f) => `• ${f.title} — _${f.filer} → ${f.regulator}, ${f.filedAt.slice(0, 10)}_`).join("\n"),
      );
    }
    if (Array.isArray(macro) && macro.length > 0) {
      blocks.push(
        "*Macro calendar:*\n" +
          macro.slice(0, 3).map((m) => `• ${m.name} — _${m.date.slice(0, 10)}${m.expectation ? `, exp. ${m.expectation}` : ""}_`).join("\n"),
      );
    }
    const failed = [
      [news, "news"],
      [filings, "filings"],
      [macro, "macro"],
    ].filter(([r]) => r instanceof Error);
    if (failed.length > 0) {
      blocks.push(`_⚠️ ${failed.map(([, name]) => name).join(", ")} feed${failed.length > 1 ? "s" : ""} unreachable — not faking it._`);
    }
    return blocks.join("\n\n");
  }

  /**
   * The real deliverable: live market snapshot (verified tickers only) +
   * research agenda + honest source availability. Never invents data: a
   * failing feed is reported as unreachable, not smoothed over.
   */
  private async deepDive(message: string): Promise<Reply> {
    const { tickers, rest } = extractTickers([...this.spec.focus, message]);
    const agenda = buildAgenda(this.spec);

    let liveSection: string;
    if (tickers.length === 0) {
      liveSection =
        "*Live market read:* no verified tickers in your focus yet. " +
        "Name one from the verified registry (NVDA, AAPL, TSLA, MSFT, AMZN, GOOGL, META, SPY, QQQ, COIN) " +
        "and I'll pull the live read. I don't touch unverified symbols — impersonator tokens are everywhere.";
    } else {
      try {
        const snaps = await snapshotTickers(tickers, this.market);
        const rows = snaps.map((s) => {
          const parts: string[] = [];
          if (s.perp) {
            parts.push(
              `oracle $${s.perp.oraclePx.toFixed(2)}`,
              `funding ${annualFundingPct(s.perp.fundingHourly).toFixed(1)}%/yr`,
              `max ${s.perp.maxLeverage}× perp`,
            );
          }
          if (s.poolPriceUsd) parts.push(`pool spot $${s.poolPriceUsd.toFixed(2)}`);
          return `• *${s.symbol}* (${s.name}) — ${parts.length ? parts.join(" · ") : "no live market found"}`;
        });
        liveSection = `*Live market read* (verified tickers):\n${rows.join("\n")}`;
      } catch {
        liveSection =
          "*Live market read:* ⚠️ the live feed is unreachable from here right now — " +
          "I won't fake numbers. Try again in a moment.";
      }
    }

    const agendaSection =
      `*Research agenda* (from your brief):\n` +
      agenda.questions.map((q) => `• ${q}`).join("\n") +
      `\n\n*Metrics I track:* ${agenda.metrics.join(", ")}\n` +
      `*Triggers I watch:* ${agenda.triggers.join(", ")}`;

    const sources = sourcesFor(this.spec, this.feeds);
    const live = sources.filter((s) => s.availability === "live").map((s) => s.label);
    const pending = sources
      .filter((s) => s.availability !== "live")
      .map((s) => `• ${s.label} (${s.availability === "needs-key" ? "needs API key" : "needs platform feed"})`);
    const sourceSection =
      `*Sources:*\n🟢 live now: ${live.join("; ")}` +
      (pending.length > 0 ? `\n🔌 wired when the Edge platform ships the feed:\n${pending.join("\n")}` : "");

    const wire = await this.wireSection();

    const focusNote = rest.filter((f) => f !== message).length && !this.feeds?.baseUrl
      ? `\n\n_Focus items without a live ticker (${rest.filter((f) => f !== message).join(", ")}) are covered by the agenda + news/filings feeds once the platform wires them._`
      : "";

    return {
      text:
        `📊 *Deep dive — ${this.spec.displayName}*\n\n` +
        `${liveSection}\n\n${wire ? `${wire}\n\n` : ""}${agendaSection}\n\n${sourceSection}${focusNote}\n\n_${NOT_ADVICE}_`,
      suggestions: ["What are you tracking?", "Status report"],
    };
  }
}
