# Readiness audit: the brackets reference sheet (addendum)

## Hugh's rulings (2026-09-24)

Hugh approved this audit on 2026-09-24.

- **Quote or paraphrase (finding 2): both.** Keep Design's plain reading of each rule, and add one short
  quoted Wizards line per rule beside it. This amends the verdict brief's lock, *"the rules text is quoted,
  not paraphrased"* (`docs/superpowers/design-briefs/2026-09-20-the-verdict.md:192`). Finding 3 still
  applies: each quote needs a source that actually contains it.
- **Exhibition contrast (finding 1): back to Design as a revision.** This audit merges now, and the revision
  gets its own re-audit when it returns.

**Verdict: 🟠 Orange.** Audited 2026-09-24 against `origin/main` at `dac4fd5c` (#901). Every
figure on the sheet matches the code, the chrome is `ModalChrome` with no new props, every token
exists, and the marking derives from data the tab already holds. The sheet is buildable. Two
things keep it from Green:

- **One ruling belongs to Hugh.** The verdict brief locks *"the rules text is quoted, not
  paraphrased"*, and this sheet paraphrases every rule and quotes none (finding 2).
- **One Design item.** The reader's-bracket marking draws Exhibition's name and label in
  `--bracket-1` on its own 12% tint over `--surface-raised`. That measures under 4.5:1 in all six
  themes (finding 1).

Design self-assessed Green (`READINESS.md:3`). The difference is findings 1 and 2. Neither was
visible from the files Design read.

## The ask, item by item

| Asked for | Drawn | Where |
|---|---|---|
| The full grid, with a `no cap` cell | Yes: 4 rules × brackets 1–3, three `no cap` cells | canvas 1b, 1c; `Brackets Sheet.dc.html:145-150` |
| The tutors row, ruleless and saying so | Yes: one merged cell, `no limit` + `at any bracket` + a reading line | `Brackets Sheet.dc.html:66-71` |
| The reader's own bracket | Yes: `[1,2]`, `[3]` and `[4,5]` drawn as frames. `[2]` and `[4]` are described but not drawn, and both follow from the rule | canvas 1d; `README.md` "The reader's bracket" |
| Stacking over a card | Not drawn, with a reason: no cell names a card | canvas 1e |
| The link, resting and pressed, in the climb's foot | Yes, at both widths | canvas 1a |
| Width and chrome from `ModalChrome` | `width={700}`, title, aside, close label, no mark | canvas 1b; `README.md` "Chrome" |
| The three open questions | All answered | `README.md` "Calls on the open questions" |

## Figures against the code

Every cell matches. The code is the source of truth, and none of these needs to change.

| Row | Sheet (1 · 2 · 3) | Code | Match |
|---|---|---|---|
| Game changers | 0 · 0 · 3 allowed | `GAME_CHANGER_LIMIT` = `{1:0, 2:0, 3:3}`, `src/lib/bracket/rules.ts:14-18` | ✓ |
| Mass land denial | 0 · 0 · 0 allowed | `MASS_LAND_DENIAL_LIMIT = 0`, `rules.ts:24` | ✓ |
| Extra turns | 0 allowed · no cap · no cap | `EXTRA_TURN_LIMIT_BRACKET_1 = 0`, `rules.ts:34`; `counted: false` at 2 and 3, `src/lib/bracket/slot.ts:128-137`; the climb prints `noCap` for it, `src/components/decks/bracket-climb.tsx:281-283` | ✓ |
| Two-card infinites | 0 · 0 allowed · no cap | `COMBO_POLICY` = forbidden, forbidden, `earlyGameOnly`, `rules.ts:48`; the climb maps `earlyGameOnly` to `noCap`, `bracket-climb.tsx:288` | ✓ |
| Optimized · cEDH | no card limits on any of the four | `permitsFor` treats 4 and 5 as unrestricted, `rules.ts:56-59`; the climb prints `noCap` on all four at 4–5, `bracket-climb.tsx:292-295` | ✓ |
| Tutors | no limit, at any bracket | no tutor constant exists. `comboLandsEarly` is the only reader, `rules.ts:104-120` | ✓ |

The reading lines also agree with the code:
- **Extra turns:** only a two-card combo that loops turns passes Upgraded. That is `violatesB3`'s `loops` clause, `slot.ts:55-61`.
- **Two-card infinites:** a deck that can find both halves is Optimized. That is `permitsFor` returning `[4]` when `assemblesCombo`, `rules.ts:100`.
- **Optimized · cEDH:** which of the two a deck is depends on how it is played. That matches `climb.declare`, `src/lib/copy/deck-analysis.ts:292-294`.

**The foot matches `sources.ts`.** The title, the link and `Rules as published, checked 22 Sep 2026.` are
`BRACKET_RULES_SOURCE` (`src/lib/bracket/sources.ts:14-20`) through `provenance.source` and
`provenance.rulesChecked` (`deck-analysis.ts:514-516`). The date is formatted by `formatDeckDate`,
as the provenance panel already does (`src/components/decks/provenance-panel.tsx:119`,
`src/lib/decks/format.ts:99-102`).

## Is the code right about Wizards?

- **Tutors: confirmed from Wizards' own text.** The October 21, 2025 post says they will "remove the
  tutor restrictions from Commander Brackets entirely and rely on Game Changers to catch the most
  efficient tutors". The sheet's "October 2025" claim, which `READINESS.md` asks to check, holds.
- **The B3 late-game combo clause and B2/B3 extra turns: consistent, but only a secondary source was read.**
  commanderbrackets.com's Bracket 3 page cites the February 9, 2026 update and reads "combo finishes that come online in the late game (around the turn-six expectation
  or later) are acceptable" and "never chained or looped". That agrees with `COMBO_POLICY[3]` and
  the extra-turn rule. Neither Wizards post returned the restriction lines as text when fetched,
  so this audit could not quote Wizards directly (finding 3).

No case was found where the code is wrong about the published rules.

## Findings

| # | Sev | Evidence | Correction | Owner |
|---|---|---|---|---|
| 1 | Medium | `Brackets Sheet.dc.html` `cols` / `highNameStyle`: the reader's name and the `where your cards are` label are drawn in `var(--bracket-N)` on `color-mix(... 12%, var(--surface-raised))`. Measured for `--bracket-1` on its tint, per theme: amonkhet 3.99, kamigawa 4.11, ixalan 3.87, phyrexia 4.32, eldraine 4.00, kaldheim **3.70**. The text is 11.5–12.5px/600, and the label is 8–8.5px mono, so the bar is 4.5:1. `--bracket-2` passes, at 4.73 minimum. | Choose an Exhibition treatment that reaches 4.5:1 in all six themes, for example the name in `--fg` with the ink kept on the top rule and the tint. The climb inherits the same problem on `--surface` (3.90–4.47, `bracket-climb.tsx:128, 167, 173`), so whatever is chosen should apply to both. | Design |
| 2 | Medium | The verdict brief's lock, `docs/superpowers/design-briefs/2026-09-20-the-verdict.md:192`: "The rules text is quoted, not paraphrased. The table is our reading; the quote is the rule." Verdict `READINESS.md:84`: "four rules × three brackets, quoted". The sheet draws readings only (`README.md` open question 2). | Either confirm Design's paraphrase, which sets the lock aside for this sheet, or require one quoted line per rule beside the reading. The copy file already keeps quote and reading as separate constants, so adding quotes is a slot, not a redraw (verdict `READINESS.md:8-13`). | **Hugh** |
| 3 | Medium | The lead says "Wizards' post, linked below, has theirs", and the link is the February 9, 2026 post (`sources.ts:16-17`). Fetched as text, that post returned no per-bracket restriction lines. It covers Game Changers and says what the brackets are for. The October 2025 post returned descriptions and the tutor change, but no restriction lines either. | Before ship, `/copy-review` opens the linked post and confirms it carries the rules. The text may sit in an image the fetch could not read. If it does not carry them, point the lead at the post that does, or change "has theirs". If Hugh requires quotes in finding 2, their source comes out of the same read. | eng |
| 4 | Low | The `no limit` chip is drawn at 9.5px `--fg-body`, radius 5, padding 3/8 (`Brackets Sheet.dc.html:69`). The README calls it "the findings' `no limit` chip", which ships at 8.5px `--fg-faint`, `rounded-full`, padding 2/6 (`src/components/decks/findings-block.tsx:115-119`). | Reuse the findings chip's classes, as the README says. The drawn geometry reads as a sketch of it. If Design wants it larger here, they should say so. | eng |
| 5 | Low | The pressed state (`--accent-hover`, a solid underline, a 12% `--accent` tint) is new. The link's sibling opener in the same section, `what would have to go →`, has no hover or pressed treatment (`bracket-climb.tsx:196-205`). | Build it as drawn on this link. The two openers will differ until the sibling adopts the treatment, and this audit records that rather than changing the sibling's scope. | eng |
| 6 | Low | `README.md` says the climb's `Allowances` "already maps" the constants to `allowed(n)` / `noCap`. It maps the per-deck `verdict.limits` and hard-codes `allowed(0)` for mass land denial, counted extra turns and forbidden combos (`bracket-climb.tsx:276-288`). | The sheet is the same for every deck, so build its cells from the constants in `rules.ts` directly. Reuse `climb.allowed` and `climb.noCap` (`deck-analysis.ts:298-300`) for the strings, not `Allowances`. | eng |
| 7 | Low | The lead says "Four rules separate the first three brackets". Mass land denial is 0 at all three (`rules.ts:24`), so it separates them from Optimized, not from each other. | A `/copy-review` item, for example "Four rules limit the first three brackets". Copy does not need a Design round. | eng |
| 8 | Low | The tutors reading says tutors "move no bracket on their own". A tutor on the Game Changer list does count against the Game Changer limit. That was Wizards' stated reason for dropping the tutor rule. | A `/copy-review` item: name the Game Changer route, for example "The strongest are Game Changers and counted there". | eng |

## Engineering notes (not findings)

- **The link does not exist today, so engineering must add the control.** `see all brackets` appears
  in `src/` only in a comment (`deck-analysis.ts:229`), and no `bracketsSheet` key exists. `BracketClimb` holds a
  single `open` state for the upgrade-path sheet (`bracket-climb.tsx:53, 75-82`). The new sheet
  needs its own local state, and the link goes after the rungs box (`bracket-climb.tsx:60-74`).
- **Chrome fits unchanged.** `width: 560 | 700 | 760` already includes 700 (`src/components/decks/receipt-modal.tsx:120, 212-216`),
  and `mark` is optional (`:115`). The phone sheet from 52 and the 43px header are already the chrome (`:157-171`).
  Width arithmetic confirms the choice: at 700 each bracket column is about 168px, and the
  `where your cards are` label needs about 120px. At 560 the column is about 121px (560 − 2 − 36 − 2 − 156 = 364, over 3), less 20 of padding, so the
  label clips, as Design says, though Design's "about 130px" (`README.md:21`, canvas 1b) overstates the column by about 9px; the conclusion stands. At 390 the columns are 88px, and `your cards` fits. `ModalChrome`'s aside is
  12px at `md` against the drawn 11.5, and the chrome wins.
- **Focus returns to the link** through `useDialogA11y`, which records the trigger (`src/lib/a11y/dialog.ts:135, 148`).
- **Tokens are real.** `--surface-raised`, `--surface-sunken`, `--border`, `--border-strong`,
  `--border-dashed`, `--fg`/`-body`/`-muted`/`-faint`, `--accent`, `--accent-hover`,
  `--bracket-1..5` and `--fact` are declared in all six themes in `src/app/globals.css`. The tint is
  mixed over `--surface-raised`, the sheet's ground, rather than the climb's `--surface`, which is
  correct for this ground.
- **Marks exist.** `FindingMark` draws all five rule marks, including the lemniscate and drawn up
  (`src/components/decks/finding-mark.tsx:18-22`). `BracketMark` draws the 22px chip form
  (`src/components/decks/bracket-mark.tsx:74`). Neither needs new assets. The drop's `assets/` are
  reference copies and are never copied into `public/` (AGENTS.md, Design pipeline).
- **The marking is derivable.** `permitsFor` returns exactly `[1,2]`, `[2]`, `[3]`, `[4]` or `[4,5]` (`rules.ts:97-102`),
  and the body's `yours` prop covers those five and no others. `verdict.permits` is already on the
  climb's props. The marking follows permits, not `declared`, which matches the label, "where your
  *cards* are". A stale reading marks its stored permits, as the climb does.
- **Card stacking is not reachable.** No cell names a card, and the only control in the body is the external link.
  `ModalChrome` still registers the sheet for stacking (`receipt-modal.tsx:135`). If example cards
  are added, they inherit the receipt's stacking unchanged.
- **Nothing is drawn that the code cannot produce, and nothing reachable is undrawn**, apart from the
  `[2]` and `[4]` frames, which follow from the drawn `[1,2]` and `[4,5]`.

## Open questions, as Design answered them

1. **Which three brackets:** 1, 2 and 3, plus one Optimized · cEDH row. This agrees with `verdict.limits`, which
   stops at 3 (`src/lib/bracket/types.ts:89`). Accepted.
2. **Quote or paraphrase:** Design chose paraphrase. This conflicts with a brief lock, so it goes to Hugh (finding 2).
3. **Transpose on the phone:** no. The cells hold figures only and fit at 88px. Accepted.
