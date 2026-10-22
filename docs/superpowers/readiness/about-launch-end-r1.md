# Readiness audit · About launch-end batch R1

2026-10-21 · PR #2156 · handoff `design/design_handoff_the99_about/addendum-launch-end-batch/` (`README.md`,
`about · launch end batch.ts`, `Main`, `E1` to `E6`) · brief `docs/superpowers/design-briefs/2026-10-18-about-launch-entries.md`
(#2072) · prompt 6 of the 2026-10-18 design-prompts board.

I audited this against `origin/main` at ace45d6ae. The handoff branch is based on that commit, so the audit covers
everything that has landed.

## Verdict: 🟢 Green

All six entries are drawn, opened in the shipped Reference at 1300 and 390, over real captures in all six themes. Each
halo names an element the app actually renders, and the version rule matches the code. The open items are engineering
items, resolved below, plus copy, which belongs to `/copy-review`. Nothing needs to go back to Design.

## Halos against the code

| Entry | Screen | Halo target | In the code |
|---|---|---|---|
| `getting-help` | home | `header [data-help-button='header']` | `HelpButton` writes `data-help-button={place}` (`src/components/help/help-root.tsx:319`); `header` is a `PLACE` key (rows 15 to 24, the header's right) |
| `about-rebuilt` | account | `a[href='/about']` in the menu, `reaches` | the same selector the candidates branch measured (`about/locator-candidates`, ab9115e86) |
| `rule-zero` | friends | `[data-testid='pod-rule-zero']` | `src/components/rule-zero/pod-row.tsx:40,75`, both the link and the start press |
| `invites` | friends | Add a friend plus `[data-invite-count]`, one box | `src/components/social/invite-count-line.tsx:42`; today's frames were shot with invites off (G2) |
| `card-search` | collection | `header button[aria-label='Search all cards']` | `src/components/shell/nav.tsx:560-562`, label from `cardSearchCopy.label` |
| `card-scan` | collection | `[data-testid='collection-add-phone']`, `reaches` | `src/components/collection/collection-place-head.tsx:327`, the same box `collection-add` uses |

## Rules checked

- **Version.** 14 to 16, never 15: `src/lib/copy/about.ts:77-83` says 15 was spent by #1840. All six entries are `since: 16`.
  Only `about-rebuilt` has no switch, so the bump announces that entry alone. The other five are announced when their
  switches turn on.
- **The dead slots (call 8).** No renderer reads `width` or `marksPending` (brief Draft vs code 7, re-checked:
  `src/lib/about/` and `src/components/about/` read neither). But `width` is a REQUIRED field of `AboutEntry`
  (`about.ts:162`), so new entries that leave it out will not typecheck. Resolution: see the plan.
- **Switches (Draft vs code 8).** None of the six switches is in `AboutSwitch` yet (`about.ts:108-139`). Adding them is
  an engineering task.
- **The table page (Draft vs code 9).** Already fixed on main: `screen-for-path.ts:48` maps `/friends/table/[id]` to
  `friends`.
- **The `friends` caption edit.** On and off differ only by the inserted clause ` pick “They’re on The 99”,`. Gating that
  one substring on `SOCIAL_INVITES_ENABLED` therefore leaves the shipped off sentence exactly, with no stray space. (The
  Draft vs code 10 problem does not arise here.)
- **One picture per screen.** No new screen and no new capture fixture. One recapture is needed, with
  `SOCIAL_INVITES_ENABLED` on, for the count line (G2).

## Engineering resolutions (bind the plan)

1. **G1, header scope.** `about-locators.mjs`'s SCOPE rule gains a third exception: a locator that begins with `header`
   is resolved from the page, as the `[role='dialog']` ones already are. `capture-about.mjs` and the readiness test
   follow the rule.
2. **G2 and E4, the invites box.** One element carries one box. A `data-about-invite` wrapper around the Add a friend
   press and its count line gives the locator a single target, so the capture needs no union-box feature.
3. **G7, the + inset.** The measured box is inset to the visible 36 press, as R1b ruled. `collection-add`,
   `start-without-a-collection` and `added-copy` share the locator today, so they take the fix with `card-scan`.
4. **G3.** `getting-help` lists under Home in the Reference and is offered by Home's ?. Nothing more to build.
5. **G8, desktop.** Desktop keeps the phone picture (Hugh). Nothing to build.

## For `/copy-review`, not Design

The words are drafts. They go through the copy lane before they ship. These are open:

- **Draft vs code 2, 3, 11, 12 and 13.** Item 13 is the stale `card-scan` key and caption: the 27 MB offline index,
  "Fast" (shipped as "Auto"), and the Auto clause.
- **G4.** Home's first-run line (`arrivals.ts`, `aboutFirstRunRest`) still says About is "on one page", which
  *About, rebuilt* contradicts.

## Errata found at build (2026-10-21)

These are Design errata with no Design round (orchestrator, 2026-10-21). The code is what was checked.

- **The credits redraw (#2144) lists "Running a deck’s Analysis" as a spender.** The Analysis makes no model call: the
  spenders are tuning, synopsis, intake, proposed cuts and the fits read (`src/lib/model/allowance-rule.ts`). The line
  is left out of `buying-credits`.
- **The credits redraw points at `/credits`, which 404s for a reader without payments** (`readerSeesCredits`). The
  shipped `credits` entry stays for those readers (`buying-credits` declares `replaces: 'credits'`). The redraw ships as a new entry,
  `buying-credits`, behind `PAYMENTS_ENABLED`, and is announced by it (option b).
- **Fact corrections through prose-pass.**
  - `card-scan`: Auto instead of Fast, and Auto keeps the printing the scan matched (`matchedPrinting`), not the first; Normal now picks the printing in the camera; scanning needs a connection (the
    words had claimed a 27 MB offline index); a second copy needs the card taken out of frame in Auto.
  - `card-search`: the rail holds an icon, not a field; the wishlist sentence follows `SOCIAL_WISHLIST_ENABLED`; the deck
    field is "Add a card by name"; the route is `/collection`, since "any page" is not a route.
  - `rule-zero`: the setter picks decks for themselves and their friends, and anyone else picks their own.
  - `about-rebuilt`: no Tools card draws "Try it". The Tools line says a card takes you there.
