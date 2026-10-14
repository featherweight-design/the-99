// PATCH for shipped src/lib/copy/availability.ts — R4 ratification (#43).
//
// This file is the diff, NOT a copy block. It exists because
// `availability · copy strings.ts` in this folder is a FROZEN RECORD of what
// was handed off and is deliberately not edited when the vocabulary sweeps.
// Apply these five string edits and one new key to the SHIPPED file.
//
// Ratified 2026-09-02 — items 8 and 9, plus the missing over-family aria key.
// Nothing else in the block changes. No key is renamed. No key is removed.

// ── 1 · Item 8, first half: "0 free" → "none free" ────────────────────
//
// The marker is READ, not counted. On a decklist row it lands as
// `×1 owned · none free`: two numerals a bullet apart parse as a table, a word
// beside a numeral parses as a sentence. It also matches the soft state, which
// was always word-first, and finally agrees with the aria form — the ear
// already heard "no free copies".

  marker: {
-   hard: '0 free',
+   hard: 'none free',

-   hardIn: (deckName: string) => `0 free — in ${deckName}`,
+   hardIn: (deckName: string) => `none free — in ${deckName}`,

-   hardMulti: (deckCount: number) => `0 free — across ${deckCount} decks`,
+   hardMulti: (deckCount: number) => `none free — across ${deckCount} decks`,

// `hard` KEEPS PLAIN "in" — do not let a future sweep unify it to "also in".
// Hard's clause says where the copies went; over's clause says who else is
// holding one, from where you're standing. "also" is only true when there is a
// first — the deck you are inside. On /collection you stand nowhere, so there
// is no "also" to earn.

// ── 2 · Item 8, second half: the over clause unifies on "also in" ─────
//
// Two phrasings for one state was R1's drift risk. "Want" also personifies a
// list, which is the overclaim this file's own header bans: "also in" describes
// a list's contents, "wants it" gives it an appetite.

-   overWithDemand: (shortBy: number, deckCount: number) =>
-     `short ${shortBy} — ${deckCount} decks want it`,
+   overWithDemand: (shortBy: number, deckCount: number) =>
+     `short ${shortBy} — also in ${deckCount} decks`,

-   tileOver: (deckCount: number) => `${deckCount} decks want it`,
+   tileOver: (deckCount: number) => `also in ${deckCount} decks`,

// `overAlsoIn` is UNCHANGED — it was the model for both of the above.
// `over`, `soft` and every existing *Aria string are UNCHANGED: no numeral
// collision, no clause.

// ── 3 · The missing over-family aria key ─────────────────────────────
//
// Same shape as item 2's count-only hardAria. Every *Aria key in the over
// family takes a deck count or a deck name, so a degraded read that resolves
// the shortfall but NOT the claimants has nowhere to put the number and falls
// back to a key that drops it. The shortfall is the only fact the marker
// actually has. Silence is the default for a FREE card, never for a degraded
// one.
//
// NAME IT TO MATCH ITEM 2'S SUFFIX. If the count-only hard key shipped as
// `hardAriaCountOnly`, this is `overAriaCountOnly`; if it shipped as
// `hardAriaNoDeck`, use that suffix instead. The pair matters more than either
// name — the next person to add a state will copy whichever pattern is visible.

+   // Counts only — no deck name, no deck count. Describes lists.
+   overAriaCountOnly: (shortBy: number) =>
+     shortBy === 1
+       ? 'one copy short for the lists that include it'
+       : `${shortBy} copies short for the lists that include it`,
  },

// Which key fires, by what the read returns:
//   full read (counts + names) ......... overAria · overAlsoInAria
//   counts, no names (count known) ..... overAria — already count-only
//   shortfall only, no claimants ....... overAriaCountOnly  ← new
//   no read at all ..................... nothing; marker absent, fails quiet (R2)

// ── 4 · Header rule to carry into the shipped file ───────────────────
//
// The frozen record's header says vocabulary is load-bearing and a swap happens
// in EVERY string at once, never on one surface. That paragraph is why this is a
// sweep and not four edits, and it should exist in the shipped file too — a
// frozen record can't enforce anything. Add to it:
//
//   • "free" and "in use" remain the two nouns. The hard state now reads
//     `none free`, not `0 free`; the over state's clause is always `also in`.
//   • EVERY state that names a deck ships a sibling that doesn't. Three states
//     name decks (hard, hardMulti, over) and a degraded read can strip the name
//     from any of them, so the count-only variant is part of the state — not a
//     fallback bolted on later.

// ── 5 · Item 9 — no change required ──────────────────────────────────
//
// `cards scanned` is ratified as the header noun. "Scanned" is the honest verb
// for what the job did: it looked at every card and formed no opinion about most
// of them. "Checked" implies a pass/fail, "searched" implies the player asked
// for something, "read" is engineering's word rather than a player's. No string
// in this block moves.
