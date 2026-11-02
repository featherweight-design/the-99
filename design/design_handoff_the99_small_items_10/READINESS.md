# Readiness: small items 10

**Verdict: Green.** Hugh approved every board and the four open calls on 2026-11-02 (R1). No migration, no new switch, no new player-facing copy. Item 1 needs no build. Items 2 to 5 are small edits to shipped components, named below. One new admin-only string (item 5, F3) goes through `/copy-review`. Checked against `origin/main` @44719d0, the commit this handoff branch sits on.

## For engineering, by item

Sizes: S under 150 lines, M 150 to 500, L over 500, tests included.

1. **Buying credits, 50 a month: no build.** The count already comes from `PLANS.monthly.units` (50).
2. **Toasts, one rule (S, one PR).** Four named files, plus one press the README missed (see the audit): the outlined *Try again* becomes the text press, the missing underlines and weights are added, and /credits moves to the `center` slot.
3. **Hide a commander (S to M, one PR).** (a) One color in `HeroRankClause`. (b) Owned matches leave `findExcludedMatches`' `hidden` cause, so Discover shows its normal no-match. (c) For you asks `findOwnedExcludedMatches` on every settled query and draws `ExcludedMatchAside` above its rows.
4. **Game history filters (S, one PR).** Two redraws in `games-filter-controls.tsx`: no box on unchosen Played against rows, and the sheet's Clear all reads inert. The other two defaults are already built.
5. **Delete a group, trial off (S, one PR).** A code counts as live only while the flyer trial is on. That test goes in `deleteState` and in the delete's own statement, with the F3 confirm fact (DRAFT, admin-only).
6. **Errata: nothing to build.** E1 is done in this PR. E4 and E5 are doc edits still to make (see below).

## Engineering audit (2026-11-02, against `origin/main` @44719d0)

**Verdict: Green.** No Orange items. Every claim below was read in the code; two are wider than the README says (item 2 has a fifth press, item 5's switch test needs a per-code reading), and both are eng decisions, not Design gaps.

| Item | Board | Specimens | Verdict |
|---|---|---|---|
| 1 Plan at 50 | `Plan` K1 to K6 | 390 + desktop | Green, no build |
| 2 Toasts | `Toasts` | 390 + 1300 | Green; one more file than named |
| 3 Hide | `Hide` (a) to (c) | 390 + 1300 | Green |
| 4 Game history filters | `Games-Filters` | 390 + 1300 | Green; (b) and (c) already built |
| 5 Delete a group, trial off | `Groups-FlyerOff` F1 to F3 | F1 at 390, F2/F3 at 1300 | Green |
| 6 Errata | `Errata` | n/a | Green; E4/E5 not yet applied |

**1. Buying credits.** Confirmed: `PLANS.monthly.units = 50` (`src/lib/payments/packs.ts:64`). The card title is `plan.title(units)` (`src/lib/copy/credits-page.ts:128`, drawn at `src/components/credits/plan-card.tsx:187`). The crown is `OfferArt count={offer.units}` (`plan-card.tsx:198`). The return band is `plan.added(units)` (`credits-page.ts:171`; the README calls it `addedPlan`, but no key has that name). Purchase history draws each month's lot from the ledger's own units. The shipped spellings match the board: `Canceling keeps your…` (`:141`) and `Plan canceled.` (`:151`). The About credits entry already reads *50 credits a month* (`src/lib/copy/about-entries.ts:1806`). Nothing to build.

**2. Toasts.**
- Frame and slot confirmed. `ToastFrame` lives in `src/components/collection/edit-toast.tsx:122`. The center slot is `fixed`, `left-1/2`, `w-[calc(100%-32px)] max-w-[420px]`, radius 10, `--elevated` on a 1px `--border-strong` edge, `bottom` tab bar + 16px, `md:bottom-[24px]` (`:168`). It is centered on the window, not on the column. `TOAST_MS = 8000` is held on hover and focus (`:29`, `useToastClock` `:84`). The ✕-only toast is `deleted-group-toast.tsx:49-57`: 44px, `--fg-faint`.
- The deck and cart stacks keep their slots (`placement="deck"` / `"cart"`, `:176-202`), as the README says.
- **/credits:** `CREDITS_SLOT` is bottom left at 440 from `md` (`edit-toast.tsx:115-117`). `credits-toast.tsx:18` passes `placement="credits"`. Change it to `center`. `CREDITS_SLOT` then has no caller, so delete it and the `"credits"` member of `placement`. Its alert branch (`:20`) already uses the default `center`.
- **`hide-commander.tsx:149`:** a 36px outlined button in `--fg`. Replace it with the text press: `min-h-[44px] px-[12px] text-[13.5px] font-semibold text-[color:var(--accent-text)] underline underline-offset-2`, the class `quick-add-failed-toast.tsx:47` and `games-failed-toast.tsx:34` already use. Drop `TOUCH_HIT`; the 44px height covers it.
- **`social-toast.tsx:79`:** already 600, 13.5px and 44px. Add `underline underline-offset-2`.
- **`admin/show-button.tsx:74`:** today it is `font-medium`, 13px, and `md:h-[36px]`. It needs 600, the underline, **13.5px, and 44px at every width**. The README names only the weight and the underline. Use the shared class above.
- **Not named in the README, eng adds it:** `decks/precons/precon-pick-view.tsx:436`, the precon pick's *Try again*, is `h-[36px]` and 13px. Give it the same class. Its `lift` over the pick foot is the center slot lifted, not a third slot, so it stays.
- **Not in scope, carried to the next Design prompt:** `decks/got-it-receipt.tsx` (`:399-480`, the collection receipt in the deck and cart stacks) has two presses: *History* (a link, not underlined, 400 weight) and *Undo* (600, not underlined). The rule says one press, so it does not fit. A receipt is its own shipped pattern, though, and this handoff does not draw it. Leave it as it shipped.

**3. Hide a commander.**
- (a) `HeroRankClause` draws *Not ranked while hidden* in `--fg-locked` (`src/components/commanders/hide-commander.tsx:190`). *Rank #N* is mono 13 in `--fg-faint` (`:205`). The hero's ground is `--surface-rail` (`src/components/commanders/detail.tsx:86`). Contrast was recomputed from `src/app/globals.css`. `--fg-faint` on `--surface-rail` is 5.33 Amonkhet, 5.28 Kamigawa, 5.60 Ixalan, 5.14 Phyrexia, 5.48 Eldraine and 5.93 Kaldheim. `--fg-locked` is 3.14 to 3.35. The board's 5.1 to 5.9 and 3.1 to 3.4 hold. The change is one token at `:190`.
- (b) `findExcludedMatches` (`src/app/commanders/actions.ts:53`) matches every indexed commander (`loadNameMatches`, `src/lib/discovery/candidates.ts:199`). It marks any hidden id `hidden` (`src/lib/discovery/excluded-match.ts:50`), owned or not, so today Discover says *Ghalta, Primal Hunger is here. You hid it* for an owned hide (pinned at `discovery-view.test.tsx:952`). Build it this way: in the action, drop owned hidden matches from the result entirely. Do not just remove them from `hiddenOracleIds`. Under the `new` sort, a row that is not hidden falls through to the floor tiers, and *below the floor* would be false for a commander Discover never lists. "Owned" must be the same test `loadOwnedHiddenNameMatches` uses (`src/lib/commanders/hidden-matches.ts:29`: in the collection, commander-legal, unbuilt), so the two lists split the hides with no overlap. Built still wins first, as shipped. `DiscoveryEmpty`'s *No commander by that name* + *Search your commanders* is shipped (`src/lib/copy/lanes.ts:215`, `:275`). Update the Discover test.
- (c) Confirmed: For you asks only when nothing on the list matches (`namesNothingHeld`, `src/components/commanders/commanders-view.tsx:608-621`). It never draws `ExcludedMatchAside`. Build it this way: ask on every settled query of 2 or more characters while `mayHoldHidden`. Pass `listHasRows: filtered.length > 0` to `resolveExcludedReport`, and mount `ExcludedMatchAside` above the rows when there is a report. `hiddenAlso` / `hiddenMore` / `hiddenCtaNamed` are shipped (`src/lib/copy/commanders-plane.ts:182-187`, chosen at `src/lib/commanders/excluded-report.ts:115-119`). `hiddenPending` keeps its no-rows condition: the rows draw while the answer is in flight, and the aside joins when it lands. No new copy.

**4. Game history filters.**
- (a) Played against already takes one value (`playedAgainstOf`). The redraw: `AgainstList` draws an 18px `--border-strong` box on every unchosen row (`src/components/decks/games-filter-controls.tsx:230-235`). Draw the box only when `on`. Keep `aria-pressed`. One change, both widths (the list serves the sheet and the wide panel).
- (b) **Already built:** Most played is hidden under a deck filter (`src/components/decks/games-view.tsx:283`, `!f.deckId`). The facts line leads with the deck's name when one deck holds every game (`:261`), which is always true under a deck filter.
- (c) **Already built:** the low-games line shows only when `isEmptyGamesFilter(f)` (`games-view.tsx:289`).
- (d) The sheet's Clear all is `GhostButton disabled={none}` (`games-filter-controls.tsx:353-359`). `GHOST` pairs every `disabled:hover` with the enabled colors (`src/components/ui/button.tsx:42-45`), so it draws the same either way, as the README says. Add a local class on this button only: `disabled:[color:var(--fg-locked)] disabled:[border-color:var(--border)]`, with the matching `disabled:hover:` pair. `GhostButton` itself does not change.

**5. Delete a group, trial off.**
- Confirmed: `deleteState(members, codes)` treats `!revoked` as live (`src/lib/admin/groups-rule.ts:442-448`). The delete's statement has `c.revoked_at is null` (`src/lib/admin/group-writes.ts:236`). Codes `set null` on the group's delete (`src/db/schema.ts:4274`). Invites hides the Flyer codes section when the switch is off (`src/app/admin/invites/page.tsx:21`).
- **Whose switch.** `flyerTrialEnabled` takes an env. Whether a code takes sign-ups is decided by its **creator's** reading (`resolveSwitchEnv(row.createdBy)`, `src/lib/flyer/join-read.ts:31`, `src/app/join/flyer-actions.ts:24`). It is not the admin viewing the group. Eng ruling: a code is live when `!revoked && flyerTrialEnabled(creator's env)`. The page's code read (code, revoked, created_by) resolves each distinct creator once and passes `GroupCode` an `ended` flag. `deleteState` and `deleteConfirm` then read `live = !revoked && !ended`. The action resolves the same before the transaction and passes the ended code ids to `deleteEmptyGroupSql`. Its codes clause becomes `c.revoked_at is null and c.id <> all(${endedIds})`, so the statement still refuses a code that is live. Pin it with the existing `.toSQL()`-style test (`group-writes.test.ts:253`). Today every code's creator is Hugh, and the switch resolves app-wide, so the result matches the reader's reading. The per-creator form keeps it true if that ever changes.
- F1 and F2 need no new string: `deleteLine` already gives the hint for `open` and the members-only refusal for `members` without `codesLink` (`groups-rule.ts:451-463`).
- F3: `deleteConfirm`'s Flyer codes fact lists revoked codes only (`groups-rule.ts:468`, `codesRevoked` at `src/lib/copy/admin.ts:386`). Add the ended codes with the board's line, *{CODE}, ended with the flyer trial. It loses its group, so if the trial comes back on, people who join with it land in no group.* It is new and admin-only, DRAFT. The board draws one code only, so eng drafts the plural (*{A} and {B}, ended with the flyer trial. They lose their group…*) and the mixed case: revoked and ended codes each get their own sentence in the one fact. Both go to `/copy-review`.
- Files: `src/lib/admin/groups-rule.ts`, `src/lib/admin/group-writes.ts`, the group page's code read (`src/lib/admin/groups.ts`), `src/app/admin/groups/actions.ts`, `src/components/admin/group-delete.tsx` (props only), `src/lib/copy/admin.ts`, and their tests.

**6. Errata.**
- E1: done in this PR. No *centred* / *centre* remains in `small_items_9` outside READINESS's note that records the fix.
- E2, E3: record only, no code.
- **E4, E5 are not yet applied.** The README says the hide commander README's §4 (`design/design_handoff_the99_hide_commander/README.md:51`) takes items 3a to 3c "once settled". The game history README's §3 (`design/design_handoff_the99_game_history/README.md`) takes the four defaults and the Played against mark. Both are settled now and neither file changes in this PR. The item 3 and item 4 build PRs each add their own paragraph, as they land.

### Copy

- No em dash in any drawn or README string. The two on `Hide` are Ghalta's type line (`Legendary Creature — Elder Dinosaur`), which is card data.
- US English: every drawn string is clean. *Centred* / *centre* appear only where E1 quotes the fix. `Plan` carries one *grey* in an annotation lifted from the buying credits board (*not a grey link*). It is a note, not copy, and it should read *gray* the next time the board is regenerated.
- New strings: item 5's F3 fact (admin-only, DRAFT), plus eng's plural and mixed forms. Nothing else is new: items 2 to 4 reuse shipped strings, as the README says.

### About entry

None. The About credits entry already says 50 a month (`about-entries.ts:1806`). Items 2 to 4 settle looks and states on surfaces whose About labels already exist. Item 5 is admin-only. Under the pipeline rule, a label is Hugh's call per launch, and nothing here is a launch.

### Split

Four PRs, one per item: 2 (toasts), 3 (hide), 4 (game history filters), 5 (group delete). Each is well under 20 files and 800 lines. Item 3 is the only one with a server change on a player surface: an extra request per settled For you query, the same cost Discover already pays.

### Carried to the next Design prompt

- `got-it-receipt.tsx`'s two presses (History + Undo, neither underlined) against item 2's one-press rule: does a receipt follow the rule or stay its own pattern?
