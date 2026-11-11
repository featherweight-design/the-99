// The synopsis contract's VERSIONS, in a module of their own so the public landing's featured Overview can read the version
// its rows are written at without reaching the model paths that `limits.ts` sits beside (`check:public-reads` forbids
// `src/lib/synopsis/` and `src/lib/model/` to a public page). `limits.ts` re-exports every name here, so no caller changes.

/**
 * The synopsis contract's fixed values. Every one of them is part of what the contract version
 * covers: moving a count, a budget or a rule means bumping `SYNOPSIS_CONTRACT_VERSION`.
 *
 * A BUMP IS NOT AN EDIT (Hugh, ruling B, 2026-09-23). Reuse is keyed on the list fingerprint
 * alone, so a synopsis written under an older contract keeps showing until the player's next
 * edit, and only a write for a new list uses the new contract. The version is stored per run so
 * the eval harness can tell the contracts' outcomes apart.
 */
// 2: the Mulligan's figures gained the send-back bounds and the commanders' mana values.
// 3: contract A (Hugh, 2026-09-24): a list section drops a failing line and renders when its
//    minimum survives; prose still fails whole.
// 4: contract B: one automatic repair of the refused sections, in the same write.
// 5: Hugh's rating (2026-09-24): a universal staple is never a Key card, and the deck's colors
//    are named (Gruul), never written as mana letters.
// 6: the Mulligan's land range is a fixed line the model does not write; a generated line may not
//    state a land count, hold the commander in hand, or open with its heading's word.
// 7: the Mulligan's budget restated in the prompt (eval harness, primer-budget-c): all four
//    sections rendered on 100% of held-out answers, against 89% on 6. The validator is unchanged.
export const SYNOPSIS_CONTRACT_VERSION = 7;
// 8: the v2 method (plan 2026-10-10-overview-accuracy.md): a weakness checklist with tiers and
//    evidence refs on every claim. Superseded by 11 and 13 (the Overview v2 switch is retired).
// 11: the v2 method, plans first (Hugh's Avatar Aang and Wizards notes, 2026-10-11): the reply
//    names its plans before anything else, a listed combo leads only when the deck is built for it,
//    universal staples stay out of strategy and mulligan, the colors the lands make and each card's
//    own win condition are facts, and it is written by Sonnet 5.5 at effort medium. A METHOD change,
//    so every overview at 8 gets the "method changed" notice and its free rewrite.
export const SYNOPSIS_CONTRACT_VERSION_V2 = 11;
// 9 and 10: contracts 7 and 8 with the interaction figures read from the evidence benchmarks'
//    shared reading (plan 2026-10-10-evidence-benchmarks.md, PR 1b). Written whenever the
//    shared reading was used; a failed label read falls back to 7 or 11. A section retry across
//    the two rewrites the whole document, so one Overview never quotes both readings.
export const SYNOPSIS_CONTRACT_VERSION_BENCHMARKS = 9;
// 12: contract 11 with the benchmarks' interaction figures, as 10 was to 8. Above 11, so a
//    benchmarks row never reads as older than the method and shows the notice for ever.
export const SYNOPSIS_CONTRACT_VERSION_V2_BENCHMARKS = 12;

// 13: the stages shape (lane e7, PR 1a-1, plan 2026-10-29): the Core strategy is three stage lines
//    (Early, Mid, Close, labeled by position and never stored), no Wins by line, two tips, and a
//    land line stating the deck's own keep number (`landKeep`, `stages.ts`). Written for a PLAYER's
//    deck, always (the Overview v2 switch is retired; the interaction
//    reading is a separate axis from the shape; 11 and 12 differed only by it). Above 12, so it
//    never reads as older than the method. Precon Overviews are written at 13 too (lane e7, PR 2:
//    `synopsisPreconContractVersion`), with the alternate-commander line when the box carries
//    alternates. A stored 12 row is never carried to a new deck; a deck that already holds one still reads it.
export const SYNOPSIS_CONTRACT_VERSION_STAGES = 13;

/** The contract a PLAYER deck's write is made under: 13 while the v2 method is on, else as `synopsisContractVersion`. */
export function synopsisPlayerContractVersion(v2: boolean, benchmarks = false): number {
  return v2 ? SYNOPSIS_CONTRACT_VERSION_STAGES : synopsisContractVersion(false, benchmarks);
}

/** The contract a PRECON's Overview is written at and every precon reader selects: 13 while the v2
 *  method is on, else 9 (the benchmarks' reading, nothing is built there). */
export function synopsisPreconContractVersion(v2: boolean): number {
  return synopsisPlayerContractVersion(v2, true);
}

/** The pre-13 contracts: 11 while the v2 method is on, 7 otherwise; 12 and 9 when the interaction
 *  figures are the benchmarks' too. Neither a player's write nor a precon's uses it any more
 *  (`synopsisPlayerContractVersion`, `synopsisPreconContractVersion`); the eval harness does. */
export function synopsisContractVersion(v2: boolean, benchmarks = false): number {
  if (benchmarks) return v2 ? SYNOPSIS_CONTRACT_VERSION_V2_BENCHMARKS : SYNOPSIS_CONTRACT_VERSION_BENCHMARKS;
  return v2 ? SYNOPSIS_CONTRACT_VERSION_V2 : SYNOPSIS_CONTRACT_VERSION;
}
