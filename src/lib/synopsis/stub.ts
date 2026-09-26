import type { ModelOutcome } from "../model/client";
import type { SynopsisFacts } from "./facts";
import type { SynopsisResponse } from "./response-schema";

/**
 * The model stand-in every non-production run uses unless `SYNOPSIS_LIVE=1` (plan, decision 10).
 *
 * A dev server, a probe and a unit test therefore cannot spend a real call by accident: the only
 * process that sets `SYNOPSIS_LIVE` is `probe:synopsis --live`, under its own cap. Deployed builds
 * are `production` and call the model with no flag.
 *
 * The reply is built from the deck it is asked about, so it passes the accept contract on any
 * whole deck, and `SYNOPSIS_STUB` switches it to each other outcome the UI has to draw:
 * `partial` (the Overview refused), `refused` (every section refused), `malformed`, `busy` and
 * `timeout`, plus `repairs` and `unrepaired` for the repair call (contract B), which the stub tells
 * apart from a first write by its user message. Stored runs record the model as `"stub"`, so a browser probe can tell from the row
 * that no real call was made.
 */

export const STUB_MODEL = "stub";

export type StubMode = "survived" | "partial" | "refused" | "malformed" | "busy" | "timeout" | "repairs" | "unrepaired";

export function stubMode(env: Record<string, string | undefined> = process.env): StubMode {
  const mode = env.SYNOPSIS_STUB;
  return mode === "partial" || mode === "refused" || mode === "malformed" || mode === "busy" || mode === "timeout"
    || mode === "repairs" || mode === "unrepaired"
    ? mode
    : "survived";
}

/**
 * How long the stub waits before it answers: `SYNOPSIS_STUB_DELAY_MS`, 0 when unset, capped at a
 * minute. A real write takes ~17-18s (measured 2026-09-26), and the first press's hold has to be
 * walked both under its limit and past it, which an instant stub cannot show.
 */
export function stubDelayMs(env: Record<string, string | undefined> = process.env): number {
  const ms = Number(env.SYNOPSIS_STUB_DELAY_MS);
  return Number.isFinite(ms) && ms > 0 ? Math.min(ms, 60_000) : 0;
}

export async function stubDelay(env: Record<string, string | undefined> = process.env): Promise<void> {
  const ms = stubDelayMs(env);
  if (ms > 0) await new Promise((resolve) => setTimeout(resolve, ms));
}

/** Whether this process calls the real model: production builds, or an explicit opt-in. */
export function synopsisLive(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === "production" || env.SYNOPSIS_LIVE === "1";
}

const USAGE = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

export function stubReply(facts: SynopsisFacts, mode: StubMode, repair = false): ModelOutcome<SynopsisResponse> {
  // Contract B's two outcomes: the first answer refuses its Overview, and the repair either
  // mends it (`repairs`) or fails the same way (`unrepaired`).
  if (mode === "repairs") return stubReply(facts, repair ? "survived" : "partial");
  if (mode === "unrepaired") return stubReply(facts, "partial");
  if (mode === "malformed") return { ok: false, errorClass: "malformed" };
  if (mode === "busy") return { ok: false, errorClass: "upstream_busy" };
  if (mode === "timeout") return { ok: false, errorClass: "timeout" };

  const commander = facts.commanders[0] ?? facts.cards[0].name;
  // Four DISTINCT other cards: tips and key cards must name different cards. Spells first, then
  // lands, so a land-heavy deck still passes. A deck with fewer than four distinct cards besides
  // its commander (99 copies of one basic) gets a refused key-cards section, as the real contract
  // would give it; `survived` means the stub TRIED to pass, not that it always can.
  // Never a universal staple: the contract refuses one as a Key card.
  const others = [...new Set([
    ...facts.cards.filter((c) => !c.categories.includes("land")),
    ...facts.cards.filter((c) => c.categories.includes("land")),
  ].filter((c) => !c.universalStaple).map((c) => c.name).filter((n) => n !== commander))];
  const pick = (i: number) => others[i] ?? commander;

  const reply: SynopsisResponse = {
    overview: `[[${commander}]] leads this deck, and [[${pick(0)}]] and [[${pick(1)}]] carry its plan.`,
    primer: {
      strategy: [
        "Build your mana in the first turns.",
        `Put [[${pick(0)}]] on the table.`,
        `Close the game with [[${commander}]].`,
      ],
      mulligan: {
        keep: [`A hand with [[${pick(2)}]] in it gets the plan going.`],
        sendBack: ["A hand with nothing to cast early falls behind."],
      },
      tips: [
        { cards: [commander, pick(0)], text: `Cast [[${pick(0)}]] after [[${commander}]] is out.` },
        { cards: [pick(1), pick(2)], text: `Hold [[${pick(1)}]] until [[${pick(2)}]] is ready.` },
      ],
    },
    keyCards: [commander, pick(0), pick(1), pick(2), pick(3)].map((name) => ({
      card: name,
      claims: [],
      job: "Plays its part in this deck.",
    })),
    weaknesses: ["A slow start leaves the deck behind the table."],
  };

  if (mode === "partial") reply.overview = "[[Not A Card In This Deck]] leads the deck.";
  if (mode === "refused") {
    reply.overview = "[[Not A Card In This Deck]] leads the deck.";
    reply.primer.strategy = [];
    reply.keyCards = [];
    reply.weaknesses = [];
  }
  return { ok: true, value: reply, usage: USAGE };
}
