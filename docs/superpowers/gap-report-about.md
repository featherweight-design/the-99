# Gap report — /about

Verified against `docs/superpowers/design-tables/about.md`, row by row, after that table was
committed. Five visual gaps, three states reachable.

## Why this ran late

`AGENTS.md` requires every UI PR to pass `design-review` before `gh pr create`. It was not run on
#653, #658 or #666 — the three PRs that built this page. `pr-review` and `feature-acceptance` both
ran on all three; this one was simply skipped, and it is the gate whose entire job is comparing the
build to the handoff property by property.

The cost is measurable. The page shipped with **five figures against a handoff that drew
thirty-four**, and the five gaps below sat through four review rounds, a contact sheet and a
close-out walk. Not one of those artifacts can catch a 1px type size or a missing padding axis —
they are not looking at the table, because nobody had written it.

## Visual gaps

| # | File | Element | Property | Design | Was | Now |
|---|---|---|---|---|---|---|
| 1 | `about-page.tsx` | h1 | font-size (desktop) | 29px | 30px | 29px |
| 2 | `about-page.tsx` | h1 | line-height | 1.2 | unset | 1.2 |
| 3 | `about-page.tsx` | route link | font-size | 11.5px | 11px | 11.5px |
| 4 | `about-page.tsx` | key line | font-size | 10.5px | 11px | 10.5px |
| 5 | `specimen.tsx` | frame | padding | 14px 16px | 14px | 14px 16px |
| 6 | `contents-rail.tsx` | rail | top | 0 | 24px | 0 |

## Not gaps, and worth recording

**The display face is not Cinzel — it is per theme.** `--font-display-face` is Cinzel on Amonkhet,
Chakra Petch on Kamigawa, Trirong on Ixalan and so on (`globals.css:80, 123, 203…`). The canvas
drew Cinzel because it was rendered in the Amonkhet palette. A screenshot of the app in Neon Rain
therefore shows a sans display face against the canvas's serif, and that is the theme system
working rather than a divergence. `font-display` resolves correctly in all six.

**The sticky index is drawn in the canvas and was cut in Design's own readiness note.** It was
declined twice on the strength of that note and then built after Hugh overruled it. The table
records what the canvas draws, which is the rail.

## State reachability

| State | Trigger | Verdict |
|---|---|---|
| Version 0 | `seen === 0` | ✅ every entry, nothing marked, dismiss present |
| Behind | `0 < seen < ABOUT_VERSION` | ✅ eyebrow, marks, dismiss — pinned in `about-page.test.tsx` with a version-2 page |
| Current | `seen >= ABOUT_VERSION` | ✅ no eyebrow, no marks, no dismiss |

All three are reachable and asserted. Only the first is photographable on one account, because the
acknowledged version lives in `user_prefs` — recorded in the close-out.

## What this does not cover

`design-review` compares a build to a handoff file by file. It cannot see a route that never got
the component, a phone that diverged from its desktop, or a surface reimplementing what another
route already has — `feature-acceptance` owns those, and its contact sheet is what found the
caption stutter and the server/client crash this skill would have walked straight past.
