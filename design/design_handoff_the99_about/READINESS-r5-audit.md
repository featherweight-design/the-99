# About page — R4 audit

**Audited:** 2026-09-15, against `main` at `0814f87f`.
**Verdict: 🟡 Yellow, and green is not reachable by another round.** Every R3 finding is closed and
R4's own work is sound. What is outstanding is four deltas against code that merged *after* R4 was
drawn, plus two key lines in the new entry that are wrong about structure rather than vocabulary.

All six are copy-file edits. None needs a redraw, and none is a design decision.

---

## 1 · R4's corrections, closed

| Finding | R4 |
|---|---|
| Deck import promised a Moxfield link | Closed — two doors, and the caption denies a link mode outright |
| Export tabs and button invented | Closed — `Decklist` / `Shopping list`, `Copy to clipboard`, `Copied ✓`, `Download .txt` |
| Put back mixed two surfaces | Closed — deck page chosen, entry retitled `Undoing a removal`, caption names `Put back` in a clause |
| Per-theme hexes | Closed — all six pasted |
| Entry 33 | Drawn, on the template, in about fifteen minutes and touching two places |

R4's own open item — the role names — was already resolved in the R3 audit and is correct:
`Ramp / Card draw / Removal / Board wipes` at 10 / 10 / 8 / 3
(`copy/commander-explained.ts:47-52`, `recs/roles.ts:5`).

## 2 · Entry 33 — the fixtures were flagged, the structure was not

Design held this open for a vocabulary pass and stood behind the structure. The vocabulary is
indeed wrong — one of six strings survives — but **two of the three key lines are wrong about
what the surface is**, which the fixture caveat does not cover.

The summary draws **card rows in three sections**, not deck rows
(`lib/collection/summary-read.ts:42-56`, `copy/card-assignments.ts`): `No longer to buy · N`,
`Still to buy · N`, `Still short · N`. A card row carries the decks that want it as nested
claimants; there is no line per deck, and no "other decks unaffected" count exists in the copy
module.

- Key 2 — "a deck's line is the availability it gained or lost" — has no referent. Rewrite around
  the card row and its claimants.
- Key 3 — "decks nothing happened to are counted, not listed" — describes a figure the surface
  does not draw.
- Key 1 — before and after, both printed — holds: `lede` carries was-and-now and `heading` prints
  the total.

Real vocabulary for the figure: eyebrow `Collection replaced` (Design's guess, correct),
heading `5,132 cards in your collection`, the three section headings above, `Look at the file
again`, `Done`. Rule 2 of the copy file means the built specimen takes these from
`card-assignments.ts` at render time regardless — so this matters for the keys and the caption,
not for the figure.

## 3 · Four deltas from code that merged after R4

| Merged | What it does | What About says |
|---|---|---|
| #648 | **The chooser** — you give a contested copy to a deck you pick, overriding seniority (`copy/card-assignments.ts`: `Give the spare copy to`) | The `reservations` entry describes seniority only: "the committed deck holds it and the other reads as short". Its own title asks "Which deck gets a shared copy" and the answer is now *you do* |
| #649 | **`/collection/proxies`** — a real route with its own loading boundary | The `proxies` entry is `route: '/decks'`, `opens: 'opens a deck'`. The route it names is not the one the feature got |
| #642 | **Decklist ordering** — Name / Price / Mana value, with `Curve up` / `Curve down` (`copy/deck-sort.ts:42-45`) | No entry anywhere |
| #651 | The review row marks a printed add rather than billing it | Not contradicted, but the proxies caption's account of the shopping total now has a second surface |

The `reservations` entry was written when reservations was a data model (#632) and the UI had not
landed. That is the same failure as entry 33, one round earlier.

## 4 · Why another round will not fix this

R2 was audited at `0e008f2b`, R3 at `5b2ccd0a`, R4 at `0814f87f`. Eight, then eight more features
merged between them. Every round has closed every finding and arrived carrying new staleness,
because the page documents an app that ships daily and a design round takes longer than a day.

**The artifact is not the problem and a fifth round is not the fix.** The specimen grammar already
solves the hard half: a figure mounts the real component and cannot go stale in the way a
screenshot does. What goes stale is caption, keys and route — three string fields, owned by the
copy file, which is PR 1's subject and passes `/copy-review` before any of it renders.

So: carry §2 and §3 as build errata against `src/lib/copy/about.ts`, and let the rule in
`AGENTS.md` §Design pipeline keep the page current from here, one entry per feature, which is the
only mechanism that works at this cadence.

## 5 · Verdict

**🟡 Yellow on the handoff, 🟢 green to build.** Nothing outstanding requires Design. The six
edits below belong in PR 1 and are listed here so the copy pass has them in one place:

1. `post-import.keys[2]` — rewrite around the card row and its claimants.
2. `post-import.keys[3]` — drop; the unaffected-deck count does not exist.
3. `post-import.caption` — "which decks felt it" survives, but the figure is card-first; say so.
4. `reservations.caption` — seniority is the default, and the chooser overrides it.
5. `proxies.route` — `/collection/proxies`, and `opens` drops.
6. New entry — decklist ordering, chapter 03, `since: 1`.

Item 6 is the only one that wants a figure. It is an inset over an existing control, drawn from
the template, and the entry can ship with `keys: []`, which the copy file's rule 3 calls a
finished answer rather than a gap.
