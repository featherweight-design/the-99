# Readiness audit: the brackets reference sheet (addendum)

## Hugh's rulings (2026-09-24)

Hugh approved this audit on 2026-09-24.

- **Quote or paraphrase (finding 2): both.** Keep Design's plain reading of each rule, and add one short
  quoted Wizards line per rule beside it. This amends the verdict brief's lock, *"the rules text is quoted,
  not paraphrased"* (`docs/superpowers/design-briefs/2026-09-20-the-verdict.md:192`). Finding 3 still
  applies: each quote needs a source that actually contains it.
- **Exhibition contrast (finding 1): back to Design as a revision.** This audit merges now, and the revision
  gets its own re-audit when it returns.
- **R2-A confirmed by Hugh, 2026-09-24:** the sheet is neutral reference, and the reader's bracket stays on
  the climb and the header chip. Revision 2's removal of the reader's bracket marking stands (see R2-A under
  Revision 2).

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

## Revision 2 (2026-09-24)

**Verdict: 🟢 Green.** Re-audited against `origin/main` at `c11785b2` (#920). Both asks are
answered. Nothing goes back to Design. One scope change needs Hugh to confirm it (R2-A below).
Design's files call this drop **R3** and say it answers "Hugh's review of R2". Engineering
received no R2, so this section calls the drop revision 2, after the second intake.

What changed: the sheet is now a reference and marks nothing. It has five bracket columns, and
the grid transposes on the phone. The chrome aside is gone. A notes list under the table holds
each rule's reading and one quoted Wizards line. The climb's yours rung draws its text in
`--fg`. The copy file adds `quotes`, `quoteTag`, `quotedFrom` and `corner`, and proposes two
source constants. One reference asset was added, `assets/bracket-1-exhibition.svg`, and no file
was removed.

### Item 1: Exhibition contrast

**The sheet no longer draws any text in bracket ink.** No column is marked, so nothing is drawn
in `--bracket-1` on a tint, and the `where your cards are` label is gone. The bracket names in the
header are `--fg-body` on `--surface-raised`, which measures 8.18 minimum (eldraine). The
bracket marks are graphics, and `--bracket-1` on `--surface-raised` is 4.26 minimum (kaldheim),
which is over the 3:1 bar for graphics. Finding 1 no longer applies to the sheet.

**The climb uses `--fg` on the yours rung** for the name, the role label, and the Allowances
rule name and count (canvas 2a). The ink stays on the mark, the 1px border and the tint. This is
what finding 1 proposed.

Computed from `src/app/globals.css`. The ground is the code's own:
`color-mix(in oklab, var(--bracket-N) 12%, var(--surface))` (`bracket-climb.tsx:128`,
`YOURS_TINT = 0.12` at `:41`). The mix was done in OKLab, and the ratios are WCAG 2.x relative
luminance.

| Theme | Exhibition, ink (before) | Exhibition, `--fg` (after) | `--fg`, Core · Upgraded · Optimized · cEDH |
|---|---|---|---|
| amonkhet | 4.13 | **12.21** | 11.88 · 11.59 · 11.09 · 10.67 |
| kamigawa | 4.25 | **12.75** | 12.42 · 12.11 · 11.61 · 11.19 |
| ixalan | 4.05 | **11.78** | 11.46 · 11.16 · 10.67 · 10.26 |
| phyrexia | 4.47 | **12.73** | 12.43 · 12.15 · 11.68 · 11.28 |
| eldraine | 4.19 | **11.70** | 11.39 · 11.10 · 10.64 · 10.24 |
| kaldheim | 3.90 | **9.23** | 8.97 · 8.73 · 8.33 · **8.00** |

- **Every cell is at least 4.5:1**, and the lowest is 8.00. Design's own table (canvas 2a,
  `The 99 - Brackets Sheet.dc.html:216`) matches this one to two decimals in every theme.
- **One small correction to Design's text:** `READINESS.md` says "a minimum of 8.73:1 across
  six themes". That figure covers Core and Upgraded. The rule covers every yours rung, and
  Optimized and cEDH go lower, to 8.33 and 8.00 in kaldheim. It is still far above the bar, so
  nothing changes.
- **The climb gets the same answer as the sheet.** The sheet removed its ink text, and the climb
  replaced its ink text with `--fg`. Both leave the rank's colour on non-text marks only.

### Item 2: the quotes

**They are drawn at both widths.** The six notes-list entries each end in a quote: Plex Sans
italic, 12/1.5 at 1300 and 11.5 at 390, in `--fg-body`, in curly quotes. A mono tag follows on
the same line: 9.5px at 1300, 9px at 390, `--fg-faint` (`Brackets Sheet.dc.html`, `quoteStyle`
and `tagStyle`). Canvas 3a draws 1300 and 3b draws 390.

**Where they live:** `bracketsSheet.quotes` in `brackets-sheet · copy strings.ts`. Each is a
`{ text, source }` pair, with `source` either `"intro"` or `"oct25"`. `quoteTag` gives the mono
tag for each source, and `quotedFrom` labels the foot. The readings stay in
`bracketsSheet.readings`, and the tutors and 4–5 readings stay in `tutors.reading` and
`high.reading`. Quote and reading are separate constants, as finding 2 required.

**All six are verbatim.** The posts were fetched raw on 2026-09-24 and each string was matched
as an exact substring of the HTML, including the en dash in `1–3`.

| Rule | Quote | Post | Where in the post |
|---|---|---|---|
| Game changers | "Up to three cards from the Game Changers list." | Feb 2025 | Bracket 3, Deck Building |
| Mass land denial | "you should not expect to see these cards anywhere in Brackets 1–3." | Feb 2025 | The effects paragraph. "These cards" refers back to the sentence before, which defines "mass land denial" |
| Extra turns | "Extra-turn cards should only appear in low quantities and are not intended to be chained in succession or looped." | Feb 2025 | Brackets 2 and 3, Deck Building |
| Two-card infinites | "No intentional early-game two-card infinite combos." | Feb 2025 | Bracket 3, Deck Building |
| Tutors | "remove the tutor restrictions from Commander Brackets entirely" | Oct 2025 | A fragment of "…the avenue we'd like to take is to remove the tutor restrictions from Commander Brackets entirely and rely on Game Changers to catch the most efficient tutors." |
| Optimized and cEDH | "There are no restrictions (other than the banned list)." | Feb 2025 | Brackets 4 and 5, Deck Building |

**Sources.** `src/lib/bracket/sources.ts` has one source today, `BRACKET_RULES_SOURCE`
(`sources.ts:14-20`), the February 9, 2026 update at
`https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-february-9-2026`.
That post carries none of these lines as text. The raw HTML has no `Deck Building`,
`Extra-turn`, `two-card infinite` or `mass land denial`. Design says so in the copy file and
proposes two constants for `sources.ts`. Both check out:
- `BRACKETS_INTRO_SOURCE`: `https://magic.wizards.com/en/news/announcements/introducing-commander-brackets-beta`.
  Its page title is "Introducing Commander Brackets Beta", and it is dated 2025-02-11.
- `BRACKETS_OCT25_SOURCE`: `https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-october-21-2025`.
  Its page title is "Commander Brackets Beta Update – October 21, 2025", with the en dash.

**Verified:** all six quotes are verbatim. **Not verifiable from Wizards' text:** whether the five
February 2025 lines are still current word for word. The February 2025 post was not revised in
place: it still carries the tutor restriction that the October 2025 post removed. Neither later
post restates these restrictions as text. Every quoted line agrees with `rules.ts`
(`GAME_CHANGER_LIMIT[3] = 3`, `MASS_LAND_DENIAL_LIMIT = 0`, `COMBO_POLICY[3] = earlyGameOnly`,
extra turns uncounted at 2–3, and 4–5 unrestricted). The October 2025 combo guidance, "not ones
that tend to happen in the first six turns", also agrees. The quotes are accurate to their
posts, and the `Feb 2025` tag dates each one. The residual risk is the one Design's
`READINESS.md` "Check before ship" item 1 already hands to `/copy-review`.

### Earlier findings, carried forward

| # | Status after revision 2 |
|---|---|
| 1 | **Closed.** See item 1. |
| 2 | **Closed** by Hugh's ruling and item 2. |
| 3 | **Closed.** The lead no longer says the linked post "has theirs". It reads "…with one line of Wizards' own under it", and each quote is tagged with its post (`Wizards · Feb 2025` or `Oct 2025`). The tag itself is not a link. The two posts are linked once, in the foot's `Quoted from` row. |
| 4 | **Closed.** The chip is now 8.5px mono uppercase, 0.1em tracking, `--fg-faint`, a `--border-strong` border, fully round, with 2/6 padding. That is exactly `findings-block.tsx:115-117`. |
| 5 | Open, eng, unchanged. The link's pressed state is new and its sibling opener has none. Build it as drawn. |
| 6 | **Closed in `READINESS.md`**, whose engineering item 3 builds cells from the constants. `README.md:76`, in the kept R1 section, still says `Allowances` "already maps" them. Treat R1 as superseded. |
| 7 | **Closed.** The lead was rewritten. |
| 8 | Open, `/copy-review`. The tutors reading still says tutors "move no bracket on their own". The October 2025 quote now sits under it, and that quote goes on to "rely on Game Changers to catch the most efficient tutors", so the Game Changer route is still worth naming. |

### New in this revision

| # | Sev | Evidence | Correction | Owner |
|---|---|---|---|---|
| R2-A | Confirm | The original ask included "The reader's own bracket" (this audit's first table). The revision removes it: "No reader marking on the sheet" (`READINESS.md` R3 change 1, `README.md:7-8`). Design attributes this to "Hugh's review of R2", and engineering has no record of that review. | Hugh confirms the sheet marks nothing. If he does, nothing changes: the body needs no `permits`, and the first audit's note "The marking is derivable" no longer applies. This is a confirmation of a stated ruling, not an open one, so it does not hold the verdict. | **Hugh** |
| R2-B | Low | Two quotes open mid-sentence in lower case: mass land denial ("you should…") and tutors ("remove the…"). Both are verbatim. | A `/copy-review` item: keep them as they are, or add a leading ellipsis. Do not capitalise, because that would stop them being verbatim. | eng |
| R2-C | Low | The quote tag, `Quoted from`, the `cards allowed` corner and the `no limit` chip are `--fg-faint` on `--surface-raised`. That measures 4.41 in amonkhet, 3.70 in kamigawa, 4.62 in ixalan, 3.93 in phyrexia, 4.59 in eldraine and 4.37 in kaldheim. The foot links are `--accent`, which is 4.14 in phyrexia and 4.25 in kaldheim. | These are the app's existing metadata and link tiers, and the findings chip and the provenance date already ship in them. They are not something this sheet introduced. The tag repeats what the foot's links already carry. This is recorded here, and it does not gate the sheet. The same tier on the yours rung's tint, the Allowances `allowed` label, measures 2.94–4.21. That is pre-existing and out of this revision's scope. | eng (note) |

**Checked and fine:**
- **Five columns at 1300.** ModalChrome 700 leaves about 98px per column. That is 700 minus 2 of
  border, 36 of padding, 2 of table border and 168 for the row header, divided by five. That fits
  `Exhibition` nowrap at 12/600 with 16 of padding.
- **The 390 transpose.** Rule columns are about 60px: 390 minus 32 of padding, 2 of border and
  116 for the row header, divided by four. The longest word in a label, `INFINITES` at 8.5px mono,
  is about 49px plus 8 of padding, which fits. This reverses R1's answer to open question 3. The
  reason given holds: five columns would be about 53px, which is narrower than `Exhibition`.
- **The 20px chips** in the 4–5 notes entry resolve to the chip form (`markForm`,
  `src/lib/bracket/mark-size.ts:17-20`).
- **The chrome.** ModalChrome's `aside` is optional (`receipt-modal.tsx:117`), so dropping it
  needs no new prop.
- **Fact marks in `--fact`.** The canvas now agrees with `FindingMark`, which the app already
  drew correctly.
- **The new asset.** `assets/bracket-1-exhibition.svg` is a reference copy only and is never
  copied into `public/`.
