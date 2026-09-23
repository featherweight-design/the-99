import { createHash } from "node:crypto";

import { PROFILE_VERSION } from "./version";

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

/**
 * The player's LIST alone — both commander columns and the (oracleId, quantity) pairs — with
 * no version in it.
 *
 * `profileFingerprint` is a CACHE KEY, and a cache key must move when the code computing the
 * cached thing changes, so it carries PROFILE_VERSION. That makes it the wrong answer to "has
 * the player changed this deck": a deploy that bumps the version (1 → 3 over 2026-09-20/21)
 * reads as an edit on every deck. Hugh ruled on 2026-09-23 that only the player's own edits
 * count as drift, so every drift question reads this one, and a version bump is compared as
 * its own stored column where anything needs to know about it.
 *
 * A separate function rather than a flag on the other, so no caller can pass the wrong
 * argument. Same input shape, so a `ProfileHead` passes to either. SERVER-ONLY, like the
 * other.
 */
export function listFingerprint(input: ListInput): string {
  return hash(listBody(input));
}

type ListInput = {
  commanderOracleId: string;
  partnerOracleId: string | null;
  cards: readonly { oracleId: string; quantity: number }[];
};

function listBody(input: ListInput) {
  // Sorted, so row order out of the database cannot move the hash. Two decks with the same
  // contents must fingerprint the same however Postgres happened to return them.
  const rows = [...input.cards]
    .sort((a, b) => (a.oracleId < b.oracleId ? -1 : a.oracleId > b.oracleId ? 1 : 0))
    .map((c) => [c.oracleId, c.quantity] as const);
  return { commander: input.commanderOracleId, partner: input.partnerOracleId, cards: rows };
}

function hash(body: object): string {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}
