# 2026-07-29 — Per-printing art selection — design spec

Design spec for GitHub issue [#105](https://github.com/HartiganHM/the-99/issues/105) — let the
user see every printing they own of a card and choose which one represents it. Follow-on to
`docs/superpowers/plans/2026-07-27-printings-sets-and-catalog-ingest.md`, which made the app show
*a* printing you own but chose it for you.

- **Design ticket:** [#105](https://github.com/HartiganHM/the-99/issues/105)
- **Track:** 2 (design needed → handoff → readiness → implementation)
- **Surface:** `/collection`, card detail modal — `src/components/collection/card-modal.tsx`
- **Existing property table:** `docs/superpowers/design-tables/collection.md:743-1023`
- **Shape:** addendum to a shipped, fully-specced surface — not a new surface

---

## Problem

The printings epic fixed *which* art you see: `resolveImageUri` (`browse.ts:102-108`) resolves a
printing you actually own, so Arcane Signet no longer renders as an unowned Marvel crossover
printing. What it did not do is let you see or steer that choice.

`BrowseCard.printings` (`browse.ts:34`) already carries every owned printing with its own resolved
image, set code, collector number and quantity. The **only** consumer is `printingCaption`
(`browse.ts:214`), rendered as a meta value at `card-modal.tsx:259,267`. So a collection holding 11
distinct Arcane Signet printings renders one image and the text `CLB · 298 +10 more`. The data is
present; nothing displays it.

Two distinct wants sit behind this, and only the first is in scope here:

1. **Collection-level identity** — "this is my copy of this card." One choice per card, per user.
2. **Deck-level choice** — a different printing in a specific deck. Deliberately **out of scope**;
   it belongs with [#42](https://github.com/HartiganHM/the-99/issues/42) (import existing decks),
   because a deck-level override needs a deck to attach to. This spec must not be mistaken for it.

## Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Read-only or selectable | **Selectable.** The pick persists per user — not a session or device preference |
| 2 | Where the pick applies | **Collection surfaces only** (grid, rows, modal). Deck builder, recommendations and commander surfaces keep the resolver's choice |
| 3 | Entry granularity | **One entry per collector number.** Finish is a text detail on the entry, never its own entry — foil and nonfoil share one Scryfall image, so two entries would offer two choices with an identical outcome |
| 4 | Surface | **Inside the existing card detail modal.** No new route, no modal modes |
| 5 | Pick outlives the holding | **Keep the pick, fall back silently.** A pick whose printing is no longer owned stays stored; the art falls back to the normal resolver, and re-acquiring the card reactivates the pick |
| 6 | Picker visibility | **Only when there is a choice** — one owned printing renders the modal exactly as it does today. This is the overwhelmingly common case: **2,368 of 2,470 unique cards** in the real collection own exactly one printing; only **102** would show a picker |
| 7 | Commit model | **Immediate.** No Save button, no confirmation |
| 8 | Caption follows the pick | Art *and* caption derive from the chosen printing — they must never disagree (see Edge cases for the one exception) |
| 9 | Entry contents | Set name (from the `sets` table), collector number, quantity owned, and finish breakdown when it is not plain nonfoil |
| 10 | Unset ≠ chosen | A card with no pick shows no selection. The fallback-resolved printing is not rendered as though the user chose it |

## Open for Design to call

1. **Presentation of the printing list** — thumbnails, a list with small art, or a horizontal
   carousel. Not pre-empted here.
2. **Placement** relative to the desktop art panel (`card-modal.tsx:180-192`, a 320px fixed
   column).
3. **How selection reads** visually — border, glow, checkmark, scale, or something else in the
   brand's idiom.
4. **Overflow behaviour, and it is bigger than it looks.** Measured against the real collection
   (2026-07-29), the worst case is **54 printings of one card** — `Forest`, followed by `Swamp` 41,
   `Mountain` 32, `Plains` 30, `Island` 28, then `Sol Ring` 13. Basic lands dominate the top of that
   list, which is exactly where art choice is the point, so the picker cannot be designed only for
   the ~11-printing case. Scroll, wrap, capped-with-reveal, or grouped by set are all open.
5. **Mobile composition.** This is the real problem in this ticket and deserves the most
   attention: the mobile modal has **no art panel at all** — `card-modal.tsx:180` is
   `hidden md:flex`, so mobile shows no card image today. A printing picker on mobile therefore
   has no existing anchor to attach to.

## Architecture

### `card_art_preferences`

```
user_id          text  NOT NULL
oracle_id        uuid  NOT NULL   → PRIMARY KEY (user_id, oracle_id)
set_code         text  NOT NULL   -- lowercase, per the §3.3 normalise-on-write rule
collector_number text  NOT NULL   -- TEXT, never int ("12a", "★")
```

- **Keyed on `(set_code, collector_number)`, not `scryfall_id`.** Bare `Name,Qty` CSV exports carry
  no Scryfall ID at all (`parse.ts` supports Moxfield, Archidekt, Deckbox and `Name,Qty`), and
  collector number is the granularity decision 3 chose.
- **No FK to `collection_items`.** That absence is what implements decision 5 — the preference
  outlives the holding. `replaceCollection` deletes and re-inserts every holding on each upload;
  a FK or an `ON DELETE CASCADE` would wipe every pick on every re-import.
- One row per card per user, so choosing again is an **upsert on the composite key**.

### Resolution — tier 0

`loadBrowseCards` (`browse.ts:275-318`) gains a third `printings` alias, `preferred`, left-joined on
`(oracle_id, set_code, collector_number)` from the preference row. Its image becomes the first arm
of `resolveImageUri`:

```
preferred → exact → representative → catalog → identity gradient
```

This is one additional `leftJoin` and one additional `??` arm. The three existing tiers and their
tests are untouched — the tier machinery from the printings epic is being extended, not replaced.

### Two knock-on changes

- **`primaryPrinting` (`browse.ts:205`) must honour the preference.** It currently returns the first
  printing in sort order. The card-level `imageUri` and `printingCaption` both derive from it, so
  without this the grid tile and the modal would disagree.
- **`finish` must be carried onto `BrowsePrinting` and aggregated** (e.g. `{nonfoil: 3, foil: 1}`)
  to render decision 9's detail line. Aggregation drops it today.

### Write path

A server action upserts the preference and calls `revalidatePath("/collection")` — `loadBrowseCards`
is wrapped in React `cache()`, so the read is memoised. Same pattern as `decks/actions.ts:193`.

## Edge cases

| Case | Behaviour |
|---|---|
| One owned printing | No picker (decision 6) |
| Chosen printing no longer owned | Pick retained; art falls back through the remaining tiers (decision 5) |
| Chosen printing has a NULL image | **Caption still names the chosen printing**, art falls back. The caption states the user's intent, which stays true even when the art cannot render; falling the caption back too would make an explicit choice silently vanish. Reachable only via the API — the picker can offer only owned printings, and selecting a blank entry would require one to be rendered |
| `reversible_card` holdings | No `printings` row by design (plan §3.2.3), so they resolve via tier 2 and cannot be picked. One such holding exists in the real collection |
| Bare `Name,Qty` import | `collector_number` is `''` for every holding, so entries are distinguished by set code alone. A card owned in one set shows no picker; owned across three sets it shows three entries, each with an empty collector number — so the entry must read correctly with that field absent, not render a stray separator |

## Test plan

**Unit** — all against existing pure functions:

- `resolveImageUri` with tier 0 set / unset / set-but-null, confirming the chain still falls through
  on null **value**, not on match success
- `primaryPrinting` returning the preferred printing rather than the sort-order first
- `printingCaption` naming the preferred printing, including when its image is null
- finish aggregation, and decision 9's "plain nonfoil shows nothing" rule
- picker suppressed at exactly one printing

**Integration:**

- a preference survives `replaceCollection` — decision 5's entire point
- the upsert is idempotent on `(user_id, oracle_id)`
- **tier 0 actually joins.** The printings epic caught a set-code case mismatch that would have
  made tier 2 match zero rows while type-checking cleanly; tier 0 inherits that trap. Assert a real
  join hit, not just that the code compiles

**Gate:** `pnpm typecheck && pnpm lint && pnpm test` plus the stub-DB build.

## Sequencing notes for the handoff

- **[#59](https://github.com/HartiganHM/the-99/issues/59)** (collection brand + richness pass) is
  still pending and will restyle this modal. Build the handoff against the current property table
  and have the readiness audit check for collisions — the same overlap #35 hit.
- **[#101](https://github.com/HartiganHM/the-99/issues/101)** asks Design to ratify three
  filter-panel decisions made in eng. Worth bundling into the same Design round rather than a
  separate ask.
