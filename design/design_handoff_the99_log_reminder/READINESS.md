# Readiness Review — Log-your-game reminder

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-21 (cold read of PR #3129 head `09be04784`, code audited against `origin/main` `cfa0ed8fc`)
**Related ticket(s):** none named in the handoff (PR #3129; README: account 2, R1 approved by Hugh 2026-11-21)
**Plan PR target:** `docs/superpowers/plans/2026-11-21-log-reminder.md` (TBD; must record the eng-side clarifications below and name PR boundaries before implementation)
**Intended home of this file:** `design/design_handoff_the99_log_reminder/READINESS.md`, committed in a doc PR before the plan PR (not committed here).

## Summary

The handoff is buildable as drawn. All 17 boards exist at phone and desktop width (L2, C1, C2, L1, H1 to H3 and N1 each have both), the four locked decisions are honored, and the copy has no em dashes and US spelling. Nothing the handoff leaves out needs a Design round: every open point is settled by a drawn pattern or is an engineering decision. The real work is on the data side, and the README's own "Needs from engineering" list understates it: (1) the table row that anchors the 7-day window is deleted at the pod's next setup, which can wipe a game's fill inside the week; (2) a log is not tied to a specific game, so "several games from one table" cannot say which one a log covers; (3) the existing result table is one-game-per-table by primary key. The plan PR records the decisions below. No new feature switch is needed (see Cross-cutting).

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Boundary is clear: Home card, one push kind, closed-table page states, the tracker's L2 line; locked rules 1 to 4 restated; "nothing auto-logs" explicit. "Needs from engineering" lists four items. Non-goals are implicit only (no About entry, no Settings tick, no feed row, no card image: stated in the push section).
- [🟡] "Show N more" (README H2 section) is stated as not drawn ("four games in a week is the realistic top"). Resolved from the audience rule (Hugh and friends): plan decides a cap of 4 rows with an inline expand, or a hard cap; no Design round.
- [🟡] Result-dialog line `Everyone seated gets a reminder, with Colin’s win filled in.` (README section 5) is explicitly optional and undrawn: copy-review item, not a gap.

### 🎭 State coverage

- [✅] Drawn at both widths, opened as images: H1 one game, H2 three games (one on `Last day`), H3 dismissed toast with Undo (phone), N1 iPhone lock screen and macOS banner, C1 in-window, C2 after the week, L1 logged, L2 device line.
- [🟡] Not drawn but covered by a drawn pattern: a draw card (`A draw`, copy only; heading pattern of H1), dismissing one row of several (card shrinks, same toast; the last row's dismissal removes the card), the row's whole-link plus its own ✕ (needs sibling elements, not a nested link and button: eng), loading and error (per-request read, a failed read draws no card, as `src/app/page.tsx:295-301` does for Tonight's table).
- [🟡] Three or more games from one table in one push: copy is given only for one and two (README push copy). Plan: for n >= 3 use the two-game title (`{n} games at {pod}’s table`) and a body without names (for example `Log all {n}: every seat is filled in.`), through copy-review.
- [🟡] C1 with two games from one table is described, not drawn ("one card each, newest first"). It follows C1's own card.
- [🟡] A result row whose deck was deleted (`startDeckOf` returns null: `src/lib/social/rule-zero-result.ts:82-84`) has no deck for the sentence or the Log link (`logGameHref` needs a deck id: `src/lib/rule-zero/table-view.ts:174-177`). Plan: no card, no push for that player; they use Log it by hand.

### 🔌 Data contract

- [🟡] **Window anchor is deleted early.** The Home card and C1/C2 read the table row (`expires_at + 7 days`), but `setTable` deletes the pod's clock-expired tables at its next setup (`src/lib/social/rule-zero.ts:212`, `expires_at <= now()`), and `rule_zero_result_seats.table_id` cascades (`src/db/schema.ts:4159`). A pod that plays Monday and Wednesday loses Monday's fill and card inside the week, and C2's page (`loadClosedTable`, `rule-zero-table.ts:568` "deleted at its next setup") 404s. Also `purgeAccount` removes tables the leaver set or closed (`rule-zero.ts:716`), taking every seat's result with it. Eng-resolvable: change the cleanup to keep a table until `expires_at + 7 days` (every pod-table lookup already filters `tableOpen`, so a kept row cannot shadow a new table); decide the account-purge case (accept it, it is deliberate).
- [🟡] **A log has no game identity.** "Logged" is `loggedSinceSave`: any `deck_games` row for (user, table) created at or after the result's `saved_at` (`rule-zero-result.ts:131-135`). With several games per table, logging game 1 after game 2 was saved counts as logging both, and the L2 line (`loggedAt` against the device's `endedAt`, `src/components/rule-zero/table-game.tsx:202`) has the same blind spot. Needs a per-game marker on the log (for example the game's `started_at` stored on `deck_games` or a link row), a `game=` parameter on the Log this game URL (today `?tab=games&table=<id>`, `table-view.ts:176`), and the prefill (`logSeatsIn`, `rule-zero-log.ts:~190`) choosing one game. Eng-resolvable, but it belongs in the plan as a decision, not a footnote.
- [🟡] **One game per table by key.** `rule_zero_result_seats` has primary key (table_id, user_id) and unique (table_id, seat) (`schema.ts:4168-4171`); `saveTableResult` deletes the table's results before insert (`rule-zero-result.ts:114`); `started_at` is nullable ("saved before rosters"). README need 1 is right and needs a migration (new key on (table, started_at, user), backfill of null `started_at`), plus `mayReplace` (`:~92`) becoming "same game replaces itself, an older roster still cannot replace a newer game's rows", and `undoTableResult`/`gameLoggedQuery` already key on `gameRows(tableId, startedAt)` (`:150`), so they carry over.
- [🟡] **The 6 am gate has five call sites**, not one: `tableSeatsQuery` (`rule-zero-log.ts:102`) stays; `resultSeatsQuery` (`:142`) moves to `expires_at + 7 days`; `gameLoggerQuery` (`rule-zero-result.ts:220`) and the table roster/save/undo (`:68`, `:102`, `:173`) stay at 6 am; `logGame`'s share-lock path (`resolveTableSeatsIn`) reads through `resultSeatsQuery`. The plan names each. README need 2 says this in one line.
- [🟡] **Push kind is real work but follows the seat push.** `PUSH_OUTBOX_ALL_KINDS` and `push_outbox_kind_check` need a migration (`feed/kinds.ts:47-50`); drop `HOLD_EXEMPT_KINDS` membership (`push/hold.ts:20`, the README is right that this kind keeps the hold); `message.ts` needs a `PushItem` variant, a `collapse` rule that merges per table on release but keeps two tables as two pushes (today seat and spare notices collapse by `kind + key`, everything else by kind: `message.ts` `collapse`), a distinct device `tag` per table (the tag is per kind and a newer one replaces an older), and `flush.ts:138-147` special-cases `SEAT_PUSH_KIND` to skip `stillWanted`. `docs/agents/push.md` "Added by the seat push" is the pattern. STALE_MS is 24 h (`flush.ts:39`): a 10:41 pm game releases at 9:00, inside it. Release-time drops (logged, hidden, undone, left the pod, deck gone) resolve like `unseenSeatNotices`.
- [🟡] **Names in the push body** (`{winner}`, `{pod}`, `{deck}`) are other readers' names: they resolve at flush under the viewer's grant in `src/lib/social/`, as `ThirdPartyName` (AGENTS.md social rules; `check:social-reads`, `check:third-party-names`). The Home card is the same: a new cross-user read in `src/lib/social/` joining the grant on the viewer, `public_id` only on the client.
- [🟡] **Dismissal table** (README need 3): new per-user table; classify it under `scripts/lib/list-cache-tables.mjs` (read per request, so not part of Home's payload), add it to `purgeAccount`, and have the dismiss action avoid revalidating Home's whole page (use `after()`/client state; `reference_server_action_revalidation_cost`). Undo deletes the row; the shared toast's lifetime is the Undo's lifetime.
- [✅] Fields the cards draw all exist: winner, places, tile art (`resultSeatsQuery` carries seat, name, deck, commander art), date and window end (`expires_at`). L1's `You logged this game on {day} at {time}` needs the viewer's own first log time for that game (today `gameLogger` returns only the first logger across seats and only inside the night: `rule-zero-result.ts:197-220`); a small query, eng.

### 🧱 Codebase fit

- [✅] Tokens: boards use the existing theme tokens (`--accent`, `--warning`, `--success`, `--surface-rail`, etc.); no colour or size outside the Low Sun theme was found in the board styles.
- [✅] Reuses `home-table-card.tsx`'s shell (surface-rail, 1px accent border, blurred seat art, 14px radius, one row from `xl`: file lines 40-62), `ACCENT_BUTTON`, the Last game card shell, the shared toast with Undo, `BackLink`/`GhostButton` on the closed page.
- [✅] Home placement fits: Tonight's table renders in `data-home-tables` from `tables` (`src/app/page.tsx:393`, `src/components/home/dashboard.tsx:264`); the reminder goes after it in the same wrapper. Pinned by `dashboard.test.tsx:315-337` (one wrapper, none when empty): the plan updates those assertions.
- [🟡] **C1 needs a code change the README does not name.** Today `TableClosed` draws Log this game only for a host close (`how.kind === "host" && how.logOpen`: `table-closed.tsx:42`); a table that ran out its night (the C1 board's case, "closed at 6 am") has no Log link and no result. The page also needs the viewer's result and logged state, which `ClosedTable` does not carry (`rule-zero-table.ts:544-597`).
- [🟡] L2's README claim that the line follows `loggedSinceSave` is not how it is built: the line already reads the viewer's own `loggedAt` (`rule-zero-table.ts:105`, `table-game.tsx:202`), so L2 is a one-string copy change (`copy/tracker.ts:275`, `notLogged`) unless the per-game marker above is added. Say so in the plan.
- [✅] Copy conventions: no em dashes in README or any board (the only en dashes are in the Main board's `H1–H3` style ranges: not a copy string); US spelling throughout; colons used where a dash would be. The strings go to `copy-review` and live in `src/lib/copy/rule-zero.ts`, `push.ts` and `tracker.ts` per the existing split.

### ♿ Cross-cutting

- [🟡] Accessibility: ✕ is a 44px hit box (stated); row-is-a-link with its own ✕ needs sibling controls and an accessible name per row (`Hide reminder for {pod}, {date}`); the toast is the shared one, so its live-region behavior carries. Focus after a dismiss: move to the next row or card. `Last day` is `--warning` text on the dark surface; it also carries the words, so it is not colour alone.
- [✅] Performance: the card is a per-request read beside the cached payload, the way `loadHomeTables` is. **List cache**: register the new read module in `PER_REQUEST_READS` (`scripts/lib/list-cache-tables.mjs:68`, the `rule-zero-home.ts` entry is the pattern) and call it only outside `cachePageForUser`'s load (the guard checks both); do not add a stamp trigger to the new tables. Logging a game still moves Home's stamp through `deck_games`, which is correct and harmless.
- [✅] **Flags: no new switch.** Rule 0 has no switch (`SOCIAL_FRIENDS_ENABLED` is retired and always on: `rule-zero.ts:72`; `FLAG` registry has none for it, `src/lib/flags/registry.ts:36-53`). The push half is already behind `PUSH_ENABLED` (a registry feature switch, dormant until Hugh turns it on) plus the reader's master push setting, resolved per reader at flush; the Home card rides nothing, like Tonight's table. `AGENTS.md` and the standing rule say a new switch needs Hugh: none is proposed, so there is nothing to ask. If Hugh wants a kill lever on the Home card alone, that is his call to raise, not a gap.
- [✅] Moments: no conflict with M11 (a game logged, no friend: `src/lib/social/after-game.ts`, `docs/agents/moments.md`): the reminder only opens the log form, the same form M11 already follows, and the registry gains no entry. The H3 toast holds moments while it is on screen (`useMomentHold` on every `ToastFrame`), which is the right behavior.
- [🟡] Telemetry: none specified. Names stay out of PostHog through `PersonName`/`ph-no-capture`. If Hugh wants counts (cards shown, pushes tapped), that is a separate ask.
- [✅] Security: the push row holds no words and no account ids beyond the outbox's own; the client payload names seats by number and cards by `public_id`.

### ⏰ Drift from reality

- [✅] Every file the README names exists as named on `origin/main`: `saveTableResult` (`rule-zero-result.ts:98`), `table-closed.tsx` (the 6 am window), `home-table-card.tsx`, `kinds.ts:47`, `HOLD_EXEMPT_KINDS` (`hold.ts:20`), `tableLoggable` (`rule-zero-open.ts`), `loggedSinceSave`.
- [🟡] The handoff is built over the Undo addendum and the life tracker (S4, S6, U5), which are merged; the README's "Undo still ends at 6 am or at the first log" matches `undoTableResult` (`rule-zero-result.ts:165-181`).
- [✅] The PR branch is behind `origin/main` by many commits but touches only `design/design_handoff_the99_log_reminder/`; no conflict with `src/`.

### 📝 Decision log

- [✅] The four locked decisions are listed with the date; the calls (window of a week, hold kept, merge per table, kind name, `item_key` `game:{tableId}:{startedAt}`) are recorded with reasons. Status line says R1 approved. No tentative items are marked; the optional result-dialog line is the only soft item and says so.

## Gaps requiring a Design round-trip (Orange/Red only)

None.

## Eng-side clarifications (Yellow only)

1. **Keep the table until `expires_at + 7 days`.** Change `setTable`'s cleanup (`rule-zero.ts:212`) from `expires_at <= now()` to `expires_at + interval '7 days' <= now()`; the account purge removing a setter's tables (`:716`) stays (a leaver's tables go with them) and is stated in the plan. Pattern: the existing host-close carve-out in `rule-zero-open.ts` header.
2. **Give each log a game.** Store the game's `started_at` with the log (column or link row), pass `game=<startedAt>` on the Log this game URL and in the push landing, and key `loggedSinceSave`, the Home card, C1/L1 and L2's line on the game rather than the table. Pattern: Undo's `gameRows(tableId, startedAt)`.
3. **Migrate the result key** to (table, started_at, user), backfilling null `started_at` from `saved_at`; replace the pre-insert table-wide delete with a same-game replace; keep "an older roster cannot replace a newer game" per game.
4. **Name each 6 am gate** (list in Data contract) and which move to `expires_at + 7 days`.
5. **Push kind**: `rule_zero_log` through a migration and `PUSH_OUTBOX_ALL_KINDS`; not hold-exempt; per-table collapse on release; distinct tag per table; flush drops logged, hidden, undone, left-the-pod and deckless games and resolves names under the viewer's grant. n >= 3 games copy through copy-review.
6. **Closed page**: extend `ClosedTable` with the viewer's results and logged times; draw Log this game for a night-expired table inside its week; C2 and L1 as drawn.
7. **Home read** in `src/lib/social/` (grant on the viewer, `public_id` only), per request, registered in `PER_REQUEST_READS`; dismissal table classified, in `purgeAccount`, written without revalidating Home.
8. **Last day** is the final 24 hours of the window (`underADay` is the repo's precedent: `src/components/home/friends-section.tsx:135`); rows beyond 4 expand in place under `Show N more`.
9. **L2** is one copy string (`tracker.ts:275`) while one game per table; the per-game marker (item 2) covers rematches.
10. **No switch** (see Cross-cutting). PR split to name in the plan: (a) result key + retention + per-game log (backend, no UI), (b) Home card + dismissal, (c) push kind, (d) closed-table states + L2 string; stay under ~20 files / ~800 lines each. UI PRs run `design-review` and `feature-acceptance`.

## Decisions inherited

- Hugh 2026-11-21 (prompt, R1 approved): one push per other seated player with a deck at result save; a Home card for anyone with an unlogged game until log or dismiss; both open that player's own prefilled Log this game; logging stays per player, nothing auto-logs.
- Window: 6 am seven days after the table's night; Tonight's table, the tracker and Undo stay at 6 am.
- Push: kind `rule_zero_log`, not a feed kind, no Settings tick, master switch alone, keeps the 21:00 to 09:00 hold, one push per table per release, icon only, one game lands on the form and several land on Home.
- Dismiss hides one game's reminder for that player only, drops a waiting push, Undo restores it.
- No rounds or length on server-drawn cards (those live only on the device that ran the game).
- Repo rules the plan must respect: US English and no em dashes (copy-review), `PersonName`/`ThirdPartyName` for other readers, cross-user reads in `src/lib/social/`, qualified correlated subqueries, no tests run locally (CI only), no stacked PRs.

## Frames

Opened as rendered images (blob ids remapped to `art/`, Chromium at 390 and 1300 wide): H1 Phone, H1 Desktop, H2 Phone, H2 Desktop, H3 Phone, N1 Phone, N1 Desktop, C1 Phone, C2 Phone, L1 Phone, L2 Phone.
Checked by name, text and markup only (not opened): Main, C1 Desktop, C2 Desktop, H3 Desktop, L1 Desktop, L2 Desktop.
