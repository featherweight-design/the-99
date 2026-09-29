# Gap report: About, how the app reaches its answers (PR B, the appendix)

Table: `docs/superpowers/design-tables/about-how-it-works.md`. Implementation: `src/components/about/how-it-works.tsx`, `how-rows.tsx`, `src/components/ui/method-tag.tsx`, the mount in `about-page.tsx`, and the rows in `src/lib/copy/how-it-works.ts`.

## Verify (design-review agent 2)

Every row in scope matched but one, and every state in the coverage table is reachable.

| # | Gap | Resolution |
|---|---|---|
| 1 | The Brackets row's head carried `rules text`, `other decks` and `published list`; the table draws two | Fixed: the head carries `rules`, `decks`; `published list` stays on the Game Changers sub-row. `how-rows.test.tsx` pins the head's tags. |

## Deferred, by plan

The `explained in` field (links from each row back to the entries that explain it) ships in PR C with the entries' own link lines, because both need the `entryRow` map. No row draws the pair in PR B.

## Noted deviation

**A row near the foot cannot land 20px from the top.** The appendix is the page's last section, so for the later rows the document ends before the row reaches the top. The browser clamps the scroll there, as it does for any anchor near a page's end. The rows open before the scroll, so a landed row's opened body is always on screen. `probe:about-how-it-works` asserts "20px from the top, or scrolled to the document's end", plus "body on screen"; with the post-open scroll removed, both fail at both widths. Adding bottom padding to force the 20px landing would be a placement change, so it is left to Design rather than improvised.

## Confirm

Gap 1 re-checked against the fixed head: `rules`, `decks`. 0 gaps remain.
