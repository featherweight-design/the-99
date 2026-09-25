# Gap report — /about

Verified against `docs/superpowers/design-tables/about.md`.

## This report is the second version, and the first was wrong

The first run reported five gaps. It found six, and it found them against a table whose **phone
column was the shipped code rather than the canvas** — so every phone row agreed by construction
and certified the build instead of the design. The cold-eyes pass caught that by recomputing each
row from §5, which is the one thing my verification pass could not do, having just written the
table.

What follows is the real enumeration.

## Why the gate ran late at all

`AGENTS.md` requires every UI PR to pass `design-review` before `gh pr create`. It was not run on
#653, #658 or #666 — the three PRs that built this page. `pr-review` and `feature-acceptance` ran on
all three; this one was skipped, and it is the gate whose whole job is comparing the build to the
handoff property by property.

## Gaps

| # | Element | Property | Design | Was | Found by |
|---|---|---|---|---|---|
| 1 | h1 | font-size (desktop) | 29px | 30px | pass 1 |
| 2 | h1 | line-height | 1.2 | unset | pass 1 |
| 3 | key line | font-size | 10.5px | 11px | pass 1 |
| 4 | contents rail | width | 216px | 220px | cold-eyes |
| 5 | h1 | font-size (phone) | 23px | 24px | cold-eyes |
| 6 | h2 | font-size (phone) | 16px | 19px | cold-eyes |
| 7 | h3 entry title | font-weight | 600 | 400 (preflight) | cold-eyes |
| 8 | h3 entry title | font-size (desktop) | 15.5px | 16px | cold-eyes |
| 9 | h1 / h2 | font-weight | 700 | 400 (preflight) | review |
| 10 | h1 → intro | separation | 10px | 6px | review |
| 11 | route link | font-size | 11px / 11.5px | 11px flat, then 11.5px flat | cold-eyes |
| 12 | specimen frame | padding | plate 14/16, **inset 12** | one blanket value | cold-eyes |

**Three of my own fixes were wrong.** Row 11: the first pass moved the route link to 11.5px at every
width, which fixed desktop and broke phone. Row 12: the table collapsed two drawn treatments into
one row, so the fix applied one value to both — 17 frames in §3 are `padding:12px` and 12 are
`14px 16px`. Row 4 I had recorded as 220px, which is what the code said.

Every row a machine can check is now checked by one. `about-page.test.tsx` asserts the sizes, the
weights, the separation and both padding treatments, and each reverts to failure.

## Deliberate departures

**`top` on the rail is not the canvas's `top:0`.** §3 draws the sticky rail inside a static frame
with `padding:30px 30px 34px`, so it sits 30px clear of the edge and never sticks in the mock. The
app has no top chrome at that width, so `top:0` puts the Contents label against the viewport edge
the moment the page scrolls. The drawn clearance transfers; the property that produced it does not.

**The code has 41 entries and the canvas drew 33.** Two are the launch entries `locked-cards` and
`change-commander`, drawn by the launch-entries addendum and shown only while their features'
switches are on. The six other extras are `decklist-order`, added
after #642 shipped the decklist's sort control; `commander-availability`, added by #683;
`review-and-commit` and `new-deck`, drawn on the §G template as R5; `informed-build`, which closes
sub-project 2 of the deck-analysis line; and `combo-awareness`, which closes sub-project 3. All six
arrived after the canvas was drawn. Earlier text here said "a handoff that drew thirty-four" — it drew
thirty-three, and the code's own figure has moved twice while this PR was in review, which is why
`about.test.ts` now pins it rather than leaving it to be re-read.

## Not gaps

**The display face is per theme.** `--font-display-face` is Cinzel on Amonkhet, Chakra Petch on
Kamigawa, Trirong on Ixalan. The canvas drew Cinzel because it rendered in Amonkhet, so a screenshot
in Neon Rain showing sans against the canvas's serif is the theme system working.

**One theme will not render weight 700 at all.** `globals.css:487` pins `font-synthesis-weight: none`
on `[data-theme="kaldheim"] .font-display`, and that face ships a single weight — so under First
Frost the headings stay at 400 with `font-bold` applied. That is a property of the theme rather than
of this page, it is true of every `font-display` heading in the app, and it is recorded here because
the table's unconditional "700" would otherwise read as a promise.

## What this skill cannot see

It compares a build to a handoff file by file. A route that never got the component, a phone that
diverged from its desktop, a surface reimplementing another — `feature-acceptance` owns those, and
its contact sheet is what found the caption stutter and the server/client crash that this pass
walked straight past twice.
