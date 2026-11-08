import { hash, listBody, type ListInput } from "../fingerprint/list";
import { PROFILE_VERSION } from "./version";

export { listFingerprint } from "../fingerprint/list";

/**
 * A stable hash over a deck's OWN inputs.
 *
 * SERVER-ONLY: `node:crypto`. Nothing a `"use client"` component can value-import may reach
 * this file.
 *
 * What is IN, and why each:
 *   · the decklist as (oracleId, quantity) pairs, sorted — the deck's contents
 *   · both commander columns — they are cards the profile folds in everywhere
 *   · PROFILE_VERSION — see version.ts
 *
 * What is OUT, and why:
 *   · `declared_bracket` — what the player told us is not a property of their cards, and
 *     nothing this profile computes reads it. It used to be IN, on the reasoning that a
 *     declaration is an input to the verdict and a cached profile would otherwise report
 *     the old drift — true of the shape at the time, and the shape was the problem: one
 *     press retired the flags, combos, staples, composition and population, 630ms at the
 *     median and 2.2s on the largest deck, to recompute figures identical either side of
 *     it. The verdict takes it at the draw instead (`slotDeck`).
 *   · `auto` — provenance, not membership. Whether the fill added a card or the player did
 *     changes nothing the profile says about it.
 *   · `deck_proxies` — whether a copy is printed is an ownership fact, and ownership is a
 *     later fact group. Nothing this profile computes reads it.
 *   · THE CATALOG GENERATION — `cacheForUser` injects that into the key itself. Repeating it
 *     here would file one input twice, which is not wrong so much as a second thing to keep
 *     in step with the first.
 */
export function profileFingerprint(input: ListInput): string {
  return hash({ v: PROFILE_VERSION, ...listBody(input) });
}
