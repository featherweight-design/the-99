# Readiness: hide a commander

**Verdict: 🟡 Yellow.** Design is complete enough to build and nothing needs a Design round-trip. Every gap below is resolvable in engineering or at `/copy-review`, and none contradicts one of Hugh's four rulings. It replaces the designer's "Green from Design".

Audited 2026-10-31 against `origin/main` @ab1e3b7e7 (the handoff, PR #2536, rebased onto it). The designer's own READINESS cites @c245288 and the README cites @7bf3c89; both are stale. Every code claim below was read in the tree. "Not verified" marks what was not.

**Hugh's rulings, checked against the boards.** A commander stays hidden until undone (no expiry anywhere): held. A Hidden list restores it: held. Hidden from For you, Discover and Help me choose, Help me choose silently: held on the live-results screen, **broken in History** (Y1). The page still opens, says hidden, offers Unhide: held in the design, **not by the code as it stands** (Y2).

## Orange

None.

## Yellow (all eng-resolvable; the build plan names them)

1. **Y1. Help me choose History would announce the hidden commander.** `loadResultsPage` (`src/lib/intake/rows.ts:90`) computes `gone` as every pick of a stored read that the current search no longer lists. `choose/page.tsx:324` draws those under `GonePicks` ("Not open to you now · N", reason `no longer among the commanders we rank`, `help-me-choose-history.ts:46-49`), and `PastRunNote` prints "N of M open" from `page.gone.length`. Once `isCandidate` excludes hidden commanders, a past pick that was hidden lands in that group. That is the "never named, never counted" the ruling forbids and contradicts settled call 3. Fix: subtract hidden ids from `gone` and from `past.picks` before either is drawn. Nothing new to draw.
2. **Y2. The commander page cannot open a hidden commander if the filter sits where the README implies.** `resolveCommanderSlug` (`src/lib/discovery/resolve-slug.ts`) resolves through `findScoredCommander` (`rankableScoreRows`, `store.ts`), then `getRankedList`, then `loadCandidateSlugRows` (`discoverCandidates`). Filtering in any of those 404s the page, and a filter before `assignDiscoverySlugs` (`list.ts:189`) renumbers same-name dedup suffixes, so a bookmarked slug resolves to a different commander. The page's "Rank N" for any other commander also drifts if stored ranks still count hidden rows. The filter belongs after slug assignment, in the list loaders; see `build.md`. No design change.
3. **Y3. "back in For you" / "back in Discover" can be false.** The lane is derived from ownership. A hidden commander that has since been built (built commanders are out of both lists, `notBuiltBy`) or has no score and no index belongs to neither. Only the For you wording is drawn. For a built one the Hidden row's "opens its page" also **404s today** (`store.ts` notes a built commander resolves nowhere). Ruling needed at `/copy-review`: a neutral third line (for example just "Unhidden") when neither list will show it, and the row of a built commander links to its deck, not a 404. No new drawing beyond a text line.
4. **Y4. The For you search held state is new work, not "gains".** `ExcludedMatch`, `classifyMatches`, `findExcludedMatches` and `resolveExcludedReport` exist for Discover only (`discovery-view.tsx`). For you filters its loaded rows on the client (`matchesQuery`, `commanders-view.tsx:90`) and draws `OwnedSearchEmpty`; it has no excluded-match path, and the client cannot know a hidden commander that is not in its payload. Both widths are drawn on For you; **Discover's held state and the aside above a live list are not drawn at all** (the board's frames are For you only), though the README leads with Discover.
5. **Y5. The Hidden row is not "choose-row".** `choose-row.tsx` is bound to `ResultRow` (fill run, price fact, figures, `ChooseResults`), its row press goes to the create page (not the commander page) and its name is a card-details button. The README says Hidden "reuses" it and that the row opens the commander's page. It is a new row in that visual shape. It also needs a slug per hidden oracle id, and only `/commanders/[slug]` exists.
6. **Y6. UndoRow is private.** `UndoRow` in `decklist-row.tsx` (line 1048) is not exported and takes `deckId`/`DeckDetailCard` and `useSpentSlotUndo`. "Reuse" means extracting a presentational shell. Focus: the pressed Hide button is replaced, so focus must move to Undo.
7. **Y7. The glyph's neighbour is `aria-hidden`.** The FitBar wrapper (`commander-row.tsx:507-512`) is `aria-hidden="true"`; the glyph is a real button and must be a sibling of the wrapper, not inside it. The stretched link is `z-[1]`; the file comment says "the row has no other control", which this changes.
8. **Y8. Strip and route plumbing.** `commandersPlaceFromPathname` throws for any path it does not know, inside the `(list)` layout, so `/commanders/hidden` without a fourth case is a 500. `PlaceStrip` supports `count`, but `CommandersPlaceHead` passes none and `loadCommanderCounts` returns `{owned, discover}` (null with no cards): the Hidden count needs a third figure and a rule for a reader with no collection. Help me choose is itself switch-gated (`helpMeChooseEnabled`), so some readers see three tabs, not four. Not drawn, trivially fits.
9. **Y9. Switch.** The designer's READINESS leaves "a switch" to engineering. Repo rules: a new feature switch needs Hugh first, and a reader-resolved switch goes through `requestSwitchEnv(userId)`. The brief already says "behind a new switch off in production once Hugh approves one". Ask Hugh; do not decide.
10. **Y10. About.** Neither README nor READINESS addresses it. Say: no About label unless Hugh picks one at launch (the brief: "Hugh decides at launch"; `docs/agents/design-pipeline.md`). The fourth tab and the row glyph change the Commanders captures About shows, so `pnpm capture:about` is owed for that screen as a cosmetic re-take. No label is invented.
11. **Y11. Copy.** No em dashes in any shipped string (the one in the canvases is the card type line, data). British spellings in handoff prose: README "centre" and "centred" (the code token is `placement="center"`), canvas annotation "behaviour", "centres", "centred". Fix to US English. Strings to `/copy-review`: the DRAFT list in the README plus *Hidden Oct 31* (no year: a list that never expires will cross years), *3 hidden · newest first*, and the sentence that draws the glyph it names (needs an accessible text equivalent). Voice note: Kitchen Table, failure copy honest not cute: the three failure lines comply.
12. **Y12. Tracker.** No row for this handoff in `docs/superpowers/design-pipeline-status.md`.
13. **Y13. Undrawn but covered by the same rule.** Free mode on For you (`?avail=free`, a second ranking shipped as a delta indexed into the canonical list: hiding must act on both); a Hidden page of a Discover-lane (unowned) commander (the page is drawn for an owned one only; how the unowned page differs is not verified); a failed Hide or Unhide on the page; "1 hidden" singular; a long Hidden list. Each follows an existing shape; none needs a drawing. Caches: hide and unhide must call `revalidateUserLists`, and the Discover client cache (`discovery-cache.ts`, not read in depth) must drop a hidden row, or switching sort brings it back.

## Surface x state x viewport

D = drawn, M = missing, C = covered by a drawn sibling or a stated rule. Phone = 390, desktop = 1300.

| Surface | State | Phone | Desktop |
|---|---|---|---|
| For you row | rest | D | D |
| For you row | hover | n/a | D |
| For you row | pressed | D | M (glyph's four states drawn at 2.4x) |
| For you row | keyboard focus | C (stated, 2px ring) | C |
| Discover row | rest | D | D |
| Discover row | pressed | C | C |
| Undo row | For you, one hidden | D | D |
| Undo row | For you, two hidden | D | M |
| Undo row | Discover | D | M |
| Hide refused (toast) | For you | D | D |
| Hide refused | Discover | M | M |
| Undo refused (line under row) | For you | D | M |
| Hidden tab | three hidden | D | D |
| Hidden tab | empty | D | D |
| Hidden tab | one hidden | M | M |
| Hidden tab | long list / 3-tab strip | M | M |
| Unhide | row becomes Undo row, back in For you | D | D |
| Unhide | back in Discover | caption only | caption only |
| Unhide | neither list (built, unscored) | M (Y3) | M |
| Unhide | its return in For you | D | M |
| Unhide refused | toast | D | M |
| Undo of an unhide, refused | | M | M |
| Search, For you | hidden match, held | D | D |
| Search, Discover | hidden match, held | M | M |
| Search, either lane | hidden match above a live list (aside) | M | M |
| Commander page, hidden | owned commander | D | D |
| Commander page, hidden | unowned (Discover) commander | M | M |
| Commander page, not hidden | Hide line | D | D |
| Commander page | Hide / Unhide pressed or refused | M (stated) | M |
| Help me choose | results, hidden excluded | D | D |
| Help me choose | History run with a hidden pick | M (Y1) | M |
| Pairs | two-faced hidden | D | D |
| Pairs | Discover Aang vs Aang and Katara | D | D |
| Pairs | partners, two rows | caption only | caption only |
| Short list | one left | D | M |
| Short list | all hidden (For you) | D | D |
| Short list | all hidden (Discover) | M | M |
| Title line / counts | zero count drops its half | D (caption) | D |
| Public `/commander/[slug]` | unchanged | stated | stated |

## What a green looks like (browser probe, per surface)

- Hide Ghalta on For you at 390 and 1300: the row becomes the Undo row, the Hidden tab reads 3, Undo restores it at rank 1 with no reload; reload and it stays out.
- Search "ghal" on For you and on Discover: the held state names it, **Open its page** opens `/commanders/<slug>` with the Hidden note and Unhide; the slug is the same one the list used before the hide.
- A Help me choose run made before the hide, opened from History: Ghalta is absent, and neither "Not open to you now" nor the "N of M open" note counts it.
- `/commander/<slug>` (public) never shows the note.
- No console error on `/commanders/hidden` for a reader with no collection.

## Not built

- `Placement` options B and C (the R1c record).
- Any ranking, scoring or model change; any expiry; any count on Help me choose.

## Open for Hugh

- The switch (Y9). No Design item is open. Per standing rule, do not send copy to Hugh: Y3 and Y11 go to `/copy-review`.


---

## Design's own note (superseded by the verdict above)


**Verdict: Green from Design.** Hugh approved every board on 2026-10-31 (R1c, option A for the row's glyph). The calls were drawn against `origin/main` @7bf3c89 and the places they touch were checked on `origin/main` @c245288. It needs **one migration**: a per-user hidden-commanders table, keyed on the commander's card (oracle id) and stamped with when it was hidden. Whether it ships behind a switch is engineering's call. Filtering the ranked lists could plausibly regress them, so a switch fits the repo's rule. DRAFT strings go through `/copy-review`. Engineering's own audit may move any item.

## For engineering, by area

Sizes: S under 150 lines, M 150 to 500, L over 500, tests included.

1. **Store and actions (M, lane commanders).** Add the table, plus `hide` / `unhide` server actions. Both are optimistic and idempotent. Hide acts on the card the row draws. A two-faced commander is one card. Partners are two cards. Hidden never applies to the public `/commander/[slug]` page.
2. **Lists leave hidden commanders out (M, lane commanders/discovery).**
   - For you and Discover drop hidden commanders where the pool is read. `src/lib/discovery/candidates.ts` already filters built commanders with `notBuiltBy`, and the hidden filter sits beside it.
   - `loadCommanderCounts` (`src/lib/commanders/counts.ts`) and the count lines leave them out.
   - Search on a list reports a hidden match through the shipped held state (`src/lib/commanders/excluded-report.ts`, `src/components/commanders/excluded-match.tsx`) with a new cause, *you hid it*, and an **Open its page** primary.
3. **Row control (S to M, lane commanders).** In `src/components/commanders/commander-row.tsx`, the glyph shares the `FitBar` wrapper's line.
   - Phone: the bar takes the rest of the line.
   - Desktop: the bar keeps its 520px and legend, and the glyph sits at the row's right edge.
   - The glyph is a 16px eye-slash in `--fg-faint`, with a 44px target and `z-[2]` above the stretched link. Its `aria-label` and `title` are *Hide {name}*.
   - Pressed, the row becomes the deck builder's shipped `UndoRow` (`src/components/decks/decklist-row.tsx`) reading *{name} hidden*. There is no toast or timer.
4. **Hidden tab (M, lane commanders).** Add a fourth tab to the Commanders `PlaceStrip`, `/commanders/hidden`, carrying the shipped `count`.
   - Rows reuse `src/components/intake/choose-row.tsx` with *Hidden {date}* and **Unhide**.
   - The empty state is the shared ZeroState.
   - Unhide turns the row into the Undo row, reading *back in For you* or *back in Discover*.
   - Four tabs fit 390 without compact spacing.
5. **Commander page (S to M, lane commanders).** `src/app/commanders/[slug]/page.tsx`:
   - Hidden: the hero's note shape with **Unhide**, the kicker *Hidden*, and *Not ranked while hidden*.
   - Not hidden: a quiet *Hide from my lists* line, under the hero on the phone and under the build note on desktop.
6. **Help me choose (S, lane commanders).** Candidates exclude hidden commanders before picks and ordering. Nothing is drawn. Past History runs drop the hidden row silently too.
7. **Failures (S).** Hide refused: the row returns, with the shared toast *We couldn't hide {name}. Try again.* Undo refused: the line under the row. Unhide refused: the shared toast. All three strings are DRAFT.

## Not built

- `Placement` board options B and C. They are the R1c record only.
