# Readiness: small items 9

**Verdict: Green from Design.** Hugh approved every board on 2026-11-01 (R1, with item 7). One migration (item 7), no new switch. The DRAFT strings go through `/copy-review` before they ship. Engineering's own audit may move any item; where an item changes shipped behaviour, the file it touches is named. Checked against `origin/main` @f0199bc.

## For engineering, by item

Sizes: S under 150 lines, M 150 to 500, L over 500, tests included.

1. **Game history, no match (S, lane game history).** The same frames as game history addendum A1 (Z1 to Z3): build them there. No new string beyond A1's.
2. **Report a problem (S, lane flyer/feedback).** `/report`: when signed in, draw inside the app shell and drop `CrashWordmark` and the newcomer frame. Signed out keeps the Fan Content notice. Add `reportCopy.anonRetention` (DRAFT) between the attachment line and Send, signed out only. `global-error.tsx` is unchanged.
3. **Launch list CSV fails (S, lane flyer admin).** `flyer-launch-csv.tsx`: on a refused, switched-off or lost reply, show the admin's inline `role="alert"` line under the launch card's top row (three DRAFT lines; lost adds Try again). The busy hold stays as shipped.
4. **Kill a feature flag (M, lane flags plan).** Rides the flags plan's PRs: the rename to Feature flags, `killed` as the fourth App-wide value (`override-controls.tsx` `APP_OPTIONS`), the confirm (`model-confirm.tsx` shape, danger action, always), the list's KILLED tag and Resolved *killed*, the page's banner and Killed rung, overrides refused. Lifting saves at once.
5. **Rule 0 defaults (S, lane Rule 0).** The seat push builder splits past 40 characters (title `{host} seated you`, pod and deck in the body; host alone past 40 cuts with an ellipsis). Close confirm: *Closing…* and 60% hold while in flight. First-run Home at 1300: the table card above the About line and checklist. No-table Home: no change.
6. **Add a card (S to M, lane collection/deck).** (a) One ring timing: 2s hold, 400ms ease-out fade, reduced motion skips the fade. (b) `edit-copies-sheet.tsx`: no Remove unless a copy is owned. (c) Desktop: after a save from card details, reopen the card modal on the same card. (d) On a deck page, the save toast joins the deck toast stack above the dock.
7. **Delete a group (M, lane admin).** `group-page.tsx` foot: Delete this group (danger text press), its refused line and *Flyer codes ›*; the shared confirm; a `deleteGroup` action that deletes only when the group has no members and no live flyer codes, checked in the delete's own statement; lands on `/admin/groups` with the shared toast. Migration: add `group_deleted` to `admin_events_kind_check`. Members and overrides cascade; flyer codes `set null` (schema as shipped).

## Errata

B1 to B3 record what shipped; no code change. Each is noted in its own handoff: `design_handoff_the99_game_history`, `design_handoff_the99_add_card_anywhere`, `design_handoff_the99_rule_zero_revisions`.

## Engineering audit (2026-11-01, against `origin/main` @f0199bc, re-checked @6aa40b8)

**Verdict: Green.** No Orange items. Every prompt item is answered and drawn at 390 and 1300 where the prompt asked for both. One migration (item 7, `admin_events` checks). No new switch. Two items wait on other lines' PRs (item 1 on game history PR 4, item 4 on flags-in-DB PRs 1 and 2); that is sequencing, not a design gap. The two commits on main after @f0199bc (#2586, #2587) touch `report/page.tsx` comments and card details only; no claim below moves.

Prompt items, as sent (Notes for Design, 2026-10-31 and 2026-11-01, plus Hugh's group-delete addendum): A1 game history no match, A2 /report shell and the 90-day line, A3 launch-list CSV failure, A4 kill a flag, A5 Rule 0 defaults, A6 add-a-card undrawn defaults, A7 delete a group (addendum); B1 to B3 the game history, add-a-card and Rule 0 shared-component errata.

### Per item

| Item | Answered by | Specimens | Verdict |
|---|---|---|---|
| A1 No games match | `Games-NoMatch` Z1 (390), Z2 (1300), Z3 (390 sheet) | 390 + 1300 | Green, waits on game history PR 4 |
| A2 /report | `Report` A0 to A2 signed in, B1/B2 signed out | 390 + 1300 each | Green |
| A3 CSV fails | `CSV-Failed` F1 to F4 (1300), F5 to F7 (390) | all three failures at both widths | Green |
| A4 Kill a flag | `Flags-Kill` K1 to K7 | list, page, confirm at both widths | Green, build owner flags-in-DB |
| A5 Rule 0 defaults | `Rule0` N1 to N5, C6/C7, H12/H13 | 390 + 1300 (Home asked at 1300 only) | Green |
| A6 Add a card | `Add-Card` R1 to R5, E1 to E3, M1, T1 to T3 | 390 + 1300 (M1 is desktop-only behaviour) | Green; (c) and (d) are already built |
| A7 Delete a group | `Groups-Delete` D1 to D8 | 390 + 1300; see gaps | Green with two undrawn edges |
| B1 to B3 Errata | `Errata` board + three handoff READMEs | n/a | Green; one B1 bullet is not yet built |

**A1. Game history, no match.** Confirmed: the Games view on main is filter-free (`src/components/decks/games-view.tsx:3`, `:6`: "The filters (Played against, Result, deck) are PR 4's"), so there is no Sheet, no chips and no *Show N games* to land here yet. Build the no-match frame inside game history PR 4, from this board's Z1 to Z3. The README cites "game history addendum A1 on design-assets (c7abb39)"; that addendum exists only on `origin/design-assets`, not in a merged handoff, so PR 4 cites `small_items_9/Games-NoMatch` as its source of truth. *No games match* / *Clear filters*: the shipped Decks filter empty uses `No decks match` (`src/lib/copy/refresh.ts:325`) and Set Collections `Clear filters` (`src/lib/copy/set-collections.ts:491`); `No games match` is a new string (DRAFT, to `/copy-review`), not reuse.

**A2. Report a problem.** Every claim checks out:
- `/report` draws `REPORT_MAIN` + `CrashWordmark` for every reader today (`src/app/report/page.tsx:37-38`; `REPORT_MAIN` at `src/components/join/newcomer-column.tsx:16`). Signed in, the shell already draws its own `<main>`, so the page nests one; the build drops both when `userId` is set.
- The 520 column and `‹ Back home` are shipped (`src/components/feedback/report-page.tsx:13`, `:32`).
- `ANON_REPORT_RETENTION_DAYS = 90` (`src/lib/feedback/purge.ts:15`), swept hourly by `invite-sweep` (`src/app/api/cron/invite-sweep/route.ts`). The line is true in production; on staging the cron is paused (`purge.ts:8`), which does not affect the copy.
- The attachment line is `reportCopy.attach` (`src/lib/copy/report.ts:17`); `anonRetention` is new (DRAFT).
- Fan Content notice: the shell carries it (`src/components/shell/fan-content-notice.tsx`, mounted in `shell.tsx`); signed out it already draws under /report.
- `global-error.tsx` unchanged: confirmed, it imports `CrashWordmark` itself (`src/app/global-error.tsx:8`, `:34`).

**A3. Launch list CSV fails.** `src/components/admin/flyer-launch-csv.tsx:24-28` drops every failure silently, as the README says. The action returns `{ ok:false, error:"off" }` and `{ ok:false, error:"failed" }` (`src/app/admin/invites/flyer-actions.ts:122-133`); a thrown call (network, or `requireAdmin` → `notFound`, `src/lib/admin/access.ts:38`) lands in the `catch`. Map them: `failed` → *refused* line (no retry), `off` → *switched off* line, `catch` → *lost* + **Try again**. Precedent for the `role="alert"` danger line: `flyer-launch-date.tsx:98`. Copy note for `/copy-review`: the `failed` branch is a server error building the file, not a refusal, so *The server refused the download* slightly misstates it; copy-review decides.

**A4. Kill a flag (build owner: flags-in-DB).**
- Plan: `docs/superpowers/plans/2026-10-31-feature-flags-in-db.md` PR 3 ("The app row's existing value control gains a third option, plus a row marker in the list", line 152-156) waits on this handoff; this board is it. PR 3 also needs PR 1 (the `killed` value and its CHECK, plan lines 120-126) merged first. Neither PR 1 nor PR 2 is open yet.
- Rename: `adminCopy` title, tab, back link and the `Flag` column head are done in PR #2590, merged 2026-11-01 (`src/lib/copy/admin.ts`). The env column's removal belongs to plan PR 2; until PR 2 the page still has an env column and an env kill.
- `APP_OPTIONS` is On / Off / Not set today (`src/components/admin/override-controls.tsx:182-186`); Killed is a fourth key. `OverrideValue` and the write path (`useOverrideWrite`, the override action) must accept `killed`, app scope only.
- The page already has a kill banner, a refused-overrides treatment and a killed env rung, all keyed to the ENV kill (`src/lib/admin/switch-page-rule.ts:118`, `:141`, `:166`, `:180`; `resolve.ts:67` source `kill`). PR 3 retargets them to the app row's `killed` (and, between PR 1 and PR 2, either kill). The board's "re-worded" banner and "first Killed rung" replace `copy.kill` and the `env` rung (`admin.ts:581`, `:611`).
- The confirm: `ModelConfirm` (`src/components/admin/model-confirm.tsx`) is shaped for a model-cost preview (`ConfirmPreview.costs`, `:19-25`) and its confirm button is `--fg` fill (`:127`). The kill confirm (danger action, Who/Overrides/When facts) needs either a generalised confirm frame extracted from it or a `danger` variant. Same need in A7, so build the shared frame once (see split).
- Data: the Who fact (*All 212 accounts, the 13 held on by Founders, two account overrides and All features too*) needs counts the switch page rule already derives (`switch-page-rule.ts` rung counts); no new table.
- Undrawn, built as stated in prose: lifting (On, Off or Not set saves at once; no frame), and a failed kill write (use the shipped override-write failure, `w.failure`).

**A5. Rule 0 defaults.**
- Seat push: title `{host} seated you at {pod}'s table` and body `You're seated with {deck}.` / `Pick your deck at the table.` (`src/lib/copy/push.ts:35-38`), built at `src/lib/push/message.ts:104-106`. **Errata to the shipped comment, not the handoff:** `push.ts:34` says the push layer "clips it at payloadFor"; the actual clip is 120 characters (`src/lib/push/send.ts:27`), not 40. The 40 split and the ellipsis cut on a lone long host are new logic in `message.ts`/`push.ts`, with tests. New body strings (*At {pod}'s table, with {deck}.*, *At {pod}'s table. Pick your deck there.*) are DRAFT.
- Seat notice in the app: names already wrap (`NAME_CLASS`, `src/components/rule-zero/seat-notice-host.tsx:39`, no truncation); the only change is top-alignment (`items-center` → start at `:164`, and Open/✕).
- Closing: `close-table.tsx` already holds both buttons at 60% via `aria-disabled` while busy (`:133-155`); add the *Closing…* label and hold ✕. DRAFT string.
- Home: first run already places tables before the About line (`src/components/home/first-run.tsx:161` vs `:197`); check the 1300 row against H13 in the PR. No-table Home: no change.

**A6. Add a card.**
- (a) Ring: `OWNED_RING_MS = 2_000`, no fade, "reduced motion draws it the same" (`src/components/decks/use-owned-ring.ts:13`); game landing has its own 2s ring (`game-history-row.tsx:27`). Build one shared timing (2s hold + 400ms ease-out fade, reduced motion cuts) used by both. The "search row" ring in the README is the `--success` count after a save (`card-search/search-row.tsx:72`), not a timed ring; confirm in the PR which element fades.
- (b) Remove: today rendered and disabled when unowned (`src/components/collection/edit-copies-sheet.tsx:411`, `owned` at `:128`). Change to not rendered.
- (c) Desktop reopen after save: **already built** (`edit-copies-host.tsx:30`, `:57`, `:68` reopen the card's details on Save/Cancel). Confirm-only; no PR.
- (d) Deck-page toasts: **already built** (`edit-toast.tsx:17`, `:107` route into `deck-toast-stack.tsx`, whose floor is 10px above the dock, `:4-7`, `:28`). Confirm-only.
- Design's READINESS lists (c) and (d) as build steps; they are not.

**A7. Delete a group.**
- Surfaces exist: `group-page.tsx` (69 lines, History at `:61-64`), `group-editor.tsx`, `groups-list.tsx`. Actions file `src/app/admin/groups/actions.ts` has `createGroup`/`saveGroup` only; `deleteGroup` is new.
- Schema claims confirmed: members cascade (`src/db/schema.ts:2823`), overrides cascade (`:2844`), flyer codes `set null` (`:4258`), `admin_events.group_id` has no FK (`:2734-2744`). The flyer list already draws a code with no group (`flyer-codes.tsx:51`).
- Precedent for the atomic emptiness check: `discardEmptyGroup` (`src/lib/flyer/admin.ts:58-66`) deletes under `lockSwitchWrites` with `not exists` members and codes in the same statement. `deleteGroup` follows it, with the codes clause narrowed to live codes (`revoked_at is null`) per the approved recommendation, and writes the `group_deleted` event in the same transaction.
- **Migration is wider than the README says:** `group_deleted` must be added to `admin_events_kind_check` (`schema.ts:2754`) AND given a branch in `admin_events_fields_check` (`:2765-2786`; e.g. `group_id is not null and old_value is not null`, the name). A kind with no branch passes the CASE as NULL, so a missing branch would silently accept any shape.
- **Errata, confirm's History fact:** *Kept in the admin log, under the group's name* is not true today. History renders a group by looking up the live `flag_groups` row and falls back to the id's first 8 characters (`src/lib/admin/switch-page-rule.ts:122`; also `account-page.ts:104`, `:212`). The build stores the name on `group_deleted` (`old_value`) and resolves deleted groups' names from it.
- Data: `GroupPage` (`src/lib/admin/groups.ts:105-114`) carries members and overrides but not the group's flyer codes; the page needs a new read of its codes (code, revoked) for the refused line and the Flyer codes fact.
- *Flyer codes ›* links to the flyer section on Invites; there is no anchor id on that section today. Add one.
- The confirm reuses the shared frame from A4 (no note field: `ModelConfirm` already has `noted={false}`, `:41`).
- Wording fork: the board's code line says *even revoked* (any code blocks); the README's approved recommendation says only **live** codes block and replaces the line. Build the README line. If Hugh meant any code, it is one condition.
- **Undrawn, eng defaults:** (1) the race refusal *{group} isn't empty now. Nothing was deleted.* is a string only, no frame: draw it in the confirm's body slot, as the setting dialog's error line does (`setting-dialog.tsx:95`). (2) A lost or failed delete is undrawn: same slot, the shared admin failure line. (3) D6b/D6c (members only, code only) are drawn at 390 only; 1300 follows D6. None needs a Design round.

**B. Errata.** All confirmed in code except one bullet:
- B1: `ToastFrame` (`games-failed-toast.tsx:10`, `:24`); `DeckSelect` 16px below `md` (`decks/lineup/deck-select.tsx:31-32`). **"Filters use the shared Sheet" is not built**: the filters are game history PR 4's (`games-view.tsx:6`). Record it as a rule for PR 4, not a confirmation.
- B2: toast centred, Undo underlined, `underline-offset-2`, 44px (`edit-toast.tsx:263`).
- B3: `ModalChrome` + `Sheet` (`close-table.tsx:13-14`, `change-deck.tsx:16-20`), `SheetLoading` (`change-deck.tsx:20`), shared `MarkKey` with `CARD_FACT_MARK_PX = 16` (`read-card.tsx:71`, `cards/card-fact-mark.tsx:72`).

### Copy

- No em-dash in any drawn or README string. The one em-dash on a board is a card's type line (`Legendary Creature — Elder Dinosaur`, `Add-Card.dc.html`), card data, not copy.
- US English: shipped strings are clean. The README and board annotations say "centred" (README item 2, Errata board); annotation only, not shipped copy. Fix it when the handoff is next touched.
- Every new string is drawn verbatim and marked DRAFT: A1 `No games match`; A2 `anonRetention`; A3 three lines; A4 confirm title, lead, Overrides fact, banner body, `Kill for everyone`; A5 two push bodies, *Closing…*; A7 hint, three refusal lines (README version for the code line), confirm title/lead/facts, `Keep it` / `Delete the group`, toast, race line. All go through `/copy-review` before merge.

### About entry

The handoff does not address it. Eng ruling: no About entry changes. A4 and A7 are admin-only; A1, A2, A5, A6 settle states and defaults on surfaces whose entries already exist (`about-entries.ts:1478` Rule 0; the Report a problem row). The 90-day line is a form note, not an About fact.

### Not in this handoff

- The 2026-11-01 (9b) note that the Buying credits handoff draws *60 credits a month* while the plan is 50 (`design/design_handoff_the99_buying_credits/R1 - Plan-and-Cancel.dc.html`, `R1 - Billing-Page.dc.html`, `R2b - Picks.dc.html`) is not answered here. Carry it to the next prompt.
- The 2026-10-31 Rule 0 expired-body errata is already resolved in `design_handoff_the99_rule_zero/README.md:150` ("the morning after").
