# READINESS: Upgrade this precon (R1 + A1, self-assessed)

**Verdict (Design's own): Yellow until Hugh approves R1 and engineering answers G1, G2 and G5.** Everything is drawn at 390 and 1300 over the shipped open precon page; the states table covers every state in the brief's States line.

| Area | Ready? | Note |
|---|---|---|
| Entry and placement | Yes | Between `PreconOverview` and the list-note line; nothing in the head moves |
| Picker | Yes | Cards, select / unselect, Overview source line; G3, G4 for glyphs and blurbs |
| Credit confirm | Yes | The press and its line; v2's same-inputs ask (A3) |
| Wait / failed | Yes | v2's clock; reaper covers a dead run (`UPGRADE_REAP_MS`) |
| Results | Yes, with G2 | DecklistRow pairs grouped by cut theme; no Pick |
| After results | Needs eng (G5) | Start with swaps applied, linked draft |
| Short | Needs eng (G1) | Shown as kept and startable |
| Who leads (A1) | Needs eng (G8–G11) | Step, fold, Change, results pair, S1 fact |
| Copy | DRAFT | `precon-upgrade · copy strings.ts`, /copy-review |

## Gaps for engineering
- **G1 · Short runs.** `readUpgrades` (store.ts) returns only done, unrefunded runs; `upgradeChargeFor` refunds a short run, so R2 vanishes on reload. Recommended: keep refunded-short runs readable as results (a `short` flag), still free.
- **G2 · The buy total.** `buyTotalCents` sums every add; the head counts only adds the reader doesn't own, read at draw time (as Shopping). Owned adds show `you own it`.
- **G3 · Glyphs.** `detect.ts` keys on EDHREC slugs; `strategy-icon.tsx` on strategy keys. A slug → glyph map is owed; unmapped slugs draw the shipped dashed fallback.
- **G4 · Blurbs.** `detect.ts`'s blurbs are generic; the brief wants what this deck does with it. The drawn sentences are deck-specific DRAFT; decide between a commander-aware form and the generic ones.
- **G5 · Start with swaps.** `createDeckFromPrecon` takes a run id, applies its kept pairs to the draft and links the deck (R3) so v0 stays the box. `I own this precon` still adds the box's own cards and tokens. A precon list changed since the run (R3 state) turns Start off.
- **G6 · Bracket after equal to before** reads `bracket stays N · Name` (v2).
- **G7 · Signed-out return.** The press's action carries `?upgrade=<key>` through sign-in so the pick is restored; nothing is spent without a press.
- **G8 · Into the 99 or out (A1).** Drawn: into the 99, taking the alternate's own slot, so the count holds and the pair is free. If the run returns "out", the slot needs an add that counts as one of the 12 to 18, and the pair sits under its theme. Engineering says which the run returns.
- **G9 · Runs keyed by commander (A1).** `readUpgrades` keeps the newest run per strategy. With the step it keeps one per commander and strategy, A3's same-direction ask compares both, and the request hash gains the commander.
- **G10 · Detection per commander (A1).** `detectStrategies` reads the face commander's EDHREC tags; the alternate needs its own tags read. An alternate with no backed direction hides the step.
- **G11 · Start with an alternate (A1).** `createDeckFromPrecon` with the run sets the commander and moves the box's commander into the 99, as part of G5.
