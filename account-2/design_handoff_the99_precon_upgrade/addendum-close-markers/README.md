# Upgrade this precon · addendum A3: close on every step, and bracket marks on the swaps

`design_handoff_the99_precon_upgrade/addendum-close-markers/` · 2026-11-12 · account 2

**Status: R1, awaiting Hugh's audit.** Canvas: https://claude.ai/artifact/BGMmU2uhRMixjsKrrSkN4F (the A3 rows, under A2c).

**Brief (Hugh, 2026-11-12, from testing).**
1. Once the Upgrade window is open, a player can't leave it without finishing or using the browser's Back. Draw a close control for every step (Intro, Commander, Bracket, Strategy, Wait, Results, History), on phone and desktop, and what closing mid-run means: during the Wait the run keeps going and its result is kept.
2. The suggested adds and cuts don't say which ones are game changers, combo pieces or mass land destruction, which is exactly what decides a bracket. Mark them in the Results lists, reusing the app's card marks.

**What doesn't change.** R2d (handoff PR #2794) and A2c (PR #2873) as approved: the steps, their copy, the credits, the results' layout, Start and Apply.

Drawn over the shipped flow (`upgrade-flow.tsx`, `result-view.tsx`), the shipped bare close (`social-modal.tsx`) and the shipped marks (`card-fact-mark.tsx`, `combo-glyph.tsx`, `mark-key.tsx`), in Low Sun. The fixture is R2d's (Prismari Artistry, led by Muddle, Spells at bracket 3) with two adds swapped for real Game Changers: Mystic Remora for Fact or Fiction, Jeska's Will for Mystic Confluence. Copy marked DRAFT goes through `/copy-review`.

| File | Holds |
|---|---|
| `A3-Calls.dc.html` | The calls and gaps, the title row with its 44px hit, one marked swap |
| `A3-Close-Phone.dc.html` | The ✕ on all seven steps of the drawer (390) |
| `A3-Close-Desktop.dc.html` | The same seven steps in the 720 dialog (1300, shown at 48%), and the title row at full size |
| `A3-Mid-Run.dc.html` | W the Wait, P1 closed while running, P2 the run landed, R the next open (390); P1 at 1300 |
| `A3-Marks.dc.html` | The marks and why each matters; R1 top and scrolled, R4 a combo at bracket 4 (390); R1 at 1300 |
| `STATES-close-markers.md` | Every state, with Must-nots |
| `READINESS.md` | Readiness and gaps G19 to G21 |
| `copy strings.ts` | DRAFT strings for `src/lib/copy/precon-upgrade.ts` |

## Design's calls

### Close

1. **One bare ✕ on every step, at both widths.** It's the shipped bare close from the app's other sheets (`SocialModal`): the ✕ at 15px in `--fg-muted`, no plate, in a 44 × 44 hit, at the right end of the flow's title row (pulled to the row's padding edge, as SocialModal's `-mr-[10px]`).
   - **Phone:** new. The drawer had only the grabber, the scrim and Escape.
   - **Desktop:** it replaces the dialog's 36px plated ✕ (`hidden … md:flex`), so phone and desktop draw one control.
   - `aria-label` is `Close` (it was `Not now`).
2. **Same place on every step:** Intro, Commander, Bracket, Strategy, Wait, the failed run, Results, a past result and History. Where the History link shows (intro, results) it sits just before the ✕.
3. **One control per action, so three foot buttons go.** Each did what the ✕ now does.
   - Intro's `Not now`
   - the Wait's `Back` (it called `leave`, so it closed the window)
   - History's `Close`

   Their foot keeps the one press, full width on a phone. `Back` on Commander, Bracket and Strategy stays, because it moves between steps. So do History's `‹ Back` and a past result's `‹ History`, and the failed run's `Back` (it returns to Strategy).
4. **The ✕ never asks.** Before the confirm nothing is spent, so closing drops the picks and the next open starts at the intro. Escape and a press on the scrim still close, as shipped.

### Closing mid-run

5. **The run keeps going.** The 2 credits stay held and the run finishes on the server (already true: `useUpgradeRun.close` keeps a wait view).
   - While it runs, the page's button shows the shipped `Upgrading toward Spells · 0:05` with its clock. Pressing it opens the Wait again.
   - When it lands, the button goes back to `Upgrade this precon` and plays the shipped `line-pulse` twice (G21). The next open shows the result, as shipped.
   - The result is kept in History either way, so leaving the page mid-run is as safe as closing.
   - The deck page's band button (A2c) does the same.
6. **A run that fails while the window is closed** gives both credits back, as shipped, and the next open starts at the intro. Drawn as shipped. **Open for Hugh:** whether the next open should show the failed view instead.

### Bracket marks

7. **The swaps carry the app's card marks**, the same ones a deck row draws:
   - `CardFactMark`: game changer (bolt), mass land denial (stripped peak), extra turns (turn again), tutor (drawn up)
   - `ComboGlyph`: the two-card combo lemniscate

   16px, `--fact` with its glow, bare, right after the card's name and before its cost, on either side of a swap (cut or add) and on the Commander pair. The name gives up room first: a long name ellipsises before the mark does. Tutor is in because the deck rows mark it; Hugh can drop it here if only bracket-counted marks belong on swaps.
8. **The combo mark follows the deck row's rule** (`comboPartner`, partner in this deck), applied to the deck as it would stand after the swaps:
   - an add that completes a combo with another add, or with a card that stays, is marked
   - a cut whose partner is also cut isn't
   - a cut whose partner stays is marked (cutting it breaks the combo)
9. **The key is the shipped `MarkKey`**, under the four facts and above the first group, at both widths (phone wraps, desktop is one line).
   - A result is a closed set, like a deck, so the key lists only the marks on its swaps, in the shipped order (`buildMarkKeyEntries`' fact rule).
   - A run with none, like most bracket 2 runs, draws no key and no marks, because absence is the design.
10. **Opening a marked card is as shipped:** the name opens card details, whose `Bracket facts` block spells the mark out. On desktop the mark has its shipped `FactTooltip`, and the combo mark has the deck row's hover sentence, `Two-card combo with Dramatic Reversal. Both are in this deck.`
11. **The four facts stay as they are.** The Bracket cell still reads `2 → 3`. The marks show what moves it, so there's no count beside the number.

## Not drawn
- The failed run's ✕ is the same as the Wait's (the title row is the same). It isn't drawn on its own.
- The deck page's band while running. It's the same button label as the precon page's, at the band's size.
- Six themes. Every new piece is a shipped token or component.
