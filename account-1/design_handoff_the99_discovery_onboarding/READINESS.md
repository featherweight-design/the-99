# Discovery R1 · READINESS

**Verdict: 🟡 R1, for Hugh's audit.** Every lock in the brief is held (README, "Brief locks, held"). The calls are made, with reasons, on `Main.dc.html`. What remains is Hugh's audit, his calls on G1 and G3, `/copy-review` for every line, and the engineering items below.

## Drawn

| What the brief asks (§Every state to draw · Moments) | Where |
|---|---|
| Each of the 16 at the width it fires at, 390 and desktop | M1–M16, every one at 1280 and 390 |
| One dismissed (gone) | S1 |
| One with its switch off (absent) | S2 |
| Two qualifying on one visit | S3 |
| The quiet form (§Open 1) | Main, Q1 |
| Which moment wins (§Open 2) | Main, Q2; S3 |
| The Friends Home card (§Open 8) | Main, Q8; M16, M16b |

Every board is drawn over the shipped screen, built from `src/`, in Kaldheim:

- the deck spine, the Top off strip, the Recommended mix, tabs, one-line rows and Shopping
- card details (the dialog and the sheet)
- Games
- /commanders' first run
- /decks
- /decks/new
- the upload choice
- Home

All card art is real and uploaded to the canvas. Every board was rendered whole before handover, with no broken image and no clipped board.

## For the audit

1. **The form.** A bubble with a halo on the control, nothing moved. Is the halo too loud on the deck page? It can drop to the nib alone.
2. **What a tap does.** The control is the action and ✕ is the only other control, so there is no "Show me".
3. **The rule.** The first control on screen wins, then a fixed order. A loser waits rather than being spent.
4. **A visit is 30 minutes away (G4).**
5. **The Friends card.** Its place (right column / last) and the table of seats.
6. **G1.** M12 points at Discover, or R3 adds a Help me choose door on /commanders.
7. **G3.** Does Card assignments get an About entry?

## Engineering (for the plan)

- **E1 · Moment state per account (lock 5).**
  - A spent set (moment ids) and, for the carried-forward triggers, nothing more: "first open at 100" is read as "at 100 and M2 not spent".
  - If it goes in `user_prefs`, write only when a moment is spent, as `markUpcomingSeen` does, because `user_prefs` carries the `user_data_touch` trigger.
- **E2 · A visit.** Session-scoped, client side. One moment per visit needs only a per-session flag; nothing per visit is stored server side.
- **E3 · "Control on screen".** An anchor registry: each control a moment points at registers itself (moment id, element). An IntersectionObserver decides "in view". Ties on the same frame resolve by the fixed order.
- **E4 · Conditions.** All read from data the screens already load (deck count and size, open slots, a row's price against the limit, spares, contested copies, ownership in card details, game count, upload count). No new read is needed for any condition except "has a friend" on Home and after a game (M11, M16), which the social module already answers.
- **E5 · Switch-following.** Resolve each moment's tool switch with `requestSwitchEnv` like any reader. A cached page (Home) that draws M16 keys on the switch and on the spent set. Home and `/decks` cache per reader, so the spent set has to be in the stamp's reach or in the key.
- **E6 · Never during the tour (R3), never over an open sheet** except card details' own controls.
- **E7 · Copy.** `discovery · copy strings.ts` goes through `/copy-review` before build.

## About

None owed, and no `ABOUT_VERSION` bump (brief §About entries).
