/**
 * Research Master — the conversational brain of the master research agent.
 *
 * It does no research itself. It listens to what the user cares about and
 * staffs junior researchers on sharp beats: a named geography + a named
 * sector. Guardrails, by design:
 *
 *  - A "general researcher" (no geography, no sector) is refused — the user
 *    is guided to pick a beat instead.
 *  - A geography with no sector is allowed, but only after a clear warning
 *    that the junior will have broad general knowledge and no specific
 *    sector/domain depth.
 *  - Every spin-up ends with an intake (focus, horizon, cadence) so the
 *    junior is crisp and knowledgeable about exactly what the user asked.
 *  - Read-only, non-custodial, and always framed as personal research the
 *    user requested — never investment advice.
 *
 * The engine is pure and UI-agnostic: feed it a user message, get back a
 * reply with optional quick-reply suggestion chips for a Slack-type client.
 */

import {
  GEOGRAPHIES,
  SECTORS,
  matchGeography,
  matchSector,
  type Geography,
  type Sector,
} from "./taxonomy.js";

export const NOT_ADVICE =
  "This is personal research you requested — not investment advice, and I'm read-only: I never touch wallets or funds.";

export interface Reply {
  text: string;
  /** Quick-reply chips a chat client can render under the message. */
  suggestions?: string[];
}

export interface JuniorAgentSpec {
  id: string;
  codename: string;
  displayName: string;
  geography: string;
  geographyId: string;
  sector: string | null;
  sectorId: string | null;
  scope: "sector-specialist" | "geography-generalist";
  /** The specific asks captured during intake — what the junior watches. */
  focus: string[];
  horizon: string | null;
  cadence: string | null;
  /** What this junior does and does not know. Shown to the user verbatim. */
  knowledgeNote: string;
  disclaimer: string;
}

interface IntakeAnswers {
  focus: string[];
  horizon?: string;
  cadence?: string;
}

type IntakeStep = "focus" | "horizon" | "cadence";

type Phase =
  | { kind: "collect" }
  | { kind: "confirm-geo-generalist"; geo: Geography }
  | { kind: "need-geography"; sector: Sector }
  | { kind: "intake"; geo: Geography; sector: Sector; step: IntakeStep; answers: IntakeAnswers };

const CODENAMES = ["Falcon", "Magpie", "Atlas", "Radar", "Compass", "Sherpa", "Beacon", "Scout"];

const GENERAL_ASK = /\b(general|everything|anything|all sectors?|all markets?|whole market|broad|whatever)\b/i;
const YES = /^(y(es|eah|up)?|ok(ay)?|sure|keep it general|go ahead|do it)\b/i;
const NO = /^(n(o|ah|ope)|pick a sector|choose a sector)\b/i;
const CREW_CMD = /^(crew|my crew|my agents|my juniors|list|status)$/i;
const RESET_CMD = /^(reset|start over|restart)$/i;

/** "a" / "an" by first letter — "a United States …", "an India …". */
function a_an(label: string): string {
  return /^[aeio]/i.test(label) ? "an" : "a";
}

export class ResearchMaster {
  private phase: Phase = { kind: "collect" };
  private juniors: JuniorAgentSpec[] = [];

  /** The proactive hello a client should render when the agent is opened. */
  greeting(): Reply {
    return {
      text:
        "Hey, I'm the Research Master 🧭 — head of your personal research crew.\n\n" +
        "Tell me the corner of the market you care about — a *geography* + a *sector* — " +
        "and I'll spin up a dedicated junior researcher who lives and breathes exactly that. " +
        'For example: "fintech in India" or "energy in MENA".\n\n' +
        `_${NOT_ADVICE}_`,
      suggestions: ["Fintech in India", "Energy in MENA", "AI & Tech in the US", "Crypto & RWA in Europe"],
    };
  }

  /** The junior researchers staffed so far this session. */
  crew(): readonly JuniorAgentSpec[] {
    return this.juniors;
  }

  handle(rawMessage: string): Reply {
    const message = rawMessage.trim();
    if (!message) {
      return { text: "I didn't catch that — tell me a geography + a sector and we'll get rolling. 🛰️" };
    }
    if (CREW_CMD.test(message)) return this.listCrew();
    if (RESET_CMD.test(message)) {
      this.phase = { kind: "collect" };
      return this.greeting();
    }

    switch (this.phase.kind) {
      case "collect":
        return this.handleCollect(message);
      case "confirm-geo-generalist":
        return this.handleGeoGeneralistConfirm(message, this.phase.geo);
      case "need-geography":
        return this.handleNeedGeography(message, this.phase.sector);
      case "intake":
        return this.handleIntake(message, this.phase);
    }
  }

  // --- phase: collecting the user's interest -------------------------------

  private handleCollect(message: string): Reply {
    const geo = matchGeography(message);
    const sector = matchSector(message);
    const generalAsk = GENERAL_ASK.test(message);

    if (geo && sector) return this.beginIntake(geo, sector);
    if (sector && !geo) {
      this.phase = { kind: "need-geography", sector };
      return {
        text:
          `${sector.label} — great beat. 🎯 Which geography should your junior cover?\n\n` +
          `_${NOT_ADVICE}_`,
        suggestions: GEOGRAPHIES.map((g) => g.label),
      };
    }
    if (geo && !sector) return this.offerGeographyGeneralist(geo);

    // No recognizable beat at all.
    if (generalAsk) return this.refuseGeneralResearcher();
    return {
      text:
        "Hmm, I couldn't spot a geography or a sector in that. 🕵️ My juniors only work sharp beats — " +
        'try something like "biotech in Japan" or "consumer in Southeast Asia".\n\n' +
        `_${NOT_ADVICE}_`,
      suggestions: ["Biotech in Japan", "Consumer in Southeast Asia"],
    };
  }

  /** Hard no on a general researcher — guide the user to a sharp beat. */
  private refuseGeneralResearcher(): Reply {
    return {
      text:
        "That one I have to refuse 🙅 — a *general researcher* that covers everything ends up knowing nothing, " +
        "and you'd get shallow summaries instead of real insight.\n\n" +
        "Here's the right way to use me: pick a *geography* and a *sector*, and I'll staff a junior researcher " +
        "who goes deep on exactly that — the players, the regulation, the data, the narrative. " +
        "You can spin up as many juniors as you like, one per beat.\n\n" +
        `_${NOT_ADVICE}_`,
      suggestions: ["Fintech in India", "Energy in MENA", "Defense & Aerospace in the US"],
    };
  }

  /**
   * Geography with no sector: allowed, but the user must accept a generalist
   * with no specific sector/domain depth.
   */
  private offerGeographyGeneralist(geo: Geography): Reply {
    this.phase = { kind: "confirm-geo-generalist", geo };
    return {
      text:
        `${geo.label} — solid hunting ground. 🗺️ Before I spin one up, a heads-up:\n\n` +
        `Without a sector, your junior will be ${a_an(geo.label)} *${geo.label} generalist* — broad, general knowledge of ` +
        `${geo.label} markets, but **no specific sector/domain depth**. Good for orientation, not for edge.\n\n` +
        "Want the generalist anyway, or name a sector and get a specialist instead?",
      suggestions: ["Keep it general", ...SECTORS.slice(0, 5).map((s) => s.label)],
    };
  }

  private handleGeoGeneralistConfirm(message: string, geo: Geography): Reply {
    const sector = matchSector(message);
    if (sector) return this.beginIntake(geo, sector);
    if (YES.test(message)) {
      const junior = this.spinUp({
        geo,
        sector: null,
        scope: "geography-generalist",
        answers: { focus: [] },
      });
      return {
        text:
          `📡 Junior *${junior.codename}* is live — your ${geo.label} generalist.\n\n` +
          `${junior.knowledgeNote}\n\n` +
          `_${NOT_ADVICE}_\n\n` +
          "Want real depth? Say the word and I'll add a sector specialist to the crew.",
        suggestions: ["Crew", "Add a sector specialist"],
      };
    }
    if (NO.test(message)) {
      this.phase = { kind: "collect" };
      return {
        text: `Good call — specialists win. 🎯 Which sector in ${geo.label}?`,
        suggestions: SECTORS.map((s) => s.label),
      };
    }
    return {
      text: `So — generalist for ${geo.label}, or a sector specialist? ("Keep it general" or name a sector.)`,
      suggestions: ["Keep it general", ...SECTORS.slice(0, 5).map((s) => s.label)],
    };
  }

  private handleNeedGeography(message: string, sector: Sector): Reply {
    const geo = matchGeography(message);
    if (!geo) {
      return {
        text: `Which geography for your ${sector.label} junior? Name a region — e.g. India, MENA, the US.`,
        suggestions: GEOGRAPHIES.map((g) => g.label),
      };
    }
    return this.beginIntake(geo, sector);
  }

  // --- phase: intake — the specific asks that make a junior crisp ----------

  private beginIntake(geo: Geography, sector: Sector): Reply {
    this.phase = { kind: "intake", geo, sector, step: "focus", answers: { focus: [] } };
    return {
      text:
        `${geo.label} × ${sector.label} — now *that's* a beat. 🎯\n\n` +
        `Before your junior goes live, three quick asks so it comes out sharp:\n\n` +
        `*1/3* — What specifically inside ${sector.label} in ${geo.label} should it obsess over? ` +
        "Sub-niches, themes, companies, tickers — the more specific, the smarter it gets.",
    };
  }

  private handleIntake(
    message: string,
    phase: Extract<Phase, { kind: "intake" }>,
  ): Reply {
    const { geo, sector, answers } = phase;

    if (phase.step === "focus") {
      answers.focus = message
        .split(/[,;&]| and /i)
        .map((s) => s.trim())
        .filter(Boolean);
      this.phase = { ...phase, step: "horizon" };
      return {
        text: `Noted: ${answers.focus.join(", ")}. 📌\n\n*2/3* — What time horizon should it think in?`,
        suggestions: ["Weeks", "Months", "Years"],
      };
    }

    if (phase.step === "horizon") {
      answers.horizon = message;
      this.phase = { ...phase, step: "cadence" };
      return {
        text: "*3/3* — How should it report back to you?",
        suggestions: ["Daily brief", "Weekly deep-dive", "Event alerts only"],
      };
    }

    // step === "cadence"
    answers.cadence = message;
    const junior = this.spinUp({ geo, sector, scope: "sector-specialist", answers });
    this.phase = { kind: "collect" };
    return {
      text:
        `📡 Junior *${junior.codename}* is live — *${junior.displayName}*.\n\n` +
        `*Beat:* ${geo.label} × ${sector.label}\n` +
        `*Watching:* ${junior.focus.join(", ") || `the whole ${sector.label} space in ${geo.label}`}\n` +
        `*Horizon:* ${junior.horizon} · *Cadence:* ${junior.cadence}\n\n` +
        `${junior.knowledgeNote}\n\n` +
        `_${NOT_ADVICE}_\n\n` +
        'Say "crew" to see your roster — or name another beat and I\'ll staff the next junior.',
      suggestions: ["Crew", "Spin up another junior"],
    };
  }

  // --- spin-up + roster -----------------------------------------------------

  private spinUp(args: {
    geo: Geography;
    sector: Sector | null;
    scope: JuniorAgentSpec["scope"];
    answers: IntakeAnswers;
  }): JuniorAgentSpec {
    const { geo, sector, scope, answers } = args;
    const n = this.juniors.length;
    const codename = CODENAMES[n % CODENAMES.length];
    const junior: JuniorAgentSpec = {
      id: `junior-${String(n + 1).padStart(3, "0")}`,
      codename,
      displayName: sector ? `${geo.label} · ${sector.label}` : `${geo.label} · Generalist`,
      geography: geo.label,
      geographyId: geo.id,
      sector: sector?.label ?? null,
      sectorId: sector?.id ?? null,
      scope,
      focus: answers.focus,
      horizon: answers.horizon ?? null,
      cadence: answers.cadence ?? null,
      knowledgeNote:
        scope === "sector-specialist"
          ? `${codename} goes deep: ${sector!.label} in ${geo.label} — key players, regulation, data sources, and the live narrative around ${answers.focus.join(", ") || "the sector"}.`
          : `${codename} has broad, general knowledge of ${geo.label} markets — general context only, no specific sector/domain depth.`,
      disclaimer: NOT_ADVICE,
    };
    this.juniors.push(junior);
    return junior;
  }

  private listCrew(): Reply {
    if (this.juniors.length === 0) {
      return {
        text: "No juniors on the roster yet. 🕸️ Name a geography + a sector and I'll staff your first one.",
        suggestions: ["Fintech in India", "Crypto & RWA in Europe"],
      };
    }
    const lines = this.juniors.map(
      (j) =>
        `• *${j.codename}* — ${j.displayName} (${j.scope === "sector-specialist" ? "specialist" : "generalist"})`,
    );
    return {
      text:
        `Your research crew (${this.juniors.length}):\n${lines.join("\n")}\n\n` +
        `_${NOT_ADVICE}_`,
      suggestions: ["Spin up another junior", "Reset"],
    };
  }
}
