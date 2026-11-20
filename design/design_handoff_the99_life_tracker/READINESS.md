# Readiness Review — Life tracker

**Verdict:** 🟡 Yellow
**Audited:** 2026-11-20 (cold audit, lane a6, rebased on origin/main e47c3e709)
**Related ticket(s):** PR #3001 (this handoff)
**Plan PR target:** TBD

## Summary

Buildable on this codebase: a client-side surface over the shipped Rule 0 table (`/friends/table/[id]`,
`src/components/rule-zero/`), whose table view already carries seats, decks, commander and partner art and
`setByYou`. Play, sheets, layouts and motion are drawn thoroughly. Two things need product calls before the plan
(below, under Flags): the result screen's promise that **everyone seated** finds the winner filled in cannot be met
without a server write (a migration), and a feature switch would be new (and itself needs a migration). The rest are
eng-side clarifications the drawn patterns settle: the route, desktop/tablet framing of setup and result, the
7–8-seat disabled Start, a waiting seat, offline behaviour, and two icon sources.

## Per-dimension findings

### 🗺️ Scope clarity

- [✅] Boundary and non-goals stated ("each opponent loses N", custom counters, multi-device sync out). Seat cap 6 stated.
- [🟡] No route is named. The handoff says "full-screen surface"; Design's read speaks of "the tracker route". The plan
  names it as NEW (e.g. a child of `/friends/table/[id]`), or builds it as an overlay on that page.

### 🎭 State coverage

- [✅] Play states drawn: first turn, life delta, counters, damage, tax, mana, table/history, out (flip), monarch and
  initiative, badges, partners incl. a 6-seat all-partner stress test, tablet at 4/5/6, layouts L1–L5, interactive P1.
- [🟡] Setup (F01–F02c) and Result (F11) are drawn at 390px only; play and sheets are drawn at phone and tablet (1180).
  The device runs the game on a tablet too, so setup and result there follow the shipped `setup-sheet.tsx` desktop
  presentation (setup) and a centred column of the F11 phone layout (result). F01's Start sits on the desktop table
  beside `Log this game` in the right-hand read column, per `table-body.tsx`'s R2 layout.
- [🟡] Not drawn: Start disabled at 7–8 seated (Design's read gives the reason line), a seat still waiting for its deck
  (`deckName`/art null), resuming a saved game after reload, the table closing or reseating mid-game. Plan decides from
  the drawn patterns: disabled Start = the shipped disabled button with a reason line; a waiting seat blocks Start (or
  draws the grey "out" art); seats are snapshotted at Start, and a saved game resumes on the table page.
- [✅] Signed-out is not reachable (the table route is behind auth); loading is the table page's own.

### 🔌 Data contract

- [🟠→flag] F11 copy and README: "Everyone seated finds Colin's win filled in when they log." The game log is per
  player (`deck_games` + `deck_game_opponents.won`), and nothing ties a logged game or a result to a table
  (`rule_zero_tables` has no result column; `TablePrefill` reads seats only). With game state on the device only,
  other seated players' log forms cannot see the result. Meeting the line needs a server write of the table's result
  (a migration, e.g. a winner/placements record on the table, read in `rule-zero-log.ts`'s prefill under the same
  grant). Without it, only the device owner's own log is prefilled and the line must change. Product call, not a
  Design gap: the screen is drawn either way.
- [🟡] Placements map onto the shipped log as: the viewer's `result` (win if 1st, else loss) and `won` on the winning
  seat (`opponentsFor`). 2nd/3rd/4th are display-only; `deck_games` stores no placement. Draws: not drawn; follow the
  log's existing `draw`.
- [🟡] Handing result and winner from the tracker to the Games tab needs a prefill channel (the shipped `Log this game`
  is a plain link). The plan picks query params or client state, carrying seat numbers only (decision 5 in
  `rule-zero-log.ts`).
- [✅] Partners: the table view already returns `partner { name, artCropUri }` per seat (`rule-zero-table.ts`).
- [✅] Seat cap: `SEATS_MAX = 8` in `src/lib/social/client-rules.ts`, as named.

### 🧱 Codebase fit

- [✅] Colours are Low Sun tokens (`#14110E`, `#CF8745`, `#EDE6D8`, `#DEAA29` and the panel greys all exist in
  `src/app/globals.css`). The off-theme values (`#E9B57E`, `#E3A066`, `#9C6330`, `#191510`) are the prototype's faked
  dice, which production replaces with a library. Two off-theme fills remain: `.guest{background:#1A2230}` on the
  tablet boards (F12/F18/F19) and the focused counter's `#2A2119` (F15). The plan maps each to the nearest theme token.
- [🟡] Icons: `scripts/fetch-mana-symbols.ts` takes only `appears_in_mana_costs` symbols, so {E}, {TK} and Phyrexian
  need the filter widened, and the LTR set symbol is a separate Scryfall `sets` fetch. DFC sun/moon is not a Scryfall
  symbology entry as far as this audit can tell: verify at build, and if absent draw it with the I1/I2 icon set.
- [🟡] New dependency: a 3D dice library, lazy-loaded. Bundle budget is the plan's call (Design's read lists it open).
- [✅] Copy is DRAFT and goes to `/copy-review`; not a Design gap.

### ♿ Cross-cutting

- [✅] `prefers-reduced-motion` covers every motion; dice show the result without the roll.
- [🟡] Not stated: accessible names for the tap halves (−1/+1), hold-to-repeat for keyboard/switch users, and an
  `aria-live` announcement of the committed life change. Plan adds them.
- [🟡] Offline: `public/sw.js` deliberately never caches a page load (`docs/agents/service-worker.md`), so "the SW
  caches the tracker route" in Design's read conflicts with the shipped rule. Local-storage state already survives
  sleep and reload while online; an offline reload gets the offline page. Plan keeps the SW rule and records this.
- [✅] Wake Lock: new (nothing in `src/` uses it yet); no permission prompt, no spend.
- [✅] No analytics asked for.

### ⏰ Drift from reality

- [✅] Every file Design named exists as named: `table-body.tsx`, `setup-sheet.tsx`, `client-rules.ts` (`SEATS_MAX`),
  `rule-zero-log.ts` (`TablePrefillSeat`), `public/sw.js`, `src/app/manifest.ts`, `scripts/fetch-mana-symbols.ts`.
- [✅] Rebased cleanly on e47c3e709.

### 📝 Decision log

- [✅] Approved by Hugh 2026-11-18; direction C over A/B recorded; icon choices (Ring A, Speed A, tornado storm)
  recorded; motion specs locked with numbers.

## Gaps requiring a Design round-trip (Orange/Red only)

None. The "everyone seated" result is a product call on a migration (see Flags), not an undrawn screen.

## Eng-side clarifications (Yellow only)

- Route: name the tracker route as new (child of `/friends/table/[id]`) or build it as an overlay on that page.
- Setup and Result at tablet/desktop width: follow `setup-sheet.tsx`'s desktop presentation and a centred F11 column.
- Start disabled at 7–8 seated, with Design's reason line; the table's own cap stays 8.
- A seat waiting for its deck: block Start, or seat it with the grey out-art, decided in the plan.
- Seats are snapshotted at Start; a reseat or close mid-game does not change a running game; a saved game resumes.
- Placements → `result` + one `won` seat; prefill handed to the Games tab by seat number only.
- Icons: widen the symbology filter for {E}, {TK}, Phyrexian; fetch the LTR set symbol; draw day/night if Scryfall
  has none.
- Offline: keep the service worker's no-documents rule; local storage carries the game.
- Accessibility: names for the tap halves, keyboard repeat, live life announcements.
- Tokens: map `.guest` `#1A2230` and the focused counter's `#2A2119` to the nearest theme tokens.

## Flags (product calls, not gaps)

- **Migration, if "everyone seated" is kept:** a table result record read by every seat's log prefill. Otherwise no
  migration and the F11 line changes to the device owner's log only.
- **New feature switch:** Rule 0 has no switch in `src/lib/flags/registry.ts` today, so this would be a new one, which
  needs Hugh first and a migration (`flag_overrides_switch_check` is generated from `SWITCH_NAMES`). Without one the
  tracker ships live to every Rule 0 table.
- **Deck game log:** ties in through the shipped prefill and `logGame` only; no new write path unless the result record
  above is chosen.
- No model call, no spend, no email.

## Decisions inherited

- Game state on the device only (local storage, keyed by table). No multi-device sync.
- Tracker caps at 6 seats; Rule 0 tables keep 8.
- Sheet tab order: Commander damage, Counters, Tax, Mana, Table. No "Other" counter.
- Round increments when play passes the first player's seat, skipping seats that are out.
- Out at 0 life, 21 commander damage from one commander, or 10 poison; panel flips with Undo.
- Dice lazy-loaded on first tap or at setup with Random.

## Design's own read (kept)

# Readiness: Life tracker

**Verdict: Green to build.** Hugh approved the round on 2026-11-18. Checked against `origin/main` @c8fd948. No migration,
no schema change; the tracker is a client-side surface on the Rule 0 table. Suggest a feature switch (new full-screen
surface on a shipped page). New player-facing copy is DRAFT for `/copy-review`.

## For engineering

- **Entry:** `src/components/rule-zero/table-body.tsx` gains **Start the game** for the setter, beside `Log this game`.
  The tracker reads the table's seats and decks (`src/components/rule-zero/setup-sheet.tsx` is the setup pattern to match).
- **Seat cap:** `src/lib/social/client-rules.ts` has `SEATS_MAX = 8`. The tracker supports 2–6; at 7–8 seated, Start the
  game stays visible and disabled with the reason ("The tracker fits up to 6 players"). Don't change the table cap.
- **State:** a reducer for life, counters, commander damage (per commander, partners separately), tax, mana, monarch,
  initiative, day/night, active seat, round, history (by round) and undo. Persist to local storage keyed by table.
  Round rule: increment when the active seat passes the first player's seat (skip seats that are out).
- **Result → log:** prefill via `src/lib/social/rule-zero-log.ts` (`TablePrefillSeat`) with placements; no new endpoint.
- **Offline:** check `public/sw.js` caches the tracker route so a game survives a dropped connection; keep the screen
  awake (Wake Lock API) while a game runs; `src/app/manifest.ts` orientation stays as is (panels rotate themselves).
- **Icons:** `scripts/fetch-mana-symbols.ts` fetches only `appears_in_mana_costs` symbols from Scryfall symbology. Extend
  it to pull {E}, {TK} and the Phyrexian symbol, and fetch the LTR set symbol (Scryfall `sets/ltr` `icon_svg_uri`) for
  The Ring. DFC sun/moon from the same source. The rest are the drawn icons in `I1-Icons.dc.html` / `I2-IconsPass2.dc.html`.
- **Dice:** pick a small 3D dice library (physics roll, d6/d20, plus a coin); dynamic `import()` on the first dice tap
  or at setup with Random. Respect `prefers-reduced-motion` (show the result without the roll).
- **Partners:** split art and per-partner commander damage and tax need both commanders from the deck; the partners
  handoff already resolves them.

## Open
- Copy review for all new strings.
- Library choice for dice (bundle size budget).
