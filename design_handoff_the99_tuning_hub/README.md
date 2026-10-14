# The 99 — Tuning hub (design handoff, R1)

`design/design_handoff_the99_tuning_hub/` · 2026-10-09 · mirrors `design_handoff_the99_deck_tuning/`

**Status: R1, approved (LGTM, Hugh, 2026-10-09)** after four feedback rounds (tool marks, landing, Mana Balance, Proposed cuts + History), recorded below. Geometry, tokens and component reuse are final. Card names, deck names and figures are illustrative but arithmetically consistent across the three canvases: HD Gishath, one commander, 105 cards (six over), four locked, 31 green pips against 14 green sources.

**R2 addendum (2026-10-10): Proposed cuts is model-first. Approved (LGTM, Hugh, 2026-10-10).** Canvases A and B are unchanged. See "R2 · Proposed cuts, model-first" below.

Source of truth: `docs/superpowers/design-briefs/2026-10-08-tuning.md` (main), §"What this brief asks Design to draw" items 1–7. Read alongside: `src/components/decks/{tuning-panel,manifest-rows,suggestion-card,role-counter-strip,role-counter-cell,builder-spine}.tsx`, `src/lib/copy/{deck-tuning,decks-builder,help-me-choose,credits}.ts`, and the `deck_tuning`, `over_99`, `deck_stats_mana` and `help_me_choose` handoffs.

**About these files.** The canvases are design references built in HTML. Open them with `support.js` beside them, then rebuild in the app's stack. They pin the Kaldheim values the latest canvases use. **No new tokens, no new motion, no new dependencies.**

| File | Holds |
|---|---|
| `… (R1) · A Landing, shortcuts and the strip.dc.html` | A0 the calls. A1 landing (offered), A2 Proposed cuts not offered, A3 a run in flight on the landing, A4 a tool open (Suggested changes inside the hub), A5 Your deck: trim-line link, land-cell caption, the strip in one place, A6 what resets the view. |
| `… (R3b) · B Mana Balance, full view.dc.html` | **Build target for Mana Balance.** F3 is the folded view on open, F1 each section open with help for green, and F2 the door and color step. |
| `… (R3a) · B Mana Balance, pointer.dc.html` | The rulings per deck: Gishath, Aang, Blood Rites, Wizards (step skipped), Eldrazi (no door). |
| `… (R3) · B Mana Balance, evidence.dc.html` | Thin and failed states, staples and trades, About entry. M1–M2 the evidence (Gishath, Wizards), M3 pattern rows, M4–M5 help from pick to result (Gishath green, Aang blue), M6–M9 thin states, M10 the About entry. |
| `… (R1) · B Mana Balance.dc.html` | B1, B1b, B6, B7 superseded by R3; B8 stands; B2–B6 out of scope; B10 is Suggested changes. |
| (R1 B, as it was) | B1 free result with Look deeper on top, B2 deeper running, B3 deeper result above the count, B4 deeper refused, B5 deeper failed, B6 credits used up + an applied suggestion, B7 thin EDHREC data, B8 the count failed, B9 counted fact vs hedged claim. |
| `… (R2) · C Proposed cuts and History.dc.html` | **Current.** C1 the count (free, no list), C2 deeper running, C3 six named, C4 part answered and short, C5 thin data, C6 refused (deeper, all locked), C7 failed, C8 back to 99, C9 counted fact vs model claim. H1–H4 History (R1, Cuts summaries updated). |
| `… (R1) · C Proposed cuts and History.dc.html` | Superseded by R2 (2026-10-10), kept for the record. C1–C3 drew the withdrawn free ranking. |
| `TuningToolMark.dc.html` | The four tool marks, as one component (`tool`, `size`, `ink`). Imported by all three canvases. |
| `STATES-tuning-hub.md` | Every state per tool, with its Must-nots. |
| `READINESS.md` | Self-assessed readiness and the open items. |
| `tuning-hub · copy strings.ts` | Proposed additions to `src/lib/copy/`. The `cuts` block is R2; retired R1 keys are listed in it. Placeholders; `/copy-review` resolves wording. |
| `design-tables/tuning-hub.md` | New property tables. **Commit to `docs/superpowers/design-tables/tuning-hub.md`**, beside `deck-tuning.md`, not inside it. |
| `brand/` | Locked brand sheet + README, copied for self-containment. `support.js` is the canvas runtime. |

Every frame is drawn at desktop 900 and phone 390. No About entry this round (brief §8).

---

## Design's three calls

### 1 · The landing: four tiles, fixed order, each says its cost
The last section of the Analysis tab, under its own rule, where Suggested changes is now (ruling 2). Mounted with the reading, absent before one, exactly as the panel is today. Heading `Tuning` (display 19 / 17). Four tiles in a fixed order: Suggested changes, Mana Balance, Proposed cuts, History. Desktop 2 × 2, phone stacked. Each tile has a name, one purpose line, a cost tag (`1 credit a run`, `free · look deeper 1 credit`, `free`), and one status fact (last run and what came of it, a running run, or `this deck is 6 over`).

**Proposed cuts at 100 or under is present and inert**, not absent: dashed `--border-dashed`, no fill, `--fg-faint`, no chevron, not focusable, its purpose line says why (`Offered once the deck passes 100 cards. This one is at 100.`). The grid never reflows when a deck crosses 100.

**Opening a tool** replaces the tiles in the same area, with no route change. Desktop gets an underline tab row (`All tools · Suggested changes · Mana Balance · Proposed cuts · History`), deliberately unlike the deck tabs' filled pills. The phone narrows to the tool with a 44px `‹ Tuning`; there the landing is the switcher.

### 2 · Shortcuts: two, both on Your deck, each on the fact that explains it
- **The trim line gains `Proposed cuts →`.** "Six over the ninety-nine. Cut six and it is legal." is the shipped over-99 line, from the same figure as the Over pill (ruling 4). Mono 11.5 `--accent` after the sentence on desktop; its own 44px line on the phone. It stays above the rollup bands and the unresolved line, where those already sit. This closes over-99's gap 2.
- **The land cell gains `balance mana →`** (`balance →` at 390) whenever Mana Balance's free count finds a color short, met or not. The cell is the control, so a cell takes one action: never both links. Land's Consider shelf stays on the Consider tab.
- Both switch to Analysis, open the tool, scroll the Tuning heading to the top and focus the tool heading. Same tool, same History.
- **Not added:** Deck Stats' Mana colors card and Analysis findings don't link in. See open 2.

### 3 · A running tool shows on the landing (§7)
On its own tile only: a 1px `--accent` border, the manifest's writing dot, the tool's own status words and elapsed time (`reading your deck · 0:14`, `looking deeper · 0:09`). History counts it (`14 runs · 1 running`), and on desktop the tool's tab carries the dot. No banner and no disabled tiles. Pressing the tile opens the running state, with Stop. Why: a credit is being spent and the run outlives the view, so silence would read as loss.

### Feedback 1 (Hugh) · each tool has its own mark
`TuningToolMark.dc.html` (canvas A, section A0b). There are four one-ink marks, each built from the brand's own primitives (the crown's diamond, the upright card, the pip disc). No icon set is added.
- **Suggested changes:** a swap. Outlined card, diamond, filled card.
- **Mana Balance:** a balance. Two pips on a beam over a diamond fulcrum.
- **Proposed cuts:** a solid card split by one diagonal gap (the glyph direction, M-B, ruled by Hugh in feedback 3; the other three stay geometric, M-A). The organic direction (M-C) was set aside as too obtuse. All three directions stay in A0c as history.
- **History:** a ledger. Three ruled lines, each led by a diamond, the newest filled.

**Sizes:** 20 on landing tiles; 14 in the tab row, the phone header, History rows and filter chips; 16 in a 28px accent plate when a mark stands alone.

**Ink:** the text's color (`--fg-body` at rest, `--fg-locked` when inert, `--accent` while running or active).

**Usage:** always beside the name, `aria-hidden`. In History the mark plus a short name (Suggested / Mana / Cuts) replaces the mono tag. Marks don't appear inside a tool's own panel heading. Rebuild each as a 24-unit inline SVG component.

### Feedback · Proposed cuts + History (Hugh)
- **Going over is fine.** Mana Balance's tally stays in its ordinary ink; past 100 it offers `Proposed cuts →`.
- **Always overage + 2 candidates:** six over means eight. The count is set when the list is ranked, and it doesn't shrink as cards are cut.
- **Look deeper on Proposed cuts:**
  - **Offer:** the band at the top of the shortlist (C2), same button-with-segment as Mana Balance.
  - **Running (C8):** the shortlist stays live under it.
  - **Done (C9):** above the shortlist, which stays unchanged. Each line names one candidate (cut it first / keep it), with a Suggestion, Checked or Unchecked tag and citations.
  - **Refused and failed:** B4/B5's shapes.
- **History:**
  - **Scroll:** the list scrolls in its own container (420 desktop / 460 phone), with sticky month headings and a fade at the foot.
  - **Deeper looks:** each is its own row with a filled accent `◆ deeper look` pill. Paid Suggested changes runs read `◆ 1 credit`, free runs read `free`, and `free + 1` is retired.
- **Failure icon** sits beside the heading on the phone (C7b, H4b) and no longer wraps above it.
- **Copy cut:** "this run is in History" and "This shortlist stays in History". C4 has no action row.

### Feedback · Mana Balance (Hugh)
- **Credit cost lives inside the button.** `Look deeper │ ◆ 1 credit` is one control with a segment after a rule. The standing line under it reads `2 of 3 credits left · next one at …`. When spent, the segment drops, the button disables and the line says `0 of 3 credits left`. The separate `1 credit` / `0 left` tags are gone. `Try again` after a failure carries the same segment.
- **Mix and match: superseded.** Suggestions are now **two lists, Additions and Cuts** (Hugh, feedback). Each line has its own counted reason and its own `Add`/`Cut` · `Reject`, and `Apply all` takes every open line. A tally in the section head (`+4 in · −4 out · stays at 105`) recounts on every answer and turns `--warning` when the total would move. The rebalance / for-ramp / staple kinds are retired: a staple is an Addition with a dashed thumbnail and dot, plus the buy tag. **Suggested changes takes the same shape** (B10): one reason and its citations per line (open 8). The per-half picker drawn earlier is withdrawn.
- **Legend** is now Deck Stats mana's own (dashed rule, solid and striped swatches with counts), plus the tick (`Covers the cost`). `1 not counted ⓘ` holds the card name in a tooltip. The dork caveat is one short line.
- **Columns:** Color · Cost · Sources · Status.
- **Failure tags are an icon everywhere:** a 16-grid filled disc with the `!` cut out, in `--danger`, with the old tag text as its `aria-label` (`Didn't finish`, `Couldn't count`, `Couldn't rank`, `Couldn't load`). History's `failed` outcome carries the same disc at 13px.
- **Stop:** open for engineering (open 6).

### R2 · Proposed cuts, model-first (Hugh, 2026-10-09)
Source: `docs/superpowers/plans/2026-10-09-proposed-cuts-model-tier.md` (main; the `cuts-model-plan` branch is gone). The free ranking caught 10 of Hugh's 58 cuts across five decks (1.1x chance) and 0 of 14 net reductions, so it is withdrawn rather than reworded.
- **The free pass names no card.** C1 shows the over-99 lead, Look deeper, and `What we counted`: role overages, curve crowding, bracket flags and EDHREC spread. Each row has a source, a label, a mono figure and a comparison. These are the model's input, shown as they are. A bracket flag shows only against the declared bracket.
- **Look deeper is the primary action.** It comes first in the panel, filled `--accent` with `--bg` ink, and is the hub's only filled button. It keeps the `◆ 1 credit` segment and the standing credit line. The offer's lead says what it reads.
- **The over tally is neutral.** The over-99 lead and per-role overages are `--fg` / `--fg-muted`, never `--warning`, per Hugh's earlier ruling.
- **Results (C3).** Exactly the overage is asked for, and 1 to N are accepted. Each line has the Suggestion tag, the card, one sentence and chips, in Suggested changes' citation pattern. Each chip quotes a figure from the count word for word. There's no bracket claim in prose, and no adds. Cut / Keep work as in R1 decision 8. The count stays below, recounting as cards go.
- **A shortfall is shown, never padded (C4).** A dashed slot says a line was dropped and why. No second call is made.
- **Counted fact vs model claim (C9).** They differ in four ways: shape (ruled row vs filled card), tag (source only vs `Suggestion` pill), type (figure vs sentence + chips) and words (counts vs names a cut). They meet in the chip. Checked/Unchecked aren't used, because every surviving line has passed the figure check.
- **Retired from R1:** overage + 2 candidates, `Rank again`, `Show N more`, the rank number, "The shortlist, unchanged", and `Couldn't rank` (now `Couldn't count` / `Didn't finish`).
- **Frame ids are renumbered.** R1 C8 → C2, C9 → C3, C3 → C4, C4 → C8. C5–C7 keep their numbers. C1 and C9 are new.

## Other decisions

1. **Navigate away = leave the Analysis tab, leave the page, or reload.** Each resets to the landing. Switching tools, opening History and Re-analyze don't. Runs survive all of it (A6).
2. **Suggested changes is unchanged inside.** Same manifest, cards, states, action row and credit line. Its own Metamorphous heading stays, so the landmark is unchanged.
3. **Mana Balance tier 1 is its own ready state.** Opening it counts, with no button, no manifest and no running frame. Look deeper is the first thing in the panel: `Want a closer read?`, a lead, a `1 credit` tag, a brass-outline `Look deeper`, and the shared credit line under it (Help me choose's pattern).
4. **The source table counts every kind.** Lands are solid in the color's ink; rocks, dorks and land search are striped after them (Deck Stats mana's vocabulary). A tick marks what covers the pips. Figures read `have of covers`. Dorks get a counted caveat line, and unreadable cards get a dashed "not counted" line.
5. **Three suggestion kinds, three shapes.** Rebalance and For ramp are swaps (struck cut → add). A **Staple has no cut side**: a `+` glyph, a dashed thumbnail and a dashed dot (not in the deck), plus the buy tag if unowned. Its kind line says `not in your deck, no cut named` and its after line says the deck grows. Each suggestion carries a **counted strip** (current, target, after).
6. **Deeper result sits above the count, never over it.** The count stays below under `The count, unchanged`. One deeper look per version of the list.
7. **Counted vs hedged** (B9). Three carriers, so color is never the only one:
   - **Tag:** `Checked` is a solid pill in `--fg-body`, `Unchecked` a dashed pill in `--fg-faint`. Both are 86px in the same slot.
   - **Ink:** body vs muted.
   - **Words:** a hedge says *may* and names its uncertainty.

   A deeper suggestion is tagged `Suggestion` in accent. Figures a hedge leans on go in chips, never in its claim. A `CARD TEXT · checked` chip marks an oracle-verified rules claim.
8. **Proposed cuts: one reason a card, as one chip.** There are four new chip sources: `EDHREC` / `ROLE` / `CURVE` / `BRACKET`. Each value carries a denominator or a comparison. **Cut commits immediately** (an edit, like Apply), Keep collapses, and nothing reorders. `Rank again` appears once something's answered. The never-cut guarantee is one foot line naming the commander and counting the locked cards. At 99 the tool finishes in place and its tile goes inert.
9. **Proposed cuts gets a loading frame behind a 400ms delay.** It ticks the manifest rows, with no fan and no Stop (nothing to refund).
10. **History is flat, newest first, under month headings, with a single-select tool filter.** It loads 20 a page. Each row has fixed slots: date, tool tag (`SUGGESTED` / `MANA` / `CUTS`), tier (`free` / `1 credit` / `free + 1`), summary, and outcome (`ok` quiet, `refused` / `stopped` neutral, `failed` `--danger`, `running` `--accent`). A row opens read-only inside History, with a dashed note counting how far the list has moved since.

## Open — for Hugh
1. **Curve weighting.** The brief has Mana Balance weight pips by curve. Deck Stats' Mana colors dropped it (Hugh, 2026-10-09). If both ship as drawn, the same deck shows two different pip figures for green. Design drew the `asked for` column without saying "weighted". Pick one, or label the difference.
2. **A third door.** Deck Stats' Mana colors card is the other place a short color shows. Design left it unlinked to keep "one home" tight, but it's the most natural `Balance mana →` after the land cell.
3. **Free runs in History.** Recording every open of a free tool floods History. The rule drawn: one row per tool per version of the list (list fingerprint). Confirm, or record free runs not at all.
4. **Staple adds go over.** A Staple names no cut, so on a 99-card deck it takes the deck to 100, which offers Proposed cuts. Drawn honestly (`adds without a cut · the deck goes to 106`). The alternative is for tier 1 to pair every staple with a cut, but that's a tier-2 judgement.
5. **Tab names.** The brief says "Your deck, Your games". The shipped tabs are `Your deck · Analysis · Consider` (`addPanelCopy.tabs`). The reset rule is drawn against the shipped three.

6. **Stop on a deeper look.** Hugh questions whether Stop belongs at all. As drawn, it refunds (Help me choose's pattern). Without it, the running band is just the running line and the credit is spent on press. Engineering's call: compare with how often a stop would beat the response.
7. **Answered lines in History and the eval.** History records lines (`3 added, 2 cut, 1 rejected`). The golden-deck eval should score suggestions as returned, not as applied.
8. **Suggested changes as two lists** changes the model contract. Today it gives one rationale per swap; this would need one rationale per card, each with its own countable citation. The validator's rules carry over line by line.

9. **Re-offer after cuts from a result (R2).** As drawn, Cut or Keep pressed inside a deeper result doesn't bring the Look deeper offer back, even though each Cut changes the list version. Otherwise every cut would invite another credit. Any other edit does bring it back. Confirm, or re-offer on every version.
10. **Canvas A, not redrawn.** The A1 tile's `this deck is 6 over` status is drawn in `--warning`; build it in `--fg-muted`, per the neutral-tally ruling. A0's "with a ranked list" note is historical. The tile purpose and running words are updated in the copy file (`Counts where the deck runs long. A deeper look names the cuts.`, `counting`).

## Notes for engineering
- **New:**
  - `TuningHub` (landing + switch + phone back) and `ToolTile` (ready / running / inert).
  - `DeeperBand` (offer / running / note / spent), `DeeperResult`, `KindTag` (Checked / Unchecked / Suggestion), `CountedStrip`, `ManaSourceTable`, `BalanceSuggestion` (rebalance / ramp / staple).
  - `CutRow` + answered rows (reuse `AnsweredRow` tones), `HistoryList`, `HistoryRow`, `PastRun`.
- **Changed:**
  - `TuningPanel` mounts inside `TuningHub`, unchanged.
  - `RoleCounterStrip` loses `inset` and its Analysis mount (`builder-shell.tsx:1611`). `RoleCounterCell` gains a land-only `onBalanceMana` that takes the cell's one action and caption.
  - `BuilderSpine`'s trim line gains `onProposedCuts`.
- **View state** (`openTool`) lives in the hub and resets on the Analysis tabpanel's unmount. Runs are read from the ledger on mount, so a running run reappears on its tile.
- **Credits:** Look deeper uses `creditsCopy.first` / `spent` / `paused` with the deeper-looks flag. Stop and failure refund, as Help me choose does.
- **Live region:** the existing one, one message per settle per tool. The landing announces nothing.


---

## R3 · Mana Balance, evidence (2026-10-10, for review)
Source: `docs/superpowers/design-briefs/2026-10-10-mana-balance-evidence.md`. Hugh's ruling: evidence, never a verdict. Canvas: `… (R3) · B Mana Balance, evidence.dc.html`. Fixtures are the brief's, with full deck ids; Gishath's figures are the golden check's.

**Design's calls on the five open questions**
1. **`balance mana →` appears on the land cell whenever the deck has a colored pip,** unless the strip's own land count is under its target with a shelf, which keeps `consider →`. It's a door to the evidence, not an alarm. A colorless deck draws a dash.
2. **Pips lead with the commander,** as the Colors card does, so the two surfaces show one number. The figure without it sits under it in mono (`55 without Gishath`), only when it differs. That's Deckcheck's figure, so a player comparing tools finds it.
3. **Help rows stay as information this round.** No Apply, Add or Cut. Card names open the card detail; a to-buy staple carries the BuyTag and the link-out. An apply would read as a recommendation the engine doesn't make, and rebalance's `up to N` would need a quantity choice. If Hugh wants it, it's the deck's existing swap action in the row's right slot.
4. **The citation lives in two places:** `Karsten` by name on every column, row and caption that carries one of his figures, and the full citation once, as the panel's last line, with the link. That line also names the land count as his Commander formula, with its quoted constants, and says his figures are a reference, not a target.
5. **An empty staple list doesn't explain itself:** one neutral dashed row, `No staples to show for green.` No build task asked.

**Other calls**
- **The evidence comes first; help comes last,** under its own card, with a color picker that shows only the commander's identity. Tapping a color is the request. Nothing is suggested before it.
- **Hardest costs shows one color at a time,** behind color chips (default: most pips). Three colors × six rows was 18 rows on a phone.
- **Trades are folded into the staple rows** as each staple's trade line (the engine builds trades from the staple list, in its order). That gives one list, owned first.
- **No figure is tinted, ordered or marked by comparison.** Karsten's figure sits in the same ink as the deck's count.

**Retired from R1 B:** the Status column, the covers tick, `have of covers`, the Additions/Cuts lists with Apply all and the tally, B7's thin-EDHREC sentence, and the `whenever a color is short` trigger.

**Needs from engineering:** `MANA_BALANCE_ENABLED` added to `AboutSwitch` for the About entry (M10). The entry rides the Tuning line's batched close-out bump.


## R3a · Needed, one door (2026-10-11, for review)
Hugh's rulings: `You have · Needs` with a `Needed` column, and one `Improve my mana` door. Ruling 1 was revised the same day: **no lead line**, and the pointer is only the color step's order (tightest first, nothing chosen). Canvas: `… (R3a) · B Mana Balance, pointer.dc.html`. Fixtures: uploads/mana-pointer-calibration-2026-10-11.md (Blood Rites `783df427-d0c5-456a-805e-cdc94ecb0952`).
- **Open call:** the explanation is an inline tap-open line, under Hardest costs and in the step, not an InfoTip per row.
- **Wizards:** the step skips itself. **Eldrazi:** no door.
- **The color table's Needed** uses the step's rule (tightest cost shared by 2+ cards), so the two agree.
- **The whole view** is `… (R3b) · B Mana Balance, full view.dc.html`: Gishath top to bottom at 900 and 390, opened on green, plus the door closed and the step. The explanation matches the shipped `StripRationale` disclosure and cites the article.

## R3b · full view (2026-10-11, LGTM)
`… (R3b) · B Mana Balance, full view.dc.html` is the build target.
- **Hardest costs and Lands** fold using Consider's shelf header, folded by default and remembered per deck. That puts Improve my mana about one and a half phone screens down, rather than four.
- **Not hoisted:** putting the door above the table would open on "fix your mana" before the count, which is a verdict. If people miss it, add an "Improve my mana" link next to the title that scrolls to the door. That's smaller than moving it.
- **Copy strings:** `mana-balance R3 · copy strings.ts` (current).
