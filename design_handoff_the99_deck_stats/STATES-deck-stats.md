# STATES — What this deck is

Eighteen states, both breakpoints. **The block never hides and no cell is ever omitted** — the
loader always returns all four figures, and a hole in a four-part description is worse than a stated
absence. Absence is always the em dash plus a sentence, never a zero.

> **R3 (`The 99 - Deck Stats (R3).dc.html`) is the current drawing** and supersedes the R2 geometry
> noted below: the curve is a **unit tally** (one square per card), the colour spread is **six
> leader lines on one ruler** with counts at the right, the sections are **ruled heads** carrying
> their own denominators, and **no percentage is printed anywhere**. The data contract, both
> denominators and every absence string are unchanged — see §R3 in `README.md`.

> **R2 superseded the geometry below where they differ** (`The 99 - Deck Stats (R2).dc.html`):
> the block is three bands (~470px desktop), the curve is an axis'd chart with counts inside the
> bars, the colours are six cards with the share printed in a 22px track, and a colour at 0 dims
> the card to `0.44`. **Every property in the data contract, every denominator rule and every
> absence string is unchanged** — see §R2 in `README.md` for the two amended rulings.

Drawn on the R1 canvas: S2, S7, S8, S9, S10, S11, S12, S13, S14, S1 (phone), S16, S17.
Not drawn, specified below: S3, S4, S5, S6, S15, S18.

| # | State | Trigger | Record | Colours | Curve | To buy |
|---|---|---|---|---|---|---|
| S1 | **Fresh brew** | commander only; `deck_cards` empty | `—` / `no games logged` | `copies 1`, two rows at 1, caption `add past 1` | one bar at full track, `avg 3.0`, `1 cast · no lands yet` | `—` / `nothing to buy` |
| S2 | **Mid-build, no games** | `record.played === 0` | `—` / `no games logged` | as computed | as computed | as computed |
| S3 | **One game** | `played === 1` | `1–0–0` / `1 game logged` | — | — | — |
| S4 | **Several games** | `played ≥ 2` | `3–1–1` / `5 games logged` | — | — | — |
| S5 | **Finished, single commander** | `colours.copies === 100` | — | 100 / 63 / 37 as drawn | — | — |
| S6 | **Partner pair** | `partner_oracle_id` non-null | — | `copies 101`, both commanders folded in at 1 each | both in the curve; caption reads `both commanders in` unchanged | — |
| S7 | **Nothing to buy** | `cost === null` | — | — | — | `—` / `nothing to buy` / `basics are never counted, so this is not finished` |
| S8 | **No prices at all** | `copies > 0, cents 0, pricedCopies 0` | — | — | — | `3 copies` / `no prices from ManaPool for these`; **money line absent** |
| S9 | **Partly priced** | `0 < pricedCopies < copies` | — | — | — | `3 copies` / `$18.40` / `2 of 3 priced` |
| S10 | **Fully priced** | `pricedCopies === copies` | — | — | — | `12 copies` / `$74.15` / `after the copies you already own` |
| S11 | **Mono-colour** | one colour + colourless | — | figures add to `copies` exactly; **caption still prints** | — | — |
| S12 | **Five-colour** | heavy overage | — | six long bars summing to 211 over 100; no bar exceeds its track | — | — |
| S13 | **Nothing cast yet** | `curve.copies === 0` | — | — | eight baselines, `avg —`, `nothing to cast yet · 38 lands, excluded` | — |
| S14 | **Interior gap** | a middle bucket at 0 | — | — | that column is a 1px `--border-strong` rule with **no figure**; neighbours unaffected | — |
| S15 | **Top-heavy tail** | bucket 7 is the tallest | — | — | `7+` takes full track; the label is what stops it reading as a count of sevens | — |
| S16 | **Roll-up, several decks** | Home, `deckCount ≥ 2` | `12–7–1` / `20 games logged` / `every deck's record, added` | `of 487 cards`, `add past 487` | **not drawn** | **not drawn** |
| S17 | **Roll-up, one deck, no games** | `deckCount === 1`, `played 0` | `—` / `no games logged yet` / `the roll-up of one deck's absence is the same absence` | as computed | not drawn | not drawn |
| S18 | **Reduced motion / reduced transparency / forced colours** | user preference | unchanged | pips and bars lose fills under `forced-colors`; the letter column carries | unchanged | unchanged |

---

**Redrawn in R3:** every absence is one ledger move — **leader dots the full width and an em dash**.
S2/S7 as two dashed figures on the *On the table* rule; S13 as the foot rule and eight mana values
with no squares; S1 as two full-width rules over a denominator of 1; S11/S12 as measured rules on
one ruler, where the overage is visible as long rules and the caveat still prints. **No state was
added or removed, and R3 needs no dimming, no empty track, no baseline rule and no ring.**

**Redrawn in R2:** S2/S7 as the summary bar's two em dashes (with the ring at `0`), S13 as an empty
plot with the axis intact, S11/S12 as dimmed and full-strength colour cards, and three new share
rules — 100%, 1% and 0% — in §4 of the R2 canvas. **No state was added or removed.**

## Notes on the states that decide things

**S1 — a one-card deck is drawn, not suppressed.** One bar at full track height is the honest
drawing: the scale is the tallest bucket, and here the tallest bucket is the only bucket. The reader
learns the axis on the deck where being wrong about it costs nothing.

**S2 — the absence is stated and nothing else.** No `0–0–0`, no CTA, no illustration. The Games tab
*replaces* its panel at zero with a heading, a body, a form and a scope note; a second, weaker pitch
four inches below it is the trap the mix strip named when it deleted its worked-example callout.

**S6 — nothing in the copy changes for a pair.** `both commanders in` is the same clause at one
commander and at two; it describes the *list the figure read*, not how many commanders exist. The
only visible difference is that `copies` is one higher.

**S7 vs S8 — two absences that must not look alike.** S7 is *nothing this app will sell you*, which a
deck short thirty Forests also satisfies; S8 is *three real copies nobody has a price for*. S7 takes
the em dash; S8 takes an accent figure with no money line. Neither is ever `$0.00`.

**S11 — the caveat caption is unconditional.** On a mono-black deck 63 + 37 is exactly 100 and the
caption still prints. A conditional caption teaches a reader that its absence means the figures add
up, and they would carry that rule straight to S12.

**S12 — the overage is visible as six long bars, not as an overflow.** Every share divides by
`copies`, and no single colour figure can exceed `copies`, so no bar can exceed its track. This is
the reading a stacked bar would have had to fake.

**S13 — `avg —`, never `avg 0`.** `manaCurve.average` is `null` at zero copies for exactly this
reason: a deck of nothing but lands has no average, and 0 would read as a deck of Moxen.

**S14 — the empty column is the point.** `stats.ts` returns all eight buckets in order because a gap
mid-curve is a real shape. It draws as a baseline rule and prints no figure; eight printed zeroes on
a thin deck is noise where the absence is the reading.

**S18 — there is nothing to disable.** The block has no animation, no transition and no in-flight
state, so `prefers-reduced-motion` has nothing to answer. Under `forced-colors` the pips and bars
take system colours; every figure and caption is text and survives, and the `W U B R G C` letter
column is why the colour cell still reads when the hues are gone.

---

## Two states that are NOT in this matrix, and why

**In-flight / loading.** The block renders server-side with the panel. There is no moment at which
it is mounted and unpopulated, so the role cell's `have === null` em-dash treatment is borrowed for
*absence* and not for *pending*. If a future client-side path can mount it empty, that path needs a
pending state and this matrix needs a nineteenth row.

**Error.** `loadOneDeckStats` returns `null` only when the user does not own the deck — in which
case the deck page itself is absent, not the block. There is no partial-failure shape: the four
figures come from one call.
