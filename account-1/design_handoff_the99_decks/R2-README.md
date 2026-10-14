# R2 — price on the buy tag (#291), corrections and one new drawing

`design/design_handoff_the99_decks/` · 2026-09-05 · **new files only**

Closes R2's three blockers. Rulings 1–4, the four-tails structure, the no-link-out reasoning and
the deck-level denominator are **accepted and not reopened** — nothing below reargues them.

Canvas: `The 99 - Decks · Price Addendum (R2).dc.html`. R1's canvas, `ADDENDUM-README.md` and
`ADDENDUM-READINESS.md` are **untouched and now partly stale**; every stale drawing is recorded in
§6 rather than redrawn.

**Verdict: 🟢 Green.** No decision is waiting on anyone.

**The one-line summary:** *the locked rule is exact, so staleness stops being a per-card guess and
becomes a table-level fact.* Which is a better design than the one I drew, and it costs one line on
one header.

---

## 1. Blocker 1 → **the derivation was wrong. `as_of === max(as_of)`, and the tags don't move.**

R1 derived `soldOut` from a wall-clock window — "the ingest's cadence plus a grace period, one
constant." That is wrong against `src/db/schema.ts:87`, and wrong in the one way that matters:
**a missed run ages every row past the window and eight cards claim to be sold out at once.**

The locked rule is a comparison, not a duration:

```
live    = row.as_of === max(as_of)      ← exact. every row from one run shares a timestamp.
soldOut = row exists && !live           ← a newer run ran and skipped this row.
absent  = no row
foilOnly = live && cents === null && (foilCents ?? etchedCents) !== null
priced   = live && cents !== null
```

No constant, no grace period, no clock. **`sold out` now means exactly what the table says it
means:** a later run went out and this card wasn't in it.

**And the failure mode inverts, which is the whole gain.** Under the exact rule, a missed run
leaves every row equal to `max(as_of)` — so every row is **live**, and *no card says sold out*.
Staleness stops being something eight cards each assert badly and becomes one fact about the table:
`max(as_of)` is itself old.

**So the per-card tags are unchanged from R1.** Four tails, same four words, same inks. What R1 got
wrong was where the fact lives, not what it looks like.

## 2. Gap §2 is retired, and the state it asked for is drawn

R1 said a run-health signal "would let the header say `prices are behind` instead of eight cards
claiming to be sold out — and #291 does not expose one." It does: **a table whose newest `as_of` is
older than the cadence is the signal**, one comparison, available today.

So the Shopping header's provenance line has two forms:

| Table | Line |
|---|---|
| current | `prices from ManaPool · last checked Monday` |
| behind | `prices from ManaPool · last checked 12 August · these are behind` |

- **The figures stay, and so does the total.** The prices are real; they are just old. Suppressing
  them would be the same over-reaction the window derivation made, one level up.
- **The clause is the third one on that line and the last it will ever take.** It renders only when
  `max(as_of)` is older than the cadence, and it says the only thing the player can act on: trust
  these less.
- **A date, not a duration.** `12 August` rather than `3 weeks ago` — same reason R1 gave for a
  weekday on the current line, and the reason survives the correction. Past a week the weekday
  stops being unambiguous, so the line switches to a date at the same threshold that adds the
  clause.
- **No banner.** Unchanged from R1: nothing ranks, filters or sorts on price, so a failure changes
  nothing the player can act on. This is a quieter signal than a banner *and* a truer one than
  eight sold-out tags.
- **Not a warning colour.** The line stays `--fg-locked`. The prices being old is not an error and
  the player did not cause it; making the line amber would put the surface's loudest ink on our
  operational problem.

**Accessible name gains the same clause**, once per price: `$45.00 at ManaPool, last checked 12
August, these prices are behind.`

## 3. Blocker 2 → **`--fg-body-dim` isn't a token, and `sold out` doesn't need one**

Withdrawn. The fix removes a colour rather than picking one: **`sold out` takes `--fg-body`, the
same ink as a figure**, because it sits in the figure's slot and is the same class of fact — what
we know about buying this card. The tail then has exactly two inks at each density: `--warning` for
the word `buy`, `--fg-body` (row) / `--fg` (tile) for whatever follows it, with `foil` / `etched`
in `--fg-faint` as a qualifier on a figure rather than a fact of its own.

Three inks became two, and the state is still told apart by being a word where the others are a
number.

## 4. Blocker 3 → **the contrast claim is withdrawn and restated as tokens**

R1's table quoted the pre-theme palette and one theme. Withdrawn entirely. Restated the way R4/R5
settled it: **every colour in this pass is a token, and no hex in the drawing is normative.**

| Tag part | Token |
|---|---|
| The word `buy` | `--warning` |
| Separator | `--border-strong` |
| Row figure, `sold out` | `--fg-body` |
| Tile figure, `sold out` | `--fg` |
| `foil` / `etched` | `--fg-faint` |
| Row tag fill | `--warning` at 13% |
| Tile tag scrim / inset | shipped scrim + `--warning` at 50% |
| Total figure / clause | `--fg` / `--fg-faint` |
| Provenance line, both forms | `--fg-locked` |

**This pass introduces no new pairing to verify.** Every ink above is one the shipped tag and the
shipped row text already use on `--surface-sunken`, so the tag inherits whatever the theme pass
verified for body text on that surface — and the tag's own fill is `--warning` at 13% over it,
which *raises* every ratio rather than lowering one. The AAA claim is therefore not mine to make
per theme: **it is the theme pass's, unchanged, and this pass does not spend any of its margin.**

Two things I cannot verify from here and am not asserting:

- **The per-theme figures.** `globals.css` is not in this tree (local `src/` still holds only
  `components/shell/nav.tsx`), so R1's numbers were quoted from a palette I could read and a theme
  that no longer ships. No number replaces them; the token table above is the claim.
- **One thing to look at per theme, not a change request.** The tile tag is `--warning` on a dark
  scrim over card art at 9px — the same size exception `--avail-hard-fg` exists for. On a theme
  where `--warning` and `--accent` sit close (the R4 flag on Neon Rain, Kamigawa and Duskmourn is
  the same shape of problem), the tile tag and the brass evidence bar are the two things to check
  on a real row before beta. Ask of eng: the measured ratio for `--warning` on the tile scrim in
  all six, and I will put it in the ledger rather than infer it.

## 5. The etched guard → **one word, no fifth drawing**

`cents null` + `foilCents null` + `etchedCents set` is derivable and fell through R1's table to
`priced` with no figure. Closed by the derivation in §1: **`foilOnly` reads
`cents === null && (foilCents ?? etchedCents) !== null`**, and the qualifier word is `foil` when
`foilCents` is set, `etched` when only `etchedCents` is.

```
buy · $2.10 foil
buy · $6.80 etched        ← the guard's output. Same slot, same inks, one word swapped.
```

One string (`price.tagEtched`), no new state, no new ink, no fifth tail. Zero rows in staging
against 84,306 priced and 12,423 foil-only, so it renders nowhere today and renders correctly the
day it does.

## 6. Corrections to the citations, and one copy call R1 owed

Four wrong citations. **None changes a ruling**, and one of them strengthens ruling 1.

| # | R1 said | Actually | Effect |
|---|---|---|---|
| 1 | The row's meta line carries `×N owned` and the availability clause | It carries an **EDHREC inclusion percentage** | Ruling 1 survives with a **better** reason: a dollar figure beside a percentage is two rates in one slot, and only one of them is the player's money. |
| 2 | The Shopping header reads `8 cards you don't own` | Shipped is **`N owned · N you don't own`** | Drawn corrected: `54 owned · 8 you don't own`. The total keeps its own denominator, so the two counts don't collide. |
| 3 | The provenance line "replaces the shipped caption on the Shopping filter" | That caption lives in the **export dialog** | The Shopping header's provenance line is **new**, not a replacement, and the export dialog's own line is a separate call — see below. |
| 4 | `names only · prices for reference` | **Not a shipped string.** Quoted from R1's own mock of the dialog | Withdrawn. No claim is made about the dialog's caption except the one below. |

**And the copy call R1 missed.** Shipping this makes `export-dialog.tsx:397` false: *"Pricing is a
planned add"* stops being true the moment a price renders on the decklist, even though the exports
themselves don't change. It needs a line, and the line has to say both halves:

> **`export.pricingNote`** — `Prices show in the app · exports copy names only`

Two clauses, one middot, no dash doing a sentence break's work. It states what changed and what
didn't, in that order, because the second half is the one the reviewer note cared about.

**Exports are still untouched.** Names only, both tabs. This is a copy correction, not a feature.

## 7. Stale drawings, recorded

R1's canvas is kept as the record and is stale in four places. **All four are drawn correctly in
the R2 canvas**; nothing in R1 is redrawn or replaced.

1. **Item 7's staleness ledger** — the "one constant" derivation, and the gap §2 note saying #291
   exposes no run-health signal. Both wrong; §1 and §2 govern.
2. **The `sold out` ink** — `#A89B84` / `--fg-body-dim`. Now `--fg-body`.
3. **Every Shopping header** — `8 cards you don't own`. Now `54 owned · 8 you don't own`.
4. **The whole palette** — R1 is drawn in the pre-2026-09-02 hexes, and its contrast table quotes
   them. The R2 canvas resolves its tokens against theme A; **no hex in either drawing is
   normative**, per §4.

`ADDENDUM-README.md`'s gap §2 is retired by §2 above; gaps §1, §3, §4, §5, §6, §7 and §8 stand.

## Files

- `The 99 - Decks · Price Addendum (R2).dc.html` — the `as_of` derivation, both header forms, the
  corrected tails and the token table.
- `R2-README.md` — this file.
- `R2-READINESS.md` — the verdict and what carries forward.

`ADDENDUM-README.md`, `ADDENDUM-READINESS.md`, `The 99 - Decks · Price Addendum.dc.html` and the
shipped Decks handoff: **untouched.**
