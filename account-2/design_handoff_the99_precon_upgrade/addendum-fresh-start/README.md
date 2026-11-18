# Upgrade this precon · addendum: a fresh start, with past runs in reach

`design_handoff_the99_precon_upgrade/addendum-fresh-start/` · 2026-11-15, R2 2026-11-18 · account 2

**Status: R2, awaiting Hugh's audit.** R1b (Hugh, 2026-11-15): the allocation marker moved to where the card row puts it. R1c (2026-11-18): issue #2985 folded in, so the two ship together. R2 (Hugh, 2026-11-18: "What we want are a list of adds and cuts, not combinations that we pick or not… use the same design system that Suggested Swaps uses almost identically"): the result's swaps are drawn by the shipped Suggested changes results, adds and cuts picked separately. This retires R1b's swap rows and R1c's per-pair toggle. Canvas: https://claude.ai/artifact/KxyeRMbPZ5akFWnnPHopip

**Brief (Hugh, 2026-11-15).** "When running Precon Upgrade on a deck and coming back, it's still at the end state of the last run. Should we show a new Precon Upgrade screen instead to start the flow over with history accessible?" Engineering recommends yes. Already decided: result rows use the shared allocation chips instead of `you own it` (engineering, in flight). Open for Design: what a returning reader lands on and how it acknowledges the last run; how past runs are reached; three return states (applied, not applied, in progress).

**What doesn't change.** R2d, A2c, A3 and the credits addendum as approved: the intro's copy, Commander › Bracket › Strategy, the confirm, the wait, the result's head (title, facts, commander pair), Try another strategy, History's list and New upgrade, the bare ✕, the pulse.

Every frame is the shipped `UpgradeFlow` rendered with the shipped CSS (Low Sun) from a scratch copy of main, with the proposal patched in (`scratch-gen/fspatch.diff`, `scratch-gen/proposal/last-run.tsx`), over the precon page drawn from the up2 kit. The result's lists are the shipped `SuggestedChangesRun` with three small scratch props (the flow's press in the bar, no You asked box, a seeded set read for a static frame). Fixture as R2d: Prismari Artistry, Muddle at bracket 3 (Mystical Tutor is the pick that moves it), three kept runs (Spells Nov 12, Tokens Nov 11, a short Rootha Spells run Nov 10). Copy marked DRAFT goes through `/copy-review`.

| File | Holds |
|---|---|
| `Main.dc.html` | The calls, gaps G25 to G28, must-nots |
| `F1-Applied.dc.html` | A finished run that went into a deck: start screen and opened result (390, 1300) |
| `F2-Not-Applied.dc.html` | A finished run with no deck yet: start screen, opened result as Suggested changes' lists, adds and cuts picked separately (incl. keep Sai but cut Wizard's Staff for Counterspell), uneven counts, bracket not reached; precon page and deck page (390, 1300) |
| `F3-In-Progress.dc.html` | A run in flight resumes on the wait; a run that landed while away shows once (390, 1300) |
| `F4-History.dc.html` | History with where each run went; the first-time intro, unchanged (390, 1300) |
| `STATES-fresh-start.md` | Every state, with must-nots |
| `READINESS.md` | Readiness and gaps G25 to G28 |
| `copy strings.ts` | DRAFT strings for `src/lib/copy/precon-upgrade.ts` |

## Design's calls

1. **Every return opens on the start screen.** The press (precon page and the deck page's band) opens the intro whatever runs are kept. This retires the rule that the press reopens the newest result until a deck is started from it, and the after-History `fresh` flag. A first-time reader sees the intro exactly as shipped.
2. **The start screen says what happened last.** One block above the intro's lead: the mono kicker `Your last upgrade` (History's month-heading style) over History's own row for the newest kept run, at its stronger `--border-strong` edge. Opening it is free and shows the result with `‹ Back` to the start screen. The rest of the intro and its foot (`Next · Commander`, the standing line) don't move.
3. **Past runs stay one press away.** The title row's History link (shipped glyph) stays on the start screen and on a fresh result, and lists every run as shipped. The start screen shows only the newest run: one way to the list, one way to the last run.
4. **Each row says where its run went.** The row's mono second line adds `· in Prismari Artistry` (faint) once a deck was started from the run or its swaps were applied (`decks.built_from_upgrade_id`, set by both), or `· no deck yet` in `--accent-text` while unused. One row component (`RunRow`) for the start screen and History, so the two lists always agree. The line wraps rather than truncates on a phone.
5. **Applied (F1): open it, start again if you like.** Opened, the result keeps its press live, as History does today (a second deck from the same swaps is allowed), under the dashed note `Already in Prismari Artistry. Opening it again uses no credit.` This replaces History's `A past upgrade, read-only.`, which was wrong because the press under it works. An unused run, opened from either list, draws no note.
6. **Not applied (F2): still yours to apply.** The row says `no deck yet`. Opened, `Start the deck with these 14 swaps` (precon page) or `Apply these 14 swaps` (deck page) is live in the bar, with `Try another strategy | 2 credits` after the lists. A run over an old list keeps the shipped `listChanged` line and its press off.
7. **In progress (F3): it resumes.** Unchanged from A3: the press reads `Upgrading toward Tokens · 0:05` and opens on the wait. No start screen while a run is in flight, because a second run can't start (`inFlight`).
8. **Landed while away: shown once.** The first open after a run lands shows its result as A3 drew it (tracker, History link; the press pulsed twice when it landed). From then on it's `Your last upgrade` on the start screen. Seen means shown in the flow once, including a run that lands while the flow is open (G25).
9. **The result is Suggested changes' results, reused (R2, #2985).** Under the run's head (title, the four facts as the run found them, the commander pair) the swaps are drawn by the shipped `SuggestedChangesRun`, not a copy of it: `Additions` and `Cuts` side by side on desktop and behind the `Additions | Cuts` switch on a phone; grouped by type or role with the shipped group heads and switch; each row the shipped pick line (art, name, allocation marker and buy tag as `addMarkOf` draws them, the reason, the bracket line where a card moves the bracket, `✓ Picked` / `Pick`); the counts chip `13 of 14 chosen` per side. A player can keep Sai, Master Thopterist and still cut Wizard's Staff for Counterspell. The pair's reason goes on the add; each cut gets its own reason (G28). The commander pair stays above the lists with no Pick: who leads is a step.
10. **Every card starts picked; the counts must match.** A run is the plan the player paid for, so all N of each start `✓ Picked`; the cap is the run's N (`pickCap`). The pinned bar is Suggested changes' own tally (`+13 in −13 out · stays at 99 · bracket 2 → 3 · Upgraded, as asked`), with its shipped lines: uneven counts turn the press off (`14 in, 13 out. Pick 1 more cut to apply, so the deck stays at 99.`); dropping the pick that moved the bracket shows the shipped warning and leaves the press on; none picked shows `0 in · 0 out`. Picks are free, no confirm, and kept with the run (G28), so opening it again shows them.
11. **One press, in the bar.** The bar's Apply place carries the flow's own press: `Start the deck with these 13 swaps` (precon page, no confirm, as today) or `Apply these 13 swaps` (deck page; A2c's Undo after). The flow's foot is dropped on the result so there's one bar; `Try another strategy | 2 credits` moves to the end of the lists. The `You asked` box is left out: the facts strip already says what the run was for.
12. **The deck page gets the same start screen**, inside the band's flow, with A2c's intro line and Apply. A run already applied to another deck from this precon reads `in Muddle Tokens` and can still apply here.

## Open for Hugh
- The row could also count the list (`1 of 3 in History`). Left off: History is one press away and the count adds copy.
- A run in two decks names the newest. Naming both was too long for the row.

## Not drawn
- Commander, Bracket and Strategy steps: unchanged (R2d boards 3 to 5).
- A failed last run: as shipped (A3's open call kept: a failure while closed opens the start screen; failed runs aren't kept, so the row shows the newest kept run).
