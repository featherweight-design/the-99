# READINESS: stand-in row addendum (3a, word tags)

Audited 2026-09-26 against `main` at `d3bbc687`, which is after E1 (#1037, honest matching). This is the engineering audit of `ADDENDUM-README.md` and `Stand-in Row Addendum.dc.html`, for the adopted option **3a** only. 3b, 3c and 2a stay on the canvas and are not built.

## Verdict: Green

Nothing here needs a Design round. Every finding below is engineering's to resolve in E2 or is copy owed to /copy-review. The one open product call, how lands read, is Hugh's and is being asked separately. It does not block the spell row.

## What was checked

| Area | Result |
|---|---|
| Tokens | `--fg-body`, `--fg-muted`, `--fg-faint`, `--surface`, `--border-strong` and `--border-dashed` are each declared in all six themes of `globals.css`. |
| Layout at 1300 | The comparison spans `1 / -1`, indented 43px, and measures about 560px. The price and Take stay on row 1. This matches the canvas grid (`gridColumn: "1 / -1"`, `paddingLeft: 43`). |
| Layout at 390 | Today the price sits on its own line under the name and Take spans both rows. In 3a the price chip joins the name line and Take sits on row 1. Row 1 then leaves the name about 160px after the 43px lead-in, the ~64px chip, the 72px Take column and the gaps: about 20 characters of 13px semibold before it ellipsizes, as the README says it does. The comparison then gets the full width after its indent, about 315px. Today's facts line gets 233px: the 276px first column (358 − 72 − 10) less its own 43px indent. |
| Budget against the measure | See E2 below. The worst never-dropped `LOSES` group fits both budgets with at most one `KEEPS` item. |
| Clip backstop | 19px / 40px. At sans 12 / 1.45 a line is 17.4px, and two lines with the 3px row gap take 37.8px, so one line fits under 19 and two under 40. It is a backstop only: E2's measure asserts `scrollHeight <= clientHeight`, so a clip that engages fails the run. |
| Accessibility | The tags are `aria-hidden`, and each group carries a visually hidden `keeps ` / `gains ` / `loses `. That is buildable as drawn. |

## Engineering findings (E2 resolves; no Design round)

**E1. A word can be kept and lost at once.** The `draw` role and the `draw` theme share the word "draw", so after E1 a row can keep the role and lose the theme. Measured over the corpus below: `KEEPS draw … LOSES removal, draw, protection, …` (Erebos, Bleak-Hearted's stand-ins). The writer dedupes by the word drawn: a word in `keeps` is left out of `gains` and `loses`.

**E2. Budget against the measure.** This was an ad hoc run over local-dev's catalog, not `measure:swap-lines` itself (which ranks against its 60 widest-role originals only). It ranked every Commander-legal spell against those 60 plus the 60 spells with the most honest jobs: 112 originals and 405,623 rows.
- `LOSES` groups by size: 0 items 3,884 · 1: 147,666 · 2: 71,618 · 3: 113,095 · 4: 51,926 · 5: 12,612 · 6: 4,548 · 7: 274.
- The worst row with one `KEEPS` item and every loss runs 78 characters, tag words included (`KEEPS draw LOSES removal, draw, protection, a sacrifice outlet, death triggers`). Its `LOSES` items are about 60 characters of sans 12 (~380px), so the group is about 422px with its tag. The kept item and its tag add about 72px, and the group gap 14px: about 508px in all.
- At 1300 that fits the 560px single line, with about 50px to spare.
- At 390 it fits only under E3's reading. Line 1 holds `KEEPS` and its item (~72px), the gap, the `LOSES` tag and about 187px of loss items. Line 2's 315px holds the rest, with room for the waste of breaking between items.
- This is an estimate, not a measurement. The E1 dedupe also shortens this very row, because "draw" is kept.
- E2's writer therefore simulates the wrap at both widths (groups, tags, gaps, breaks between items), not a character total, and applies the README's drop order until the row fits.
- E2's measure asserts it in the real layout.
- If a row whose `LOSES` group alone cannot fit ever appears, that is reported to d9 with the row, not clipped.

**E3. A group longer than a line.** At 390 a 7-item `LOSES` group (about 422px) is wider than the 315px line. The README says a group "wraps as a unit" and its items stay together. Read as: an item never splits, and a group wider than a line may start on the current line and break between items. Otherwise the group could not be drawn at all, and E2's fit at 390 depends on this reading.

**E4. Mana value on the row.** `MV n` leaves the row. The README keeps it "only as a gain or loss that fits". A stand-in's mana value is always at or below the original's, so it is never a loss. E2 draws it as the last `GAINS` item (`mana value {n}`) when it is strictly lower, and the budget drops that item first.

**E5. The lead's claim.** The fixture lead ("Every card here ramps, as Lotus Cobra does") is true only when ramp is the original's one job. After E1 a stand-in keeps at least one of the original's jobs, with ramp read by its kind. The lead's job clause therefore takes the original's honest jobs joined by `or`. E1's "None of them has X's …" clause retires, because every row now says its own losses. That requires E2 to lift today's cap: `jobWords` keeps two items (`JOBS_SHOWN = 2`, `sheet-model.ts`). In 3a `loses` is uncapped, and `keeps` and `gains` are trimmed only by the budget's drop order. The staples sentence and the unlisted-order variant stay. The wording goes to /copy-review.

**E6. The job line.** `landfall: one mana of any color` is fixture prose. The shipped job line is built from the honest jobs (`{type} · mana value {n} · {jobs}`), with ramp named by its kind. The wording goes to /copy-review.

**E7. Residue.** The 41 four-line pairs in `scripts/lib/swap-lines-residue.mts` (9 land, 32 spell) were measured on the old mono facts line. A spell row is now a comparison held to 1 line at 1300 and 2 at 390. `measure:swap-lines` is rebuilt for that. The 32 spell pairs should retire, and any that remain are listed with their reason. The 9 land pairs stand or fall with Hugh's call on lands.

## Open with Hugh (not blocking the spell row)

**Lands.** Design reads lands as keeping 1a's mana line, and d9 is asking Hugh whether to overrule that. Until he rules, E2 builds the spell row and leaves the land row as shipped, apart from the 390 price move, which the README applies to lands too.

## Copy owed to /copy-review

- The tag words `keeps`, `gains` and `loses`, plus the hidden labels and `staple`.
- The spell lead (E5) and the job line (E6).
- The `mana value {n}` gain (E4).

Row items reuse the E1 job vocabulary.
