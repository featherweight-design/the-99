import type { ModelOutcome } from "../model/client";
import type { FitsReadInputs, FitsReadPrompt, FitsReadReply } from "./fits-read";

/**
 * The model stand-in every non-production read uses unless `FITS_READ_LIVE=1`, as Help me choose's
 * (`INTAKE_LIVE`) and the Overview's (`SYNOPSIS_LIVE`) do: a dev server, a probe and a unit test
 * cannot spend a real call by accident, and deployed builds are `production` and call the model with
 * no flag. A stored read records its model as `"stub"`, which the ledger prices at nothing.
 *
 * The reply passes the validator: up to three candidates, each with a sentence naming the card and
 * the deck's commander by key and a cut that is none of the cards a cut may never be. Each other
 * outcome the view draws is one switch away (`FITS_READ_STUB`): `noFit`, `failed` (every deck
 * named fails validation), `busy` and `timeout`. `FITS_READ_STUB_DELAY_MS` holds every reply.
 */

export { STUB_MODEL } from "../synopsis/stub";

export type FitsStubMode = "picks" | "noFit" | "failed" | "busy" | "timeout";

export function fitsReadLive(env: Record<string, string | undefined> = process.env): boolean {
  return env.NODE_ENV === "production" || env.FITS_READ_LIVE === "1";
}

export function fitsStubMode(env: Record<string, string | undefined> = process.env): FitsStubMode {
  const m = env.FITS_READ_STUB;
  return m === "noFit" || m === "failed" || m === "busy" || m === "timeout" ? m : "picks";
}

export function fitsStubDelayMs(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.FITS_READ_STUB_DELAY_MS ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 30_000) : 0;
}

const USAGE = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
const BASIC = (t: string) => /\bBasic\b/.test(t) && /\bLand\b/.test(t);

/** The stub's reply for a prompt, in the shape the model returns. */
export function stubFitsReply(inputs: FitsReadInputs, prompt: Pick<FitsReadPrompt, "deckOf" | "cardOf">, mode: FitsStubMode): ModelOutcome<FitsReadReply> {
  if (mode === "busy") return { ok: false, errorClass: "upstream_busy" };
  if (mode === "timeout") return { ok: false, errorClass: "timeout" };
  if (mode === "noFit") return { ok: true, value: { picks: [] }, usage: USAGE };
  const keyOfDeck = new Map([...prompt.deckOf].map(([k, id]) => [id, k]));
  const keyOfCard = new Map([...prompt.cardOf].map(([k, id]) => [id, k]));
  const blocks = new Map(inputs.decks.map((d) => [d.deckId, d]));
  const subject = keyOfCard.get(inputs.card.oracleId);
  const picks = inputs.candidates.slice(0, 3).flatMap((c) => {
    const d = blocks.get(c.deckId);
    const deck = keyOfDeck.get(c.deckId);
    const commander = d?.commanders[0] && keyOfCard.get(d.commanders[0].oracleId);
    if (!d || !deck || !subject || !commander) return [];
    if (mode === "failed") return [{ deck, sentence: `{${subject}} works beside {${commander}}.`, cut: `{${subject}}`, cites: [] }];
    const never = new Set([...d.keyCardIds, ...d.lockedIds]);
    // A basic only where the deck can spare it, and only when nothing else may go.
    const spare = new Set(c.basicCuts ?? []);
    const cut = d.list.find((x) => !never.has(x.oracleId) && !BASIC(x.typeLine)) ?? d.list.find((x) => spare.has(x.oracleId) && !never.has(x.oracleId));
    return [{ deck, sentence: `{${subject}} works beside {${commander}}.`, cut: cut ? `{${keyOfCard.get(cut.oracleId)}}` : null, cites: [] }];
  });
  return { ok: true, value: { picks }, usage: USAGE };
}
