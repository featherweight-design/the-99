import { createHash } from "node:crypto";

/**
 * What the player ASKED for in a Suggested changes v2 run, hashed (spec 2026-10-27 §8; the handoff's G4). Kept apart from
 * the deck's input fingerprint (`tuningFingerprint`) on purpose: `stale` compares a run's fingerprint to one computed from
 * the deck alone, so folding the request into it would make every v2 run read as stale. "Same request as your last run"
 * is BOTH matching: the deck's fingerprint (list, games, limits) and this hash (count, words, bracket choice).
 *
 * The words are compared as the player would read them: trimmed, inner whitespace collapsed, case kept.
 */
export function requestHash(req: { count: number; text: string; bracketChoice: string; bracketTarget: number }): string {
  const words = req.text.trim().replace(/\s+/g, " ");
  return createHash("sha256")
    .update(JSON.stringify([req.count, words, req.bracketChoice, req.bracketTarget]))
    .digest("hex");
}
