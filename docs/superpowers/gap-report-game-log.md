# Gap report — deck game log (#9)

Design source: `design/design_handoff_the99_game_log/` (READINESS: Green).
Property table: `docs/superpowers/design-tables/game-log.md`.
Branch: `feat/game-log`.

The design-review skill ran enumerate → verify → confirm. Agent 1 produced the property
table from the design files alone. Agent 2 checked every row against the implementation
and returned a gap list. Agent 3 re-checked only those items after the fixes.

## Blocking gaps found and fixed

1. **The axis cell inferred its own colour.** It took `--warning` or `--success` from the
   sign of its own tally, which meant a cell could claim a bucket the panel had not put it
   in, and the N=1 section could take pattern ink from a single game. The cell now receives
   a `bucket` prop from the panel and falls back to neutral ink when it is absent, so the
   sections that must stay neutral are mechanically incapable of doing otherwise.
2. **The sub-line's record and denominator took no emphasis.** `deriveHeadline` now returns
   the two substrings that carry their own ink, and the panel splits the rendered sentence
   on them. The wording stays in the copy module.
3. **The Result and Pod field labels existed only as `aria-label`.** They are now visible
   labels at the design's type and spacing, with the radiogroups wired by `aria-labelledby`.
4. **Each axis gloss was part of its checkbox's accessible name.** The wrapping label put
   both the axis name and its gloss into the name, so a screen reader read "Speed got going
   fast" and then the description repeated it. The input now carries `aria-labelledby` for
   the name and `aria-describedby` for the gloss.
5. **The visually hidden checkbox swallowed the focus ring.** The global `:focus-visible`
   ring was drawn on an `sr-only` input, so keyboard focus was invisible on all sixteen
   rows. The row draws it now via `has-[:focus-visible]`.
6. **Focus never entered the form on open.** It does now, on the Result group.
7. **Focus never returned to the collapsed row on close.** The collapsed button is unmounted
   while the form is open, so the `.focus()` call inside the collapse handler was a silent
   no-op at every call site. The intent is recorded on a ref and spent once the button is
   mounted again.
8. **A future date only had to get past the picker.** `max` blocks the picker but not a
   typed or pasted value; Save is now disabled on any date past today, and `submit` refuses
   it as well.

## Cosmetic gaps found and fixed

The form header row, Cinzel heading, and progressive-disclosure date affordance; the
desktop Result + Pod flex row; unselected segment and square weights and borders; every
declared gap (result 7/8, pod 5/6, axis rows 5); the axis text stack; the moved-row label
and gloss inks; the footer's border, spacing and layout; Save and Cancel dimensions,
weights and inks; the desktop-only optional-marks note; the collapsed button's hover on
both text and border; the axis legend size; the history row's delete glyph, confirm
target sizes, and responsive meta slot.

## Deviations from the property table, and why

- **Card-fan colours.** The table records literal hexes (`#33291F`, `#3E3020`, `#4A4033`)
  taken from the canvas. The repo forbids hex in components — the six themes each redefine
  the palette — so these ship as `--surface-raised`, `--border-dashed`, and a `color-mix`
  of `--accent` into `--surface`. In the default theme they land within a few points of the
  drawn values; in the other five they follow the theme rather than staying brown.
- **Desktop Result segment padding.** The table gives `9px 20px`; the build expresses the
  vertical half as the declared `40px` height and keeps the `20px` horizontally. Same box.
- **Axis text stack flex.** The table gives `1 1 auto`; the build uses Tailwind's `flex-1`
  (`1 1 0%`). With one flexible child beside a fixed checkbox the computed width is the
  same.

## Not verified in this session

**The browser parity walk was not run.** No browser automation was available, so mobile and
desktop were verified by reading the responsive classes against the table's two columns
rather than by looking at the rendered page. Every layout claim in this report is a code
claim. The feature's behaviour is covered by 2751 passing unit tests, but a visual check on
a real viewport has not happened.

## Corrected after the report, during PR review

The design gaps closed above are still closed, but Copilot review of PR #332 found eight
behavioural defects this pass did not look for, because none of them are properties on the
table. They are recorded here so the next reader does not take "0 gaps remain" as a claim
about behaviour:

- The delete path issued two statements where one sufficed, and a successfully deleted row
  stayed in its confirming state until the route revalidated.
- Neither of the form's radiogroups answered the keyboard the role promises; both now use
  the repo's roving-tabindex pattern.
- The date field's accessible name said "today" whatever day it held.
- Clearing the date field left Save enabled and submitted an Invalid Date.
- `logGame` walked `worked` and `hurt` in full before refusing, though the vocabulary is
  eight axes and the action is a public endpoint.
- The form read the local day four separate times, so a midnight rollover could leave the
  gate, the label and the submitted instant disagreeing.
- Two games logged before the route revalidated were announced with the same record, because
  the live region read a server figure that had not caught up.
- `logGame` refused any instant past the server's now, so a browser clock running seconds
  ahead turned a legitimate "played tonight" log into a refusal.

## Verdict

0 gaps remain against the property table. Behavioural defects found later in review are
listed in the section above.
