# About page — R2 audit, and what R3 owes

**Audited:** 2026-09-14, against `main` at `0e008f2b`.
**Verdict: 🟠 Orange.** The artifact is the right one and most of it is accurate. Three figures
teach something the app does not show, eight shipped features have no entry, and the copy
deliverable contradicts the canvas.

R1's miss is not re-litigated here: R2 changed the unit to a figure with a caption and that was
the correct call. Everything below assumes the specimen grammar stands.

---

## 1 · What was verified and is correct

Checked against source rather than read for plausibility. All of this is right:

| Claim in R2 | Source |
|---|---|
| Four buy-tag states: figure, foil figure, `sold out`, silence | `lib/decks/price.ts` via `price.test.ts:30-52` |
| Fit weights 15 / 25 / 60, breadth full at 200 | `lib/recs/score.ts:67-78` |
| Three-segment bar, two when synergy is unmeasurable | `components/commanders/fit-bar.tsx:1-3` |
| All five Discover orders and their glosses, verbatim | `lib/copy/lanes.ts:162-173` |
| Only Best fit and Something new change the list | `lib/discovery/list.ts:145-151` — the server sort is `"fit" \| "new"`, and both filter |
| Six status words | `lib/copy/refresh.ts:255-262` |
| Eight game axes, two polarities, finding at three games | `lib/decks/game-axes.ts:22-31`, `lib/copy/game-log.ts:23` |
| Commitments' middle row keeps `--danger` at zero | `components/home/commitments-card.tsx:29-35` |
| `◆ FOIL` and `BY NAME` | `lib/copy/set-collections.ts:387,400` |
| A folder is not cleared by `Clear all` | `components/ui/filter-chassis.tsx:302-313` |
| Tile corners: top-left availability or `$`, top-right copies, bottom-left dot and cost | `components/decks/deck-card-tile.tsx:100-135` |
| `short N` for over-commitment | `lib/copy/availability.ts:76` |
| Ramp baseline of 10, so `12 of 10` is a surplus | `lib/recs/roles.ts:5` |

## 2 · Five corrections

**2.1 — The degraded fit specimen prints an impossible denominator.**
It reads `41/65 MEASURABLE FIT`. `measurableTotalFor` returns
`POOL_WEIGHT + ROLES_WEIGHT + (fitSynergy == null ? 0 : SYNERGY_WEIGHT)` — 40 or 100, and nothing
between (`lib/recs/score.ts:87-89`). `rec-card.test.tsx:229` asserts the drawn form at 40. A
reader who learns 65 will never see it, and 41 is above the real ceiling. **The figure is 40.**

**2.2 — The status plate draws a column the app does not have.**
Its fourth column reads `Nothing in it yet. Add cards.`, `Short of a legal list. Add the rest.`,
and so on. Those sentences are a **JSDoc table** in `lib/decks/status.ts:24-30`, written for
engineers; `Nothing in it yet` is not in the tree at all. What the app draws beside a badge is one
figure — `3 to buy · $12.40`, `2 lines unresolved`, `created today`
(`lib/copy/refresh.ts:114-127`). This is the one place R2 breaks its own rule that every specimen
string is a shipped string. Either drop the column, or move those words into the key lines, where
explanatory prose is legitimate and is not claiming to be UI.

**2.3 — The availability plate is missing a state.**
The model has four: `free | soft | hard | over` (`lib/decks/availability.ts:123`). Soft is a card
held only by a deck with no committed version, and it draws `1 in a brew`
(`lib/copy/availability.ts:48`). The plate teaches free, committed, over-committed and not-owned;
the phrase "in a brew" appears nowhere in the canvas. Soft is the state a reader is most likely to
meet and least likely to guess, because it is the one where a claim is real but not binding.

**2.4 — Two of the three unverified tokens differ from the guess.** Resolved from
`src/app/globals.css:66-70`, which is per theme:

| Token | R2 assumed | Actual |
|---|---|---|
| `--avail-soft` | `--fg-muted` | `var(--fg-muted)` — correct |
| `--avail-hard` | `--warning` | `var(--accent)`, with `--avail-hard-fg` a per-theme hex (`#D9975C` in the first block) |
| over | `--danger` | `--avail-over-fg` `#C46857` and `--avail-over-border` `#752619`, per theme |

Structure was right in all three; hue is wrong in two.

**2.5 — The role figure names the wrong four.**
Shipped subjects are **Ramp / Card draw / Removal / Board wipes**
(`lib/copy/commander-explained.ts:47-52`), with baselines 10 / 10 / 8 / 3
(`lib/recs/roles.ts:5`). The figure draws `Lands`, which is a classifier role but has no baseline
and no subject string, and omits Removal, which has both.

## 3 · Coverage — eight entries missing

R2 draws 24. The following are shipped and have no entry.

1. **Update a deck from a pasted list** — `/decks/import` and `/decks/[id]/import`, plus the
   update diff strip. It was in the R1 copy file as "Import a decklist you already have" and did
   not survive into R2.
2. **Export a decklist** — the export dialog's Moxfield/Archidekt-ready text, and the Mana Pool
   checkout link-out.
3. **Put back** — the undo on a removal.
4. **Browsing the collection** — R2 traded "Browse what you own" for the availability plate, so
   search, filters, grid-versus-rows and the remembered view are undocumented. Chapter 01 has no
   entry that simply says: here is your collection.
5. **The deck page** — its curve, colour spread, cost, and its three tabs. The marks plate teaches
   the symbols on it; nothing says what the page is.
6. **Themes** — six of them. Drawn as a row in the account-menu figure and explained nowhere.
7. **Which deck gets a shared copy** — reservations. **Merged as #632 on 2026-09-14**, so it is
   shipped, not pending.
8. **Cards you are proxying** — #633, in flight.

Items 7 and 8 were deliberately held back as the version-2 demonstration of the `NEW` mark
(`about · copy strings.ts:336-345`). **Product has overruled that:** both ship as `since: 1`.
The marks plate already assumes proxies exist — it draws the `P` mark — so deferring the entry
that explains it was internally inconsistent regardless.

R3 therefore needs a different example for the `NEW` mark. Any entry can carry a fictional
`since: 2` in the *behind-reader* artboard without the entry itself being deferred.

## 4 · The copy file contradicts the canvas

`about · copy strings.ts` is still R1. It holds 26 entries under titles the canvas does not
use — `Browse what you own`, `Topping off the last slots`, `Who holds this card`,
`Export a decklist`, `Shelves` in chapter 03 rather than 04 — and it has neither `caption` nor
`keys[]`. `README.md` states that "R2 adds `caption` and `keys[]` per entry"; the file does not.

This is the one finding that blocks build rather than degrading it. PR 1 writes `src/lib/copy/about.ts`
from this file, so as it stands the app would ship R1's entry set behind R2's figures.

## 5 · Built to be updated

What already serves this and should not change: specimens are the real components, so a figure
tracks the app for free; the grammar is four stated rules rather than a house style; the phone
reduction is given per figure type.

What is missing is an add-one-entry path. The page is one 215KB canvas of hand-written markup, so
entry 25 means editing that file — which is how the copy file fell out of step inside a single
round. R3 should add:

- **A blank per-entry template artboard.** Title, route, `opens`, caption, the specimen component
  and which fixture props it takes, up to four key lines, and the phone reduction. A future
  feature's design round then produces one page rather than a canvas edit.
- **The fixture module fixed by name**, which R2 already scoped as `about/fixtures.ts`, with the
  rule stated on the artboard: a new figure adds a fixture there and forks no component.

## 6 · The rule this page needs to survive

No guard can detect a feature that shipped without a paragraph, so it is process, in the three
places work passes through:

1. **`AGENTS.md`, design pipeline** — no UI feature is designed without its About entry in the
   same handoff, drawn on the template above.
2. **The plan** — the `ABOUT_VERSION` bump and the entry named as a task, beside the PR
   boundaries.
3. **`feature-acceptance` close-out** — the entry exists and the version moved.

The `about.test.ts` content hash then does the mechanical half: touching the copy forces either a
deliberate bump or a deliberate re-pin.

## 7 · Not raised as findings

- **Art.** The gradient over a Scryfall crop is the right call for the reason given — a real
  commander dates the page and reads as a recommendation.
- **The mark spending `--accent`.** It is a word on a title line outside every specimen hairline,
  and nothing in the marks family is a word. Accepted.
- **Length.** Four screens is what an honest reference costs. No entry should be cut to shorten
  it; this audit adds eight.
- **The sticky index.** Cuttable, and the in-flow contents list is complete without it. Not worth
  a round either way.
