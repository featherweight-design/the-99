# Discovery R3 · READINESS

**Verdict: 🟢 R3b approved by Hugh, 2026-10-16** (after one note: the creator's note fits its text). Every lock in the brief for this round is held (`README-r3.md`, "Brief locks, held").
The calls are on `r3/Main.dc.html`. What remains:

- his calls on G24, G25 and G30, which don't block R3;
- `/copy-review` for every new string;
- the engineering items below.

## Drawn

| What the brief and the round ask | Where |
|---|---|
| The tour, each step at 390 and desktop | `Tour-Stops` T1–T4; `Tour-Theme` T5; `Tour-End` T6 |
| The four stops: Collection, Commanders, Decks, Buying | T1–T4 |
| The theme step's live previews, in at least two themes | T5a Amonkhet, T5b Kaldheim (both widths), T5c Eldraine (390) |
| Precons as a way in, with no collection file | T1: the lit card holds `Precons I own`, and the card names it |
| The last step points at the Home banner | T6 |
| Skip | `Tour-End` X1, at both widths |
| A finished tour | `Tour-End` F1 (the note) and F2 (Home after) |
| The spotlight treatment | `Tour-Spotlight` P1 (the cutout at 2×) and P2 (the card) |
| Each empty state naming its tool, switch on and off | `Need-Empty` E1, E1·off, E2, E2·off, at both widths |
| Each nudge beside its figure, switch on and off | `Need-Nudges` N1, N2, N3, each on and off, at both widths |
| The list of screens, chosen and left alone | `Main` L1 |
| How a nudge differs from a moment | `Main` (the table); `Forms` F1 |
| G1, Help me choose on /commanders | `Main` C8; `Need-Empty` E2 |
| A state table and copy strings | `STATES-tour-and-need.md`; `discovery-r3 · copy strings.ts` |

Every board was rendered whole before handover, with the canvas's own fonts:

- no broken image;
- no unresolved hole;
- no board or part cut off.

Every part also renders alone at its own frame.

## For the audit

1. **When it opens:** the first Home visit (C1), and only for accounts made after it ships (G24).
2. **Six steps**, precons inside step 1, and the note closing step 6 (C2, C7).
3. **Skip is the bare ✕**, with Esc (C3).
4. **The spotlight:** R1's halo as the ring, and nothing under it pressable (C4).
5. **The theme step** is the account menu's own picker, with the app as the preview (C6).
6. **Friends is not named** at the end, because first-run Home has no Friends section (G25).
7. **The nudge form:** a word in the figure's existing slot (C9), and the five screens chosen (L1).
8. **N2 and N2b each follow their own switch,** not the hub's two-of-three rule (G29).
9. **G30:** whether reusing an existing slot on the deck page's tabs counts as adding to it.

## Engineering (for the plan)

- **E18 · Tour state per account.**
  - A `tour_seen_at` on `user_prefs`, written once when step 1 shows. Write only on change, because `user_prefs` carries the `user_data_touch` trigger.
  - The migration that adds it fills it for every existing account (G24).
- **E19 · Opening.**
  - Home's client reads the flag from the page payload. Home is cached per reader; the trigger moves its stamp, so the key needs nothing new.
  - It opens after the page settles plus 600ms, when nothing is open over Home.
  - The visit's moment slot is taken (R1 E2), so no moment arrives on that visit (R1 E6).
- **E20 · The spotlight and the anchors.**
  - Reuse R1's anchor registry (R1 E3) with tour ids:
    - step 1's card;
    - the Commanders and Decks slots, in the rail and the tab bar (whichever is rendered);
    - the account button;
    - the banner.
  - One overlay component draws the cutout from the anchor's rect: `ResizeObserver`, and scroll at 390.
  - It sets `inert` on the app root and renders the card outside it.
  - The card is a modal dialog with Esc as skip.
- **E21 · The theme step.**
  - Mount `ThemePicker`'s miniatures and `applyTheme` with a third layout (`panel="tour"`: 3×2 at `md`, 2×3 below). No new storage and no new save path.
  - The six faces load when step 5 opens, as the menu loads them.
- **E22 · The tour's switches.**
  - Step 1's precon line follows `PRECONS_ENABLED` and `NO_COLLECTION_ENTRY_ENABLED`.
  - Step 6 reads the banner's anchor. With `ABOUT_SHEET_ENABLED` off it centres the card with no cutout (STATES).
  - The tour itself is behind a switch of its own, `FIRST_RUN_TOUR_ENABLED`, so it can ship dark and be watched on staging.
- **E23 · E1 and E2.**
  - `DecksZeroActions` takes `helpMeChoose: boolean`, from `helpMeChooseEnabled(env)` as /decks/new already reads it. Home and /decks both pass it.
  - `GuidedBanner` takes the same.
  - R1's M12 anchor moves to E2's door, and its README row changes.
- **E24 · N1.**
  - A role cell with no shelf, under target, on a deck at its body size, gets an `onSuggest` handler when `tuningEnabled(env)` is on.
  - It opens the Analysis tab with R2's `?tool=suggested` landing (R2 E11): scroll, halo for 2.4s, no run.
  - `consider →` keeps the slot whenever a shelf exists.
- **E25 · N2 and N2b.** `builder-shell` draws `balance mana →` on `manaBalanceEnabled(env)` alone and `Proposed cuts →` on `proposedCutsEnabled(env)` alone. With `tuningHubEnabled` off, each opens its tool on the Analysis tab directly (G29).
- **E26 · N3.**
  - `MoneyCard` takes `overLimit: { count, limit } | null`, from the same over-limit read Shopping's `StandInLimit` uses, under `swapToolsEnabled(env)`.
  - The press lands on Shopping with `?tool=standins`.
- **E27 · Copy.** `discovery-r3 · copy strings.ts` goes through `/copy-review` before build.

## About

None owed this round. Entries are paused until the line closes, and are then written as one batch (AGENTS.md: a multi-round line batches its entries).
