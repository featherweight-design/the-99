# Price on the buy tag — design spec (#288)

`design/design_handoff_the99_decks/` · R1 → R3 · audited Green 2026-09-05

The UI half of the ManaPool price ingest. `printing_prices` shipped on PR #291 and has **zero
readers in `src/`** — every price in the database is currently invisible. This spec is the contract
between that table and the two places a player will see it.

**Source of truth.** The drawings and their reasoning live in the handoff: `ADDENDUM-README.md`
(R1), `R2-README.md`, `R3-README.md`, and the three `.dc.html` canvases. Where this spec and a
canvas disagree, the canvas is stale in the way `R3-README.md` §6 records; where this spec and
R3 disagree, this spec is wrong and should be fixed. Nothing here reopens a ruling.

---

## 1. What ships

Six changes, none of which adds a mark, a hue, a token, a dependency or a motion.

| # | Change | Files |
|---|---|---|
| 1 | The `buy` tag grows a tail — four tails, one of which is today's bare tag | `src/components/decks/buy-tag.tsx`, `src/components/decks/decklist-row.tsx`, `src/components/decks/suggestion-tile.tsx` |
| 2 | A **price strip** under the `All / Shopping` pills, rendered only while Shopping is active | `src/components/decks/group-toggle.tsx` |
| 3 | `Cheapest first` → `Cheapest to cast` | `src/lib/copy/decks-builder.ts` |
| 4 | `export.pricingNote` sweeps two stale claims | `src/components/decks/export-dialog.tsx`, `src/lib/copy/decks-builder.ts` |
| 5 | The tile tag's scrim rises 82% → 92% | `src/components/decks/buy-tag.tsx` |
| 6 | The price read itself | new `src/lib/decks/price.ts` + `src/lib/decks/price-query.ts`, wired at `src/app/decks/[id]/page.tsx` |

---

## 2. The derivation

Price is keyed by **printing** (`printing_prices.scryfall_id`), and a decklist row is an **oracle
card** (`DeckDetailCard.oracleId`). A row's price is therefore drawn from **one chosen printing** among
that oracle's printings — a join through `printings.oracle_id`, not a lookup — live and cheapest
where such a printing exists, and the reason `soldOut` is expressible at all where none does.

"Live" is the table's own rule, not a clock. From `src/db/schema.ts:81-92`: every row from one
ingest run shares a timestamp, the ingest upserts and never deletes, and a printing that sells out
keeps its last row with a frozen `as_of`.

```
live     = row.as_of === max(as_of)                      ← over the whole table, one comparison
priced   = live && cents !== null
foilOnly = live && cents === null && (foilCents ?? etchedCents) !== null
soldOut  = row exists && !live
absent   = default                                        ← the branch everything else falls to
```

**The read picks the row; the derivation names it.** `soldOut` is `row exists && !live`, so the query
must *not* filter to live rows — a live-only `where` clause would make the state unreachable and its
test vacuous. The read returns one row per oracle, ordered live-first, then non-foil-stock-first,
then cheapest, then by `scryfall_id` for determinism. That order encodes three rulings: a live
printing always beats a stale one, so `soldOut` means no live printing exists rather than "the
cheapest happened to be stale"; a printing with real non-foil stock beats a foil-only one **at any
price**, so a $50 non-foil is never displaced by a $2.10 foil and `foilOnly` means the card is
genuinely foil-only; and the tiebreaker keeps the figure from wandering between two reads.

Four states, and `absent` is the **default branch** rather than a condition. A live row whose
`price_cents`, `price_cents_foil` and `price_cents_etched` are all null tells us nothing about
buying the card, which is exactly what the bare tag means. Zero such rows in staging; the branch is
total regardless.

**The failure mode inverts, and that is the point.** Under a wall-clock window a missed ingest run
would age every row past the window and eight cards would claim to be sold out at once. Under
`as_of === max(as_of)` a missed run leaves every row equal to the maximum, so every row is live and
**no card says sold out**. Staleness stops being something each card asserts badly and becomes one
fact about the table: `max(as_of)` is itself old. That fact is disclosed once, on the strip.

**No rounding, ever.** Whole cents, summed server-side over `priced` and `foilOnly`, printed as-is.

---

## 3. The tag, and its four tails

One tag, four tails. State 4 is today's tag byte for byte.

```
buy · $45.00          priced
buy · $2.10 foil      foilOnly, foilCents set
buy · $6.80 etched    foilOnly, only etchedCents set
buy · sold out        soldOut — the figure is dropped entirely, never shown dim
buy                   absent — no dash, no zero, no placeholder
```

**A sold-out row shows no figure.** Dropping it rather than dimming it means no surface can sum it
and no reader can quote it.

**Absent renders nothing after the word.** Absent is not free and not unknown; silence is the only
honest rendering, and its accessible name is the shipped ownership string with nothing appended.

**The tag never becomes a link.** `pointer-events: none` over card art, 9px at both densities, and
the app's first link-out should not be an accident of density. A store link-out, if Product ever
wants one, belongs in the export dialog as a deck-level action — named here, not drawn, and nothing
in this pass depends on it.

### Inks

Every ink is a token the shipped tag or the shipped row text already uses on `--surface-sunken`,
so this pass introduces **no new pairing to verify** and spends none of the theme pass's margin.

| Tag part | Token |
|---|---|
| The word `buy` | `--warning` |
| Separator | `--border-strong` |
| Row figure, `sold out` | `--fg-body` |
| Tile figure, `sold out` | `--fg` |
| `foil` / `etched` | `--fg-faint` |
| Row tag fill | `--warning` at 13% |
| Tile tag scrim / inset | `--bg` at **92%** / `--warning` at 50% |
| Strip figure / clause | `--fg` / `--fg-faint` |
| Strip provenance line | `--fg-locked` |

`sold out` takes `--fg-body` — the figure's own ink — because it sits in the figure's slot and is
the same class of fact. The tail therefore carries two inks per density, not three, and the state is
still told apart by being a word where the others are a number.

### The row's figure

Right-aligns into a 58px slot under Shopping; hugs under `All`. The slot is sized to eight real
names, and a four-figure price bends the column rather than truncating — the right failure, and
undrawn.

The slot is **new**: `min-width: 58px; text-align: right` on the figure span inside the tag, as the
R1 canvas draws it. Nothing in `src/components/decks` reserves 58px today, and the row variant is an
inline `flex-none` element in a row that already carries the name, the availability marker, the auto
tag and a 44px button — so the slot takes its width out of the card name's share. Eng verifies the
worst case at 320px.

**The row's meta line is not available.** It carries an **EDHREC inclusion percentage**
(`src/components/decks/decklist-row.tsx:52-57`), and a dollar figure beside a percentage is two rates in one slot where
only one of them is the player's money.

---

## 4. The price strip

One element, directly under the `All / Shopping` filter pills, rendered **only while Shopping is
the active filter**, identical at both widths.

```
$84.25 · 6 of 8 priced
prices from ManaPool · last checked Monday
```

**Why it is not on the spine.** The total is scoped by the filter, not by the deck: it is the sum of
what this filter is showing. Hanging it off a deck-level header makes it look like a property of the
deck. Putting it where its scope is buys three things — the "no total on the `All` header" rule
re-derives itself, both densities get one home instead of a per-width argument, and
`src/components/decks/builder-spine.tsx:391`'s deliberate desktop-only omission is preserved rather than overturned
sideways.

`src/components/decks/builder-spine.tsx:391` (`54 owned · 8 to buy`) **stays exactly as shipped** — same words, same
condition, untouched.

### The two lines

**Line 1 — the figure and its denominator.** `6 of 8 priced` names what is missing. The `8` there is
a denominator doing work, so it stays.

> **When every card is priced, the clause drops entirely** — the strip renders `$129.50` and nothing
> else. The filter pill and the spine already say `8` twice on that screen; a third instance names
> nothing missing, and the figure is the only new fact.

When **no** card is priced the figure disappears rather than rendering as zero.

**Line 2 — provenance, at most three clauses.**

| Table | Line |
|---|---|
| current | `prices from ManaPool · last checked Monday` |
| behind | `prices from ManaPool · last checked 12 August · these are behind` |

The behind clause renders when `max(as_of)` is older than the ingest cadence — the run-health signal
the table already exposes. **Figures and the total stay**: the prices are real, they are just old,
and suppressing them repeats the over-reaction one level up.

**The threshold is ten days, not seven.** The ingest runs 09:00 UTC every Monday, so a healthy table
is routinely six days and twenty-three hours old by the following Monday morning. A seven-day
threshold would therefore announce "these are behind" every week, on a feed that had done exactly
what it was scheduled to do — and a warning that fires on the healthy case teaches the player to
ignore it. Ten days is one missed run plus slack.

**A date, not a duration.** `12 August`, not `3 weeks ago`. Past that threshold a weekday stops being
unambiguous, so the line switches from weekday to date at the same threshold that adds the clause.
One constant governs both effects, deliberately, so a player never reads an ambiguous weekday on a
table we already know is behind.

**No banner, and not a warning colour.** Nothing ranks, filters or sorts on price, so a failed run
changes nothing the player can act on. The line stays `--fg-locked`: old prices are not an error and
the player did not cause one, and making the line amber would spend the surface's loudest ink on our
operational problem.

**Accessible name, once per price:** `$45.00 at ManaPool, last checked 12 August, these prices are
behind.`

### Placement — the one eng call this spec makes

`src/components/decks/group-toggle.tsx:38` carries `border-b border-[color:var(--border)] md:border-b-0`. A strip rendered
*after* that container lands **below the divider at phone width** and reads as the list's rather than
the filter's — the exact ambiguity `R3-READINESS.md` flags as worth one look in place.

**Ruling: the strip renders inside the `GroupToggle` container, above its bottom border.** That makes
the divider close the filter row *and its strip* together, which is what the strip's whole
filter-scoped argument asks for. This is placement inside a construct Design has already ruled on,
not a design call — Design is invited to ratify it, and nothing waits on that.

---

## 5. The sort rename

`src/components/decks/consider-toolbar.tsx:57` offers `Cheapest first`; `src/components/decks/consider-panel.tsx:109` sorts on `manaValue`. It
sits directly above the tiles this pass gives dollar figures to — one toolbar, one word, two
currencies.

**`Cheapest first` → `Cheapest to cast`.** Two words added, the shipped word kept.

- Players who learned the label recognise it; the addition disambiguates rather than replaces.
- A dollar figure is never "to cast", so the collision becomes impossible in the only phrase where it
  could occur — without importing jargon. `Lowest mana value` is precise and the wrong register.
- **Fail-quiet survives verbatim.** After the rename, nothing in the app ranks, filters or sorts on
  price, so the no-banner argument stands as written rather than needing a caveat. A caveat on a
  locked argument is a slow leak.

Sharing the word is declined, with precedent: the availability pass turned down `available` as a
one-word swap because `buy` and the availability marker sit four millimetres apart on the same tile.
This is that collision with the currencies reversed. One vocabulary per concept, and money already
has this one.

**Scope.** One copy key (`src/lib/copy/decks-builder.ts:68`), one call site (`src/components/decks/consider-toolbar.tsx:57`). The
literal `<option>Cheapest</option>` in `src/components/decks/builder-tabs.test.tsx:69` is a test fixture and needs no
change.

---

## 6. The export copy

Shipping this makes `src/components/decks/export-dialog.tsx:397` false: *"Pricing is a planned add"* stops being true the
moment a price renders on the decklist, even though the exports themselves do not change.

> **`export.pricingNote`** — `Prices show in the app · exports copy names only`

Two clauses, one middot, no dash doing a sentence break's work. It states what changed and what did
not, in that order.

**Both call sites take the same key.** `:397` and the mobile note at `:425` (`names only · pricing
planned`) are two hardcoded copies of one claim; do not leave the mobile one behind.

**Exports are untouched.** Names only, both tabs. This is a copy correction, not a feature.

---

## 7. The tile scrim, and the contrast ledger

**Raise the tile tag's scrim from 82% to 92%. Unconditionally, tile tag only.**

> A word is recognised; a figure is read. `buy` survives a poor ratio because a player matches its
> shape, its colour and its position. `$45.00` is read digit by digit, and a misread digit is a wrong
> number in somebody's budget. The tail is the first thing on that scrim that has to be read rather
> than recognised.

**Unconditional, not "only when a figure renders."** A scrim that changes with what is written on it
is a primitive deciding how to look from its own content. One value, no state. The bare tag gets a
slightly darker scrim it does not need, at a cost of nothing.

**10 points and no further.** The scrim is already near-opaque; the delta is invisible over normal
art and only works where it is needed. A larger step, or an opaque plate, would read as a chip glued
to the card rather than a label on it.

Nothing else moves: the `--warning` inset stays at 50%, the position and the `pointer-events: none`
are untouched.

### Measured

`--warning` against the scrim, all six themes. Computed from the shipped per-theme `--bg` and
`--warning` in `src/app/globals.css`; the worst case is pure-white card art, which contributes
`(1 − scrim)` of the composite.

| Theme | 82% over white (shipped) | **92% over white** | 92% over dark art |
|---|---|---|---|
| amonkhet | 5.18 | **7.27** | 8.81 |
| phyrexia | 4.66 | **6.49** | 7.68 |
| duskmourn | 4.48 | **6.26** | 7.51 |
| kamigawa | 4.46 | **6.25** | 7.50 |
| innistrad | 4.28 | **6.02** | 7.33 |
| kaldheim | 4.29 | **6.02** | 7.33 |

At 82%, kaldheim, innistrad and kamigawa sit at or under 4.5:1 against the brightest art a card can
have — a figure read at 9px. At 92% all six clear AA with at least 1.3× headroom, and no theme's
`--warning` needs revisiting. **This closes Design's one ask.**

---

## 8. Out of scope

- **The store link-out.** Ruled out of the tag; named as the export dialog's if Product wants it.
  A separate ticket with a copy pass, a new-tab decision and whatever disclosure the ManaPool
  relationship needs. Nothing here depends on it.
- **The last known price on a sold-out card.** The strongest road not taken; two decisions if it
  ever returns, not one.
- **Exports.** Names only, unchanged.
- **Any price on `/decks`, on the `All` filter, or in the Consider panel's sort order.**

## 9. Known, and not blocking

- **`buy` beside a figure can read as a verb.** Ruling: the tag is never pressable at either
  density. The tile is where a mis-tap would land. Worth watching in a beta session rather than
  arguing about now.
- **The 58px row slot is sized to eight real names.** A four-figure price bends the column.
- **`Cheapest to cast` is one word longer** in a toolbar carrying three controls. Fits at desktop;
  the phone toolbar is the row most likely to feel it. Not measured.
- **The strip is the first new element in this pass.** Worth one look in place before beta.
- **If the 92% re-measure ever comes up short** on kaldheim or innistrad, the next move is that
  theme's `--warning`, not another 10 points of scrim. It does not come up short today.

## 10. Verification

- The derivation is pure and gets unit tests over all five branches, including the all-null live row.
- The strip's two line forms, the dropped clause at all-priced, and the vanished figure at
  none-priced get component tests.
- Mobile and desktop parity ships in the same PR, per the repo's design-pipeline rule, and the PR
  passes the design-review skill before it opens.
