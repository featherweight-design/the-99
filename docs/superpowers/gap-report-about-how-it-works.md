# Gap report: About, how the app reaches its answers (PR B, the appendix)

Table: `docs/superpowers/design-tables/about-how-it-works.md`. Implementation: `src/components/about/how-it-works.tsx`, `how-rows.tsx`, `src/components/ui/method-tag.tsx`, the mount in `about-page.tsx`, and the rows in `src/lib/copy/how-it-works.ts`.

## Verify (design-review agent 2)

Every row in scope matched but one, and every state in the coverage table is reachable.

| # | Gap | Resolution |
|---|---|---|
| 1 | The Brackets row's head carried `rules text`, `other decks` and `published list`; the table draws two | Fixed: the head carries `rules`, `decks`; `published list` stays on the Game Changers sub-row. `how-rows.test.tsx` pins the head's tags. |

## Copy set in review, recorded in the table

Two rows of the table quoted canvas wording that copy review (in lane, 2026-09-28) changed before the build: the Themes row's title, now "Card and commander themes", and the tutors sub-row's placeholder, now the shipped sentence. The table now quotes what ships. Wording is `/copy-review`'s rather than a design gap, so neither counted against verify.

## PR C: the links, the contents and the sheet line

The `explained in` field shipped here, as the plan deferred it. Each row lists the entries this
deployment draws that point at it (`entryRow`), in page order: a column of 44px links at 13.5px on
the phone, and a wrapping row at 13px from 1000px, in `--accent`. An entry whose switch is off is not
drawn, so it is not linked. Each entry the appendix explains carries its `How this is decided ↓`
line, 10px under its keys, in the Analysis sheet opener's quiet tone, and a 44px target on the
phone.

The contents group follows the handoff's §Contents. The rail puts the group 8px after chapter 04,
under a 1px `--border` top, with the eight titles in entry-row type; the current row takes
`--elevated`. On the phone it is a fifth 44px row under a `--border-strong` top, reading `8 rows`, and
it opens onto eight 44px rows indented 26px. Search counts row titles, and a match opens the group.

The sheet line has no drawn frame. It is set as one more row of the sheet's list, under the titles,
in `--fg-muted`, so it reads as part of the list rather than as a ninth title.

## Noted deviation

**A row near the foot cannot land 20px from the top.** The appendix is the page's last section, so for the later rows the document ends before the row reaches the top. The browser clamps the scroll there, as it does for any anchor near a page's end. The rows open before the scroll, so a landed row's opened body is always on screen. `probe:about-how-it-works` asserts "20px from the top, or scrolled to the document's end", plus "body on screen"; with the post-open scroll removed, both fail at both widths. Adding bottom padding to force the 20px landing would be a placement change, so it is left to Design rather than improvised.

## Confirm

Gap 1 re-checked against the fixed head: `rules`, `decks`. 0 gaps remain.
