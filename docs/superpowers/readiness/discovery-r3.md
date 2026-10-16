# Readiness audit · Discovery and onboarding R3 (the first-run tour, tools where the need is)

2026-10-16 · PR #1933 · handoff `design/design_handoff_the99_discovery_onboarding/` (R3 files: `README-r3.md`,
`READINESS-r3.md`, `STATES-tour-and-need.md`, `design-tables/discovery-r3.md`, `discovery-r3 · copy strings.ts`,
`r3/*.dc.html`) · brief `docs/superpowers/design-briefs/2026-10-16-discovery-and-onboarding.md` §3, §5, open
questions 4 and 7, and the Tour and Tools states.

Audited independently of Design's `READINESS-r3.md`, against the tree at `origin/main` cc19dc322.

## Verdict: 🟡 Yellow

Every R3 deliverable the brief and the round's prompt ask for is drawn at 390 and 1280. Every brief lock for the round
holds, and R3 contradicts neither R1 nor R2 except in one place, G27, which a standing ruling already answers. Sixteen
gaps remain. Engineering can resolve each one, and none needs another Design round. The resolutions below bind the plan
unless Hugh overrules one. One question is genuinely Hugh's (Friends on the checklist, gap 5). It does not block R3.

## Coverage against the brief and the prompt

| Asked for | Drawn | Note |
|---|---|---|
| The four stops, with the spotlight | `Tour-Stops` T1 to T4; `Tour-Spotlight` P1, P2 | Buying has no slot, so it lights Decks and its picture is Shopping (C5). Accepted |
| Pick your look, live previews, at least two themes, saved by the picker | `Tour-Theme` T5a Amonkhet, T5b Kaldheim (both widths), T5c Eldraine (390) | The live preview is the app itself repainting behind the scrim (C6) |
| Precons for a player with no collection file | T1: the lit step-1 card holds the shipped ways group with `Precons I own`, plus one sentence | Follows `PRECONS_ENABLED` and `NO_COLLECTION_ENTRY_ENABLED` |
| The last step points at the Home banner | `Tour-End` T6 | It does not name Friends (G25, gap 5) |
| Skip and finished, 390 and desktop | `Tour-End` X1, F1, F2 | Skip is a bare ✕ named `Skip the tour`, plus Esc |
| Every empty state and nudge, switch on and off | `Need-Empty` E1, E2 (on and off); `Need-Nudges` N1 to N3 (on and off) | N2b is unchanged in look, so not drawn. Accepted |
| A note from the creator as the last step, with Read the note (R2 G23) | T6 card foot; F1 (the note open) | The note is sized to its text (R3b) |
| The tour in themes other than Amonkhet | T5 in Kaldheim and Eldraine; `TourCard` themed token for token | Other themes follow the tokens |
| Optional: a ? inside card details at 390 | Not drawn | R2's gap 5 resolution stands: reached through Collection's ? and search |
| Open Q7 (spotlight, steps, previews, skip) | C2 to C6 | |
| Open Q4 | Answered in R2 | R3 adds nothing to it |

## Code claims I checked

- **The theme picker.** `ThemeMiniature`, `ThemePicker` and `applyTheme` are in `src/components/shell/theme-picker.tsx`.
  `applyTheme` sets `data-theme` on `<html>` and writes the theme cookie, so selecting a miniature does repaint the whole
  app behind a scrim: the live preview is buildable. The status line `${name} applied.` is `themeCopy.applied`, and
  `First Frost applied.` is pinned in its test. `PanelKind` is `"popover" | "sheet"` today, so E21's `panel="tour"` is a
  third value.
- **Anchors and the visit slot.** R1's anchor registry is shipped (`useMomentAnchor` in
  `src/components/moments/moments-provider.tsx`), and so is the visit's single moment claim (`src/lib/moments/visit.ts`,
  `taken` and `claim`). E19 and E20 build on real code.
- **First-run Home.** `FirstRunChecklist` (`src/components/home/first-run.tsx`) draws `ArrivalsBanner` with
  `closable={false}` whenever About's line exists. The first-run line leads with `What The 99 does:`
  (`arrivals.ts`, `aboutFirstRunLead`). Step 1's ways group carries the shipped kicker `No file? Start another way` and
  takes `precons` from `PRECONS_ENABLED` under `NO_COLLECTION_ENTRY_ENABLED` (`src/app/page.tsx`).
- **The locked nav.** The rail and the tab bar lock every slot but Home (and Collection when open) at zero cards
  (`src/components/shell/nav.tsx`), so the Commanders and Decks stops are locked controls, as C5 says.
- **The old About sheet does not compete with the tour.** `shell.tsx` mounts it only on a header the proxy no longer
  sends.
- **E1 and E2.** `DecksZeroActions` is shared by `/decks` and Home's `HomeDecksZero`. `GuidedBanner` draws while
  `firstRun` is `decks.length === 0` (`src/app/commanders/page.tsx`), which is M12's trigger, as C8 says.
  `helpMeChooseEnabled` exists, and `Not sure what to build?` and `Not sure what you want?` are shipped
  (`help-me-choose.ts`).
- **N1 and N2.** The role cell's slot is real (`role-counter-cell.tsx`): it shows `consider →` with a shelf, else
  `balance mana →` / `balance →` when handed a handler, else a dash. N1 fills the dash case only, so the slot rule
  holds.
- **G29 is accurate.** `builder-shell.tsx` passes `onProposedCuts` and `onBalanceMana` only under
  `tuningHubEnabled && …`. With the hub off, the cuts and mana panels are mounted on the Analysis tab directly.
- **N3.** `MoneyCard` (`deck-stats-money.tsx`) draws `See the N in Shopping` (`deckStatsCopy.money.shopLink`, counting
  COPIES) and `⟶`. The over-limit count is not a server read: `decklist.tsx` counts list ROWS on the client
  (`isOverLimit` over `listShoppingCards`), and `StandInLimit` is handed it.
- **Switches.** `tuningEnabled`, `proposedCutsEnabled`, `manaBalanceEnabled`, `tuningHubEnabled`, `swapToolsEnabled`,
  `preconsEnabled` and `noCollectionEntryEnabled` all exist. `MANA_BALANCE_ENABLED` and `PROPOSED_CUTS_ENABLED` need
  `ANALYSIS_TAB_ENABLED`. `FIRST_RUN_TOUR_ENABLED` does not exist yet (E22 adds it).
- **Shipped strings the copy file quotes.** `Precons I own`, `See the N in Shopping`, `balance mana →`, `balance →`,
  `Help me choose →`, the importer list (ManaBox, Moxfield, Archidekt, Deckbox, matching `collection-edit.ts`) and
  `aboutCopy.pageIntro`'s opening all match.
- **`user_prefs`** is keyed on `user_id` and created lazily. That matters for gap 1.

## Gaps, and engineering's resolution

1. **E18's backfill cannot reach every existing account.** `user_prefs` rows are created lazily, so "the migration
   fills `tour_seen_at` for every existing account" misses each account that has no row, and those accounts would see
   the tour.
   - **Resolution (G24, decided):** the tour opens only when Home draws the first-run checklist (no cards, no decks)
     and `tour_seen_at` is null. No backfill.
   - An existing account with cards or decks never sees the checklist, so it never sees the tour. That is G24's
     intent, met without a migration fill. An existing account that is still empty sees it once, which is right.
   - Every stop is built for the checklist (step 1's card, the locked slots, the "once your cards are in" pictures).
     So the same rule covers a new account whose first Home visit is already the dashboard, because it imported a deck
     or uploaded from an invite route first: the tour does not open over the dashboard.
2. **G27 contradicts the standing ruling.** Screenshots follow the reader's own theme (R2 G11, ruled). R3's G27 keeps
   the tour's three pictures in Amonkhet.
   - **Resolution:** capture the step 2 to 4 pictures in all six themes with R2's capture pipeline (E9), and pick the
     reader's. The canvas's Amonkhet captures stand in for all six.
3. **G30 is answered by the standing ruling.** Nudges must add nothing to the deck page's layout. N1 rewrites a dash
   in a slot the cell already draws, and N3 lengthens a line the Money card already draws (Mono 11, about 230px,
   which fits the card at 390 on one line).
   - **Resolution:** build N1 and N3 as drawn. A test pins that N3's line does not wrap at 390.
4. **Leaving through the banner's link mid-tour is impossible.** STATES lists it as a way the tour ends, but the app
   root is `inert` while the tour runs.
   - **Resolution:** drop the clause. A reload, a closed tab or the browser's Back are what end the tour by leaving.
     Each one spends it, because the account is marked spent when step 1 shows.
5. **G25, Friends on the checklist (Hugh's call).** The launch is invite-only (invites R1), so most new accounts
   arrive as a friend of the inviter. Their first Home is the checklist, which has no Friends section.
   - **Resolution until Hugh rules:** build as drawn: step 6 names no Friends section. If Hugh puts Friends on the
     checklist, step 6 gains one sentence and a second light, and the copy goes to /copy-review. That needs no Design
     round.
6. **Step 6 with no banner.** STATES covers `ABOUT_SHEET_ENABLED` off. The banner is also absent when the seen-state
   read fails (`readAboutSeen` returns null) or when the account has no About line.
   - **Resolution:** whenever the banner's anchor is not registered, step 6 uses the drawn fallback: a centred card with
     no cutout, without the banner sentence, keeping the note and Finish.
7. **N2 and N2b with the hub off (G29).** Both shortcuts work today by `setHubRequest`, which only the hub consumes.
   - **Resolution:** with `tuningHubEnabled` off, the press switches to the Analysis tab, then scrolls to the directly
     mounted panel and gives it R1's halo. N2 keeps its shipped `coloredPip` condition, and each follows its own switch
     alone.
8. **N1 with the hub off.** Suggested changes has no tile when the hub is off.
   - **Resolution:** N1 lands on the Suggested changes panel itself, by the same scroll and halo as gap 7. "99 / 99"
     means the deck at its own body size (98 with a partner), per R2's gap 2. The words drop no figure.
9. **N3's count, and its units.** The over-limit count is computed on the client from the list's rows, not from a read
   E26 can reuse. The `15` counts copies, while `2 over` counts rows.
   - **Resolution:** compute it with `isOverLimit` over the same list rows `decklist.tsx` uses, under
     `swapToolsEnabled`, and pass it to `MoneyCard` as `overLimit`. /copy-review settles how the line reads two units
     in one sentence.
10. **N3's accessible name over-claims.** `shopOverAria` says the over rows "have cheaper stand-ins". An over-limit row
    need not have one.
    - **Resolution:** the name says only that they are over the limit. The fix goes to /copy-review with the rest.
11. **The landings depend on R2.** N1 (`?tool=suggested`) and N3 (`?tool=standins`) land through R2's tool landing
    (R2 E11), which is not built yet.
    - **Resolution:** the plan orders N1 and N3 after R2's E11. If R3's PR lands first, it builds that landing and R2
      reuses it.
12. **M12's anchor.** The moments plan (`2026-10-16-moments.md`) points M12 at Discover in the rail and the tab bar.
    - **Resolution:** M12 moves to E2's door in the PR that ships E2, and that plan's row changes with it. Until then it
      stays at Discover. With `HELP_ME_CHOOSE_ENABLED` off, both are absent.
13. **The tour's switch.** `FIRST_RUN_TOUR_ENABLED` is added to the registry as a `feature` switch with no parent.
    With `MOMENTS_ENABLED` off, the tour still runs, and there is no slot to take.
14. **The theme step mounts the picker, not a copy.** `applyTheme` is private to `theme-picker.tsx`.
    - **Resolution:** the step renders `ThemePicker` with `panel="tour"` (3×2 from `md`, 2×3 below), so there is no
      export and no second save path. The status line is the picker's own `role="status"`.
15. **Card details' ? at 390** is not drawn (optional in the prompt). R2's gap 5 resolution stands.
16. **Copy.** No new string says "tick", and the copy file has no British spelling. The handoff's own prose says
    "centred" and "Behaviour", which do not ship. `discovery-r3 · copy strings.ts` goes through /copy-review with
    gaps 9 and 10.

## Agreement with R1, R2 and the rulings since the brief

- **Friends:** R3 draws no ✕, moment or dismissal for Friends, and leaves M16 and ruling 7 dropped.
- **About:** no new entry and no `ABOUT_VERSION` bump. The paused entries are written as one batch at the line's close.
- **Nudges:** permanent, with no surface, halo or ✕, and each one reuses a slot the screen already draws (gap 3).
- **The tour:** skippable (✕ on every card, and Esc) and shown once (spent when step 1 shows).
- **Screenshots** follow the reader's theme (gap 2 corrects G27).
- **R2:** R3 reuses R1's halo and anchor registry and R2's `?tool=` landing and the creator's note (R2b), and changes
  neither round's files. The one exception is M12's anchor, which was R1's open G1 and which R3 answers.
- **Assets:** nothing from `design/` is copied into `public/`.

## Before build

- /copy-review of `discovery-r3 · copy strings.ts`, including gaps 9 and 10.
- Hugh's call: G25 (gap 5). G24 and G30 are decided above (gaps 1 and 3), and Hugh may overrule either.
- The plan names E18 to E27 as tasks, with the resolutions above, ordered after R2's E11 (gap 11).
