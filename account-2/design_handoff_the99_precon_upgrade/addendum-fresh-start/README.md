# Upgrade this precon · addendum: a fresh start, with past runs in reach

`design_handoff_the99_precon_upgrade/addendum-fresh-start/` · 2026-11-15 · account 2

**Status: R1b, awaiting Hugh's audit.** R1b (Hugh, 2026-11-15): the allocation marker moved to where the card row puts it, and a way to reject a swap. Canvas: https://claude.ai/artifact/KxyeRMbPZ5akFWnnPHopip

**Brief (Hugh, 2026-11-15).** "When running Precon Upgrade on a deck and coming back, it's still at the end state of the last run. Should we show a new Precon Upgrade screen instead to start the flow over with history accessible?" Engineering recommends yes. Already decided: result rows use the shared allocation chips instead of `you own it` (engineering, in flight). Open for Design: what a returning reader lands on and how it acknowledges the last run; how past runs are reached; three return states (applied, not applied, in progress).

**What doesn't change.** R2d, A2c, A3 and the credits addendum as approved: the intro's copy, Commander › Bracket › Strategy, the confirm, the wait, the result, Try another strategy, History's list and New upgrade, the bare ✕, the pulse.

Every frame is the shipped `UpgradeFlow` rendered with the shipped CSS (Low Sun) from a scratch copy of main, with the proposal patched in (`scratch-gen/fspatch.diff`, `scratch-gen/proposal/last-run.tsx`), over the precon page drawn from the up2 kit. Fixture as R2d: Prismari Artistry, Muddle at bracket 3, three kept runs (Spells Nov 12, Tokens Nov 11, a short Rootha Spells run Nov 10). Copy marked DRAFT goes through `/copy-review`.

| File | Holds |
|---|---|
| `Main.dc.html` | The calls, gaps G25 to G28, must-nots |
| `F1-Applied.dc.html` | A finished run that went into a deck: start screen and opened result (390, 1300) |
| `F2-Not-Applied.dc.html` | A finished run with no deck yet: start screen, opened result, swap rows with chips, rejecting a swap; precon page and deck page (390, 1300) |
| `F3-In-Progress.dc.html` | A run in flight resumes on the wait; a run that landed while away shows once (390, 1300) |
| `F4-History.dc.html` | History with where each run went; the first-time intro, unchanged (390, 1300) |
| `STATES-fresh-start.md` | Every state, with must-nots |
| `READINESS.md` | Readiness and gaps G25 to G27 |
| `copy strings.ts` | DRAFT strings for `src/lib/copy/precon-upgrade.ts` |

## Design's calls

1. **Every return opens on the start screen.** The press (precon page and the deck page's band) opens the intro whatever runs are kept. This retires the rule that the press reopens the newest result until a deck is started from it, and the after-History `fresh` flag. A first-time reader sees the intro exactly as shipped.
2. **The start screen says what happened last.** One block above the intro's lead: the mono kicker `Your last upgrade` (History's month-heading style) over History's own row for the newest kept run, at its stronger `--border-strong` edge. Opening it is free and shows the result with `‹ Back` to the start screen. The rest of the intro and its foot (`Next · Commander`, the standing line) don't move.
3. **Past runs stay one press away.** The title row's History link (shipped glyph) stays on the start screen and on a fresh result, and lists every run as shipped. The start screen shows only the newest run: one way to the list, one way to the last run.
4. **Each row says where its run went.** The row's mono second line adds `· in Prismari Artistry` (faint) once a deck was started from the run or its swaps were applied (`decks.built_from_upgrade_id`, set by both), or `· no deck yet` in `--accent-text` while unused. One row component (`RunRow`) for the start screen and History, so the two lists always agree. The line wraps rather than truncates on a phone.
5. **Applied (F1): open it, start again if you like.** Opened, the result keeps its press live, as History does today (a second deck from the same swaps is allowed), under the dashed note `Already in Prismari Artistry. Opening it again uses no credit.` This replaces History's `A past upgrade, read-only.`, which was wrong because the press under it works. An unused run, opened from either list, draws no note.
6. **Not applied (F2): still yours to apply.** The row says `no deck yet`. Opened, `Start the deck with these 14 swaps` (precon page) or `Apply these 14 swaps` (deck page) is live, with `Try another strategy | 2 credits` beside it. A run over an old list keeps the shipped `listChanged` line and its press off.
7. **In progress (F3): it resumes.** Unchanged from A3: the press reads `Upgrading toward Tokens · 0:05` and opens on the wait. No start screen while a run is in flight, because a second run can't start (`inFlight`).
8. **Landed while away: shown once.** The first open after a run lands shows its result as A3 drew it (tracker, History link; the press pulsed twice when it landed). From then on it's `Your last upgrade` on the start screen. Seen means shown in the flow once, including a run that lands while the flow is open (G25).
9. **Swap rows use the allocation chips, where the card row puts them (R1b).** In place of `you own it`, each side follows the shipped one-line row's All order (`docs/agents/card-row.md`): name and marks, then the availability marker and the buy tag flowing left of the fixed pip track. An add you own with a copy free draws nothing past the owned dot (the marker's free state is null); a copy held by another deck draws `◆ none free` (`AvailabilityMarker` row, bareOne, nameless); an add to buy draws the All row's bare `$` (`BuyTag` row, `density="glyph"`, its price in the tooltip). The run's total stays in the To buy fact.
11. **Reject a swap (R1b).** Each swap's reason line ends with a `Reject ✕` press (44px hit), so the one-line card rows stay as shipped. Rejected: both sides dim to 45%, the line reads `Rejected. Sai, Master Thopterist stays in the deck.`, and the press becomes `Bring it back` in `--accent-text`. The title gains a mono `1 rejected`, To buy and Already yours recount, and the press counts the kept swaps (`Start the deck with these 13 swaps`, `Apply these 13 swaps`). Free, no confirm, kept with the run (G28), so reopening it shows the same choice. Every swap rejected: the press goes off. The commander pair has no Reject: who leads is a step, changed from the tracker.
10. **The deck page gets the same start screen**, inside the band's flow, with A2c's intro line and Apply. A run already applied to another deck from this precon reads `in Muddle Tokens` and can still apply here.

## Open for Hugh
- The row could also count the list (`1 of 3 in History`). Left off: History is one press away and the count adds copy.
- A run in two decks names the newest. Naming both was too long for the row.

## Not drawn
- Commander, Bracket and Strategy steps: unchanged (R2d boards 3 to 5).
- A failed last run: as shipped (A3's open call kept: a failure while closed opens the start screen; failed runs aren't kept, so the row shows the newest kept run).
