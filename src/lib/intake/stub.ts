import type { ModelOutcome } from "../model/client";
import { matchWords, type PhraseIndex } from "./match";
import type { ReadResponse } from "./read";

/**
 * The model stand-in every non-production read uses unless `INTAKE_LIVE=1`, as the synopsis's
 * does (`SYNOPSIS_LIVE`). A dev server, a probe and a unit test cannot spend a real call by
 * accident; deployed builds are `production` and call the model with no flag. A stored read
 * records its model as `"stub"`, so a probe can tell from the row that no real call was made.
 *
 * The reply is the free match's own reading of the words, returned as the model would return it
 * (labels and names, never slugs or ids), so it survives the validator on any words the free match
 * can read. `INTAKE_STUB` switches it to each other outcome the panel has to draw: `nothing` (a
 * reply with no valid chip, refunded), `malformed`, `busy` and `timeout`, and `wider`, the free
 * match's reading plus the Tokens theme, so a dev server can draw an answer the look ADDED.
 * `INTAKE_STUB_DELAY_MS` holds every reply that long, so a Stop can be pressed while it runs.
 */

/** The synopsis stub's name: one string the ledger prices at nothing (`UNBILLED_MODELS`). */
export { STUB_MODEL } from "../synopsis/stub";

export type StubMode = "mapped" | "wider" | "nothing" | "malformed" | "busy" | "timeout";

export function stubMode(env: Record<string, string | undefined> = process.env): StubMode {
  const mode = env.INTAKE_STUB;
  return mode === "wider" || mode === "nothing" || mode === "malformed" || mode === "busy" || mode === "timeout" ? mode : "mapped";
}

/** How long the stub holds a reply (`INTAKE_STUB_DELAY_MS`), capped well under the read's deadline. */
export function stubDelayMs(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.INTAKE_STUB_DELAY_MS ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 30_000) : 0;
}

/** Whether this process calls the real model: production builds, or an explicit opt-in. */
export function intakeLive(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === "production" || env.INTAKE_LIVE === "1";
}

const USAGE = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

export function stubReply(words: string, index: PhraseIndex, mode: StubMode): ModelOutcome<ReadResponse> {
  if (mode === "malformed") return { ok: false, errorClass: "malformed" };
  if (mode === "busy") return { ok: false, errorClass: "upstream_busy" };
  if (mode === "timeout") return { ok: false, errorClass: "timeout" };
  if (mode === "nothing") {
    return { ok: true, usage: USAGE, value: { themes: ["Not A Theme"], cards: [], budgetDollars: null, bracket: null, notUnderstood: [words.slice(0, 120)] } };
  }
  const { chips, phrases } = matchWords(words, index);
  const value: ReadResponse = { themes: [], cards: [], budgetDollars: null, bracket: null, notUnderstood: [] };
  for (const c of chips) {
    if (c.kind === "theme" && value.themes.length < 6) value.themes.push(c.label);
    if (c.kind === "card" && value.cards.length < 3) value.cards.push(c.name);
    if (c.kind === "budget") value.budgetDollars = c.dollars;
    if (c.kind === "bracket") value.bracket = c.bracket;
  }
  if (mode === "wider" && !value.themes.includes("Tokens")) value.themes.push("Tokens");
  // The player's own phrases, verbatim, as the model is asked to copy them.
  value.notUnderstood.push(...phrases.slice(0, 10).map((p) => p.slice(0, 120)));
  return { ok: true, value, usage: USAGE };
}
