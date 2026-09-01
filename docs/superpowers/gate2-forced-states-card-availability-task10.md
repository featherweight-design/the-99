# Gate 2 — forced-state runtime, `Availability ▾` on `/collection` (#43 Task 10)

Driven, not read. `scripts/probe-collection-filter.mjs` signs in through `window.Clerk`
with the `alpha-test+clerk_test@the99.app` fixture address, opens `/collection` at
390×844 and 1300×900, and reports what the filter row, the menu, the URL, the chips and
the result count actually did.

States are forced at the seam. The dev server runs with `AVAIL_FORCE=1`, which buckets
every oracle id across free/soft/hard/over after the query returns, and with
`AVAIL_FORCE=throw` for the degraded pass. Neither stub is committed; both were reverted
before the PR opened. Real figures cannot reach `hard` or `over` on this account without
a second finished deck competing for a single copy.

## Forced pass (`AVAIL_FORCE=1`)

| # | What was forced | Phone 390×844 | Desktop 1300×900 |
|---|---|---|---|
| 1 | Filter row order | `Color · Type · Set · Sort · Availability` — **fifth** ✅ | `Type · Set · Sort · Availability` — **fourth** ✅ (Color is the inline pip row) |
| 2 | Nothing selected on load | trigger reads `Availability ▾`, aria `Filter by availability, collapsed`, no chips ✅ | same ✅ |
| 3 | Counts partition | `623 + 617 + 616 + 616 = 2,472`, equal to `2,472 results` ✅ | same ✅ |
| 4 | Menu row height | 48px (the phone sheet's touch row) | **40px** ✅ (15.2) |
| 5 | Glyphs | `free` none · `soft` one 8px diamond, **hollow** `1px solid #A89B84` · `hard` filled `#C9A24B` · `over` **two** filled `#C6533F` diamonds in an 11px holder ✅ (15.5) | same ✅ |
| 5b | Glyph seam matches its host (§2) | menu row `#1A160F` = `--surface-rail`; chip `#2A241D` = `--elevated` ✅ | same ✅ |
| 6 | Zero-count row | not reachable — the hash buckets fill all four states. Covered instead by `availability-filter.test.ts` (`disables a zero-count option rather than dropping it`) and by `filter-panel`'s shipped `aria-disabled` path | same |
| 7 | Select two states | URL `?avail=free,brew`; trigger `Availability 2 ▾`, aria `…, 2 selected, collapsed`; two chips; `1,240 results` ✅ | same ✅ |
| 8 | **Resume** — reload on the selected URL | URL unchanged, both chips restored, count still `1,240` ✅ | same ✅ |
| 9 | **Reverse** — one chip ✕ | `?avail=brew`, one chip left, `617 results` ✅ | same ✅ |
| 10 | **Repeat** — re-select the removed state | `?avail=brew,free`, both chips back ✅ | same ✅ |
| 11 | `Clear all` | URL back to `/collection`, no chips, `2,472 results`, trigger back to its collapsed label ✅ | same ✅ |

Rows 5 and 5b are a re-read. The first pass recorded whatever colour it found and had no
spec to compare against, so it passed a soft glyph that was filled `#C6B79A` instead of
hollow `#A89B84`, and never looked for the seam at all. Gate 4's verify agent caught both
against the property table; the readings above are from after the fix, which replaced a
duplicate local glyph with the shipped `AvailabilityGlyph`.

## Degraded pass (`AVAIL_FORCE=throw`)

`loadAvailability` throws; `/collection`'s `.catch(() => null)` swallows it.

| # | Expected (15.15) | Observed |
|---|---|---|
| 1 | Trigger disabled | `disabled: true` at both widths ✅ |
| 2 | `degraded.collectionFilterDisabledAria` on the trigger | rendered verbatim ✅ |
| 3 | **No banner** | no `role="status"`/`role="alert"` mentioning availability ✅ |
| 4 | The list still renders | `2,472 results`, markers simply absent ✅ |
| 5 | A pre-existing `?avail=` (design ambiguity 4, unspecified) | ignored: `?avail=` is a request, not a promise, the same ruling `/commanders` already carries. Honouring it would draw an empty collection, because a failed read makes every card read as free, behind a disabled control with nothing on screen able to clear it. The stale param stays in the URL until the next filter change, so a reload after recovery still lands on the requested state. |

## Gaps recorded, not fixed

Both are properties of the **shipped** filter chrome that four other panels share, so
honouring them redraws surfaces this PR did not touch. Flagged rather than improvised.

| # | Design table | Asks | Observed | Note |
|---|---|---|---|---|
| G1 | 15.1 | trigger **44px** min target | 37px phone, 40px desktop | shared `FilterPanel` trigger; `Type`/`Set`/`Sort`/`Color` are identical. Raising it changes the filter bar's height on every collection surface. |
| G2 | 15.7 | chip `✕` **44px** target | 10×19px | shared `Chip`; the WUBRG, type and set chips are identical. A 44px target on an 18px chip either overlaps the neighbouring chip or requires the chip itself to grow. |

One copy note, also pre-existing: `degraded.collectionFilterDisabledAria` carries an
em-dash, which the copy rules forbid in any rendered string including `aria-label`s. It
shipped in Task 7 and is untouched here.
