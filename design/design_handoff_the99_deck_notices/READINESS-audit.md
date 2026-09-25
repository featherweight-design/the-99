# Readiness audit: deck notices (sub-project 9), R1

**Audited:** 2026-09-23, against `origin/main` at `dac4fd5c`. Every file:line below was read on that commit.
**Brief:** `docs/superpowers/design-briefs/2026-09-23-deck-notices.md` (§2 and §5 locked, §4 open, §6 engineering's).
**Package:** this folder, committed as delivered. Design's own `READINESS.md` is answered in §5 below.

## Hugh's rulings (2026-09-24)

Hugh approved this audit on 2026-09-24 and ruled on all six §4 questions, so nothing below blocks the build.
H5 and H6 were settled by the orchestrator as the only defensible answers, and both are engineering's.

- **H1: Re-analyze recomputes when the data under the deck changed since its analysis, even on an unedited
  list.** It is free (no model call) and clears the notice. An unedited deck with no data change still returns
  the stored reading. This amends ruling 5, and it unblocks F1: build F1's correction as written.
- **H2: the notices sheet's foot offers Re-analyze too.** This amends the analysis tab's "only the banner offers
  it". F2 and F3 stand as corrections to that press.
- **H3: an illegal deck's SAVED overview stays shown**, with a "not legal right now" warning. It is never
  withheld. Writing a NEW overview still follows the earlier ruling that Analyze is disabled on an illegal deck.
  The lane's plan confirms how the two interact.
- **H4: a notice-driven re-analysis updates the bracket only.** The saved overview stands, marked as possibly out
  of date, with *Write a new overview*.
- **H5 (orchestrator): `Not legal` must clear 4.5:1.** The same treatment applies to the existing `Over` pill:
  text in `--fg`, with red on the border and tint only. This is engineering's, not Design's, and it replaces
  F17's "does the `Over` precedent cover it" question.
- **H6 (orchestrator): last played on the phone tile is accepted**, as HANDOFF §1a draws it.

## Verdict: Orange

Build it, with the engineering corrections below. Design answered all seven §4 questions, nothing contradicts a
§2 or §5 ruling, and every state is drawn at 390 and 1300 with two small exceptions eng can derive (F14). Nothing
goes back to Design. Six decisions go to Hugh (§4), and one of them (H1, behind F1) blocks the build as specified: without it
the notices foot's Re-analyze clears nothing.

---

## 1 · Against the brief

### The seven §4 questions

| § | Question | Design's call | Where |
|---|---|---|---|
| 4.1 | Where the notice sits; no chip | A hairline tag right after the bracket chip in the chips row. With no chip it takes the chip's slot after the status pill, and on a chip-less deck it can only read `Not legal` | HANDOFF §1, §1a |
| 4.2 | The container | A fifth `ModalChrome` body, 560 wide | HANDOFF §2 |
| 4.3 | Acknowledgement | Reading quiets data notices and re-analysis clears them. Legality entries stay until the card leaves | HANDOFF §3 |
| 4.4 | Notice vs banner | Nothing is added in the tab. The tag sits in the header, and the banner stays the only line about the reading's age. They differ in form, ink and wording (table) | HANDOFF §5 |
| 4.5 | Group order, direction | Legality first, then the findings' kinds, then rules. Direction is a word, never +/− or green/amber | HANDOFF §2 |
| 4.6 | The pre-synopsis check | Withheld, not warned; the note takes the credit note's slot | HANDOFF §6 |
| 4.7 | Dates | Data entries carry the publish day; legality entries carry none | HANDOFF §2, §4 |

All seven are answered.

### §2 and §5

Nothing contradicts a locked ruling. The notice never re-analyzes and never sets `dirty`. It makes no prediction:
the foot says *Nothing here moves it on its own*, and the rules entry says what the rule now reads. No second stale
banner is drawn in the tab. Only the deck's own cards are named. Legality rides the same surface, and analysis still
runs on a deck that holds an illegal card (§2.7). The one amendment Design makes is to the **analysis tab's**
"re-analysis is offered only by the banner" (`design_handoff_the99_analysis_tab/HANDOFF.md:57`), not to this brief.
It is Design's READINESS item 1 and goes to Hugh (§4).

### Widths

Every deck-page state mounts `Deck Page 1300` and `Deck Page 390` (`The 99 - Deck Notices.dc.html:67-74, 124-129,
165-166, 206-207, 228-229`) except row 7 (`legalChip`, canvas 4b). 4b draws the `legalChip` sheet at 560 and the page
at 390 only (`:183-184`). Its missing halves are drawn elsewhere: the 1300 header with a chip and `Not legal` is in 6b and 6c,
which carry an analysis, and the phone sheet with legality groups over data groups and a Re-analyze foot is the
`all` variant (`:119`). The sheet is drawn at 560 and 390 in the `all`, `data`, `dirty` and `legalNoChip` variants.
The tile is drawn at 340 and 358 (`:86-97`). Gaps: F14.

### About entry

**Present:** `ABOUT-entry.md`, drawn on the canvas at §2c. The brief's §7 left it undrawn; Design drew it at
Hugh's instruction. It joins the analysis line's launch batch (`since: 10`, one bump). Per the batching rule no bump
is demanded here. One stale figure is in F15.

---

## 2 · Against the code

### Surfaces

| Surface | As described? | Evidence |
|---|---|---|
| Deck header chips row, bracket chip | Yes. Pill then `SpineBracketChip`, `flex-wrap`, gap 8, both widths | `spine-desktop.tsx:448-457`, `spine-mobile.tsx:79-89` |
| Chip's 44px hit area by `after:` inset | Yes | `bracket-chip.tsx:80` |
| Header press lands on the Analysis tab | Yes. `setView("analysis")` is the hook for the foot's *Analysis tab →* | `builder-shell.tsx:867` |
| Tile chip cell after `StatusPillBadge` | Yes, but it **wraps**, deliberately (see F5) | `deck-card.tsx:520-534` |
| Tile footer "four grid-area maps" | Yes, four | `deck-card.tsx:499-511` |
| Tile last played, desktop only | Yes. The handoff shows it at both widths (HANDOFF §1a, `HANDOFF.md:42`; §4 H6) | `deck-card.tsx:580` |
| `ModalChrome` at 560, phone sheet from 52, 43px header, `backLabel` | Yes | `receipt-modal.tsx:120, 110, 157-159, 171` |
| Card names stack `CardModal` on the sheet | Yes, via `registerSheet` | `receipt-modal.tsx:133-135` |
| The Re-analyze banner | Yes. It is also drawn while ANY press is loading or failed over a held reading (F2) | `analysis-panel.tsx:82-92`, `analysis-banner.tsx:32` |
| The credit note, the Overview, *Write one* | **Not on main.** The synopsis is a contract only (#901, `src/lib/synopsis/`) and the panel draws no overview (`analysis-panel.tsx:30-34`). HANDOFF §6 targets surfaces sub-project 6 builds | F12 |
| `BracketChip face={false}` | **No such prop.** It comes from the Home bracket-chip addendum, which is not on main | `bracket-chip.tsx:20-27`; F9 |
| `ProfileLegality` | Yes, and nothing draws it | `types.ts:282-288`, `build.ts:392-403` |

### Tokens

Every token the package uses is declared in all six themes in `src/app/globals.css`: `--fact`, `--danger`,
`--fg-locked`, `--border`, `--border-strong`, `--bg`, `--surface`, `--surface-rail`, `--surface-raised`,
`--surface-sunken`, `--surface-inset`, `--elevated`, `--fg`, `--fg-body`, `--fg-muted`, `--fg-faint`,
`--fg-disabled`, `--accent`, `--accent-hover`, `--success`, `--warning` and `--bracket-4`. Each was grepped as a
`--x:` declaration, and each appears 6 times. `--display` is the canvas's own local variable; the code uses the
`font-display` class. `check:tokens` was not run: no source changes in this PR.

### Assets

The seven non-ink bracket files match `public/brackets/` byte for byte once the `<metadata>` block is stripped
(`bracket-1-exhibition`, `-2-core`, `-3-upgraded`, `-4-optimized`, `-4-optimized-chip`, `-5-cedh`, `-5-cedh-chip`).
The `*-ink.svg` files and `fact-*.svg` are for the frames only. The code draws fact glyphs through `FindingMark`
(`finding-mark.tsx:18-23`), never from files, so nothing in `assets/` ships.

---

## 3 · Findings

| # | Sev | Evidence (origin/main) | Finding and correction | Owner |
|---|---|---|---|---|
| F1 | **High** | `stored.ts:30`, `:244-247` | **Re-analyze on an unchanged list does not recompute (ruling 5).** It clears `dirty` and returns the stored row. A notice-only deck is by definition an unchanged list, so the foot's Re-analyze would recompute nothing, advance no mark and clear no notice. The same happens to the banner's Re-analyze after a revert to the analyzed list, where the dirty foot promises it *reads both*. **Correction:** answer from the store only when no log entry past the row's mark touches the deck; otherwise recompute and advance the mark. This is Design's READINESS eng 4. It amends ruling 5's short-circuit, so it needs Hugh's word (§4 H1) | eng (Hugh confirms) |
| F2 | Medium | `analysis-panel.tsx:82-84`, `analysis-banner.tsx:32`, `deck-analysis.ts:138-140` | **A foot-initiated press would draw the dirty banner.** The panel shows `AnalysisBanner` whenever a press is `loading` or `failed` over a held reading. Busy reads *Your deck has changes since it was analyzed…* and failure reads *We could not re-analyze your changes…*. On a notice-only deck both are false, and they merge the two signals §3.5 keeps apart. The foot's busy and failed states are undrawn. **Correction:** draw the banner only when the held reading is not fresh or the press is a retry of a stale one. A foot press shows busy in place on its own button (the banner's pattern, STATES:19). On failure the foot's sentence becomes a failure line with *Try again*, and the sheet stays open. The failure line goes to `/copy-review` | eng |
| F3 | Medium | `CREDITS-overview.md:9-12`, sheet frames (`Notices Sheet.dc.html`, `V.legalChip`, `V.all`) | **The foot's note slot is undrawn.** The foot's Re-analyze is a press like the banner's, so the same rules hold. (a) It writes the overview, and spends a credit, whenever the stored overview is not current for the list. That is the common case at launch, since no deck analyzed before sub-project 6 has one, and CREDITS says a button never spends without its note. (b) With a legality entry standing (the `legalChip` and `all` variants draw the foot's Re-analyze), HANDOFF §6 puts the check note in that slot. (c) The credits can be used up. **Correction:** apply CREDITS' banner placement (sentence, note, button, right-aligned at 1300; centered under the button at 390). The check note drops *See which →* inside Notices, where it would open the sheet it sits in | eng |
| F4 | Medium | `stored.ts:305-320` | **"since analyzed {date}" would show the quiet rebuild's date.** The upsert sets `computedAt: now()` on a rebuild as well as a press. The sheet's aside, and entries dated before it, would then read as if the player had analyzed after the change. **Correction:** keep `computed_at` on a `rebuildOf` write, as the pin is kept, or add an `analyzed_at` that only a press moves. Brief §6 already requires the mark to survive a rebuild; the date is the same rule | eng |
| F5 | Medium | `deck-card.tsx:520-534`, `:326`, `:356`; `decks-view.tsx:1053`; `nav.tsx:148` | **A chips row that never wraps cannot fit the narrow three-up.** `sm:grid-cols-3` from 640px, less 72px of padding and gaps and less the 62px rail from `md`, gives about 189px cells at 640 and 211 at 768. Less the tile's 1px border (`deck-card.tsx:327`) and its 13px padding, that leaves a 161–183px content box. Computed from the shipped classes: the pill (`Building`, ~71px) plus a single `Exhibition` chip (~99px, 105 from `md`) is 178 against 161 at 640 and 184 against 183 at 768. It overflows before any tag. That is why the cell wraps today. HANDOFF §1a's "marks only below 330" covers a range and not this. **Correction:** keep today's wrap below the tile's 330px container floor, the band the handoff itself calls mis-sized and assigns to another round. Tiles in a row still end level through `sm:h-full`. Measure it in the probe rather than trusting this arithmetic | eng |
| F6 | Low | `bracket-chip.tsx:36, 47`; `status-pill.tsx:32-33`; `refresh.ts:300` | **The 366px yield and the 22px row assume the phone-size chip.** From `md` the tile's chip is 24px tall at mono 11. The widest range the code produces is `Exhibition or Core` (`[1,2]`, `verdict-head.ts:28`, named at `:90`), not `Optimized or cEDH`: ~174px at mono 10 and ~185 from `md`, where the handoff counts 168. The widest pill is `Unresolved` (~85px), not 73. So the row is 24 from `md`, the footer 94 rather than 92, and the whole-row width runs to ~376. Canvas §1c also labels 1300's cells 340, where the classes give ~389. **Correction:** fix the row at the chip's height at each width, and find the yield point by measurement in `probe:bracket-chip` (`Exhibition or Core`, `Unresolved`, `Not legal` at 1300, 1000 and 390), not by a constant | eng |
| F7 | Low | `deck-card.tsx:546` | **The fixed 52px count slot is short for an `Over` deck.** `102 / 99` is 8 mono glyphs, ~58px at 12px and ~60 at 12.5. **Correction:** size the slot to `100 / 99` at 12.5px (60px) | eng |
| F8 | Low | `findings.ts:13-19`, `deck-analysis.ts:359-362` | **Group order and label disagree with the rule they cite.** HANDOFF §2 says "the findings' own labels … in the findings row's order". The shipped order is Game changers, Mass land denial, Extra turns, Two-card combos, and the shipped label is *Two-card infinites*. The frames and the About fixture draw *Two-card combos* second. **Correction:** follow the stated rule, reading `FINDING_ORDER` and `findings.labels`. The About specimen then reads *Two-card infinites* | eng |
| F9 | Low | `bracket-chip.tsx:20-27` | **`face` does not exist on `BracketChip`.** It is specified by the Home bracket-chip addendum (padding `0 2`, widths 52 and 26), which is not on main. **Correction:** add `face?: boolean` once, in whichever of the two lands first, and share it | eng |
| F10 | Low | `format.ts:99-117` | **`21 Sept` is not `formatDeckDate`'s form.** That function writes `21 Sep 2026`. The yearless one is `formatShortDeckDate`, `21 Sep`, which is en-US on purpose ("en-GB writes `Sept`"). **Correction:** use `formatShortDeckDate` for the aside and the entry dates | eng |
| F11 | Low | HANDOFF §3; §7 item 4 | **The `/decks` enum cannot carry a read legality notice.** HANDOFF §3 turns the dot off on read, on the page and the tile. `none \| unread \| notLegal` has no read form. And a legality entry that came in by import or *Update from a list* has no log sequence to be "read" against. **Correction:** store the legality read state as the set of offending oracle ids the player last saw, and widen the enum to `notLegalUnread \| notLegalRead` | eng |
| F12 | Low | `analysis-panel.tsx:30-34`, `src/lib/synopsis/` | **HANDOFF §6 targets surfaces not yet built.** The credit note, the Overview and *Write one* land with sub-project 6. **Correction:** the overview gate (§7 item 5) ships in or after the synopsis PR. The notice itself does not wait on it | eng |
| F13 | Low | `analysis-empty.tsx:32-44` | **Undrawn: legality on a deck that is not whole.** An import can bring both a banned card and a short body. The empty state's `blocked` line already disables Analyze. **Correction:** `blocked` wins and the check note is not drawn, because no press can happen | eng |
| F14 | Low | canvas `:95-97`; STATES rows 6–9 | **Two derivable gaps.** The 358 tile lacks `legalNoChip` and a single-chip notice. The read legality tag (no dot) is drawn nowhere. **Correction:** derive both from the drawn forms (a tag with no dot, same ink) | eng |
| F15 | Low | `about.ts:34`, `about.ts:93` onward | **The entry counts are stale.** Main carries 39 entries at `ABOUT_VERSION` 9. The analysis-tab entry's "34 → 36" and this one's "36 → 37" do not match it. `since: 10` and the single bump stand. **Correction:** count at the batch | eng |
| F16 | Low | `schema.ts:1351` | **A removed combo's words must be snapshotted.** `Spellbook: {result}.` reads `spellbook_variants.produces`, and a removed variant's row is gone after the publish. **Correction:** the log entry stores the card names and `produces` at diff time | eng |
| F17 | Info | `globals.css` `--danger` `#C6533F`; `--surface-inset` and `--bg` per theme | **Contrast, corrected.** Design's READINESS eng 5 quotes ~3.1:1 for `Not legal` in amonkhet. Computed from the hex values in `globals.css`: `--danger` reads **4.19–4.40:1 on `--bg`** (the header) and **3.85–4.21:1 on `--surface-inset`** (the tile's ground) across the six themes, all under 4.5:1 for 10–11px text. The ~3.1 figure is the read tag's: `--fg-locked` reads 3.23–3.49 on `--bg`. The shipped `Over` pill uses the same `--danger` (`status-style.ts:27`). **Correction:** add these pairs to the contrast tests with the measured figures. Whether the `Over` precedent covers `Not legal` is Hugh's call (§4 H5) | eng (Hugh rules) |
| F18 | Low | `spine-mobile.tsx:79-89`, `:91-96`; `verdict-head.ts:90` | **The phone header's chips row can wrap once the tag joins it.** The row wraps (`flex-wrap`), and the art band's ramp counts it as one line (`labelAtPx`, keyed to 143). Computed worst case: `Unresolved` (~74px at the phone pill's mono 10), `Exhibition or Core` (~174), `● 12 notices` (~91) and two 8px gaps is ~355px, against a 354px band at 390. **Correction:** apply the tile's one yield here too, so a range drops its name when the row cannot hold the tag whole. Assert the one-line row at 390 with that deck in the probe | eng |

### Engineering notes, not findings

- **Naming.** Keep "legality" out of the new code, as brief §1 asks: the enum's `notLegal` and a
  `rulesViolations` are right, and a second `legality` beside `deckLegality` (`stored.ts:58-63`) is not.
- **Which cards a data entry intersects.** Use the list the stored reading analyzed, since the notice qualifies that
  reading. A card added since then is the dirty flag's job.
- **The mark on existing rows.** Backfill the high-water mark to the log's head at the migration, or every deck
  analyzed before the log existed inherits the whole log.
- **Probes to update.** `probe:bracket-chip` asserts that a tile wraps below the pill at 190–230px cells, and
  `probe:deck-grid` asserts that tiles in a row end level. The new footer changes the first and must keep the second.

---

## 4 · For Hugh

- **H1 (blocks F1).** Ruling 5 becomes "the same list, under the same code **and the same data**, is the same
  answer". Otherwise a notice can only be cleared by editing the deck.
- **H2 (Design READINESS 1).** The notices foot offers Re-analyze when there is no banner. This amends the analysis
  tab's "only the banner". The alternative is a Re-analyze control in the tab, which is a second banner.
- **H3 (Design READINESS 2).** Withheld (drawn) vs passable for the overview on an illegal deck.
- **H4.** After a notice-driven re-analysis the list is unchanged, so under ruling B (`synopsis/limits.ts:7-10`) the
  saved overview stands. The overview's facts include combos and tutors (`synopsis/facts.ts:68-69`), so it can go on
  citing a combo Spellbook removed while the verdict no longer counts it. Is that stale overview acceptable here, as
  CREDITS' own open item 3 accepts it after a used-up press?
- **H5.** Does `Not legal` in `--danger` at 3.85–4.40:1 stand on the `Over` precedent (F17)?
- **H6.** The new footer shows last played on the phone as well. Today it is desktop only (`deck-card.tsx:580`).

## 5 · Design's READINESS, answered

| Item | Answer |
|---|---|
| Hugh 1–3 | H2, H3; the About entry is accepted (§1) |
| Eng 1 (enum) | Accepted and widened (F11) |
| Eng 2 (banned vs not legal) | Ship *Not legal in Commander.* from the boolean. Keep `legalities.commander` only if Hugh wants *Banned* |
| Eng 3 (read state) | Accepted; legality needs its own key (F11) |
| Eng 4 (foot recompute) | F1, and it needs H1 |
| Eng 5 (contrast) | The figure is corrected in F17 |

---

## Addendum: the tile's notice marker (2026-09-24)

**Audited:** `addendum-tile-marker/` against `origin/main` at `47a8a07a`, under Hugh's ruling of 2026-09-24: the
deck header keeps the full chip and the Notices sheet, and the /decks tile shows only a small red `!`. It amends
HANDOFF §1 and §1a for the tile alone.

**Verdict for the addendum: Green.** Every asked item is drawn, and the meaning is findable at both widths
without hover, which is where the retired deck-status marks failed. Nothing goes back to Design. Two of Design's
choices need Hugh's word (H7, H8). Neither holds the verdict: each is a one-line change either way.

### The asked items

| Asked | Answered | Checked against |
|---|---|---|
| The marker's place, one notice | Yes. An 18px circle in the tag's slot, after the bracket chip, or after the status pill with no chip. Gap 8, centred in the 22 / 24 chips row | the tag's mount, `src/components/decks/deck-card.tsx:550` |
| With legality and data notices together | ONE mark, in `--danger`, never two. The spoken name carries both counts (F20) | `NoticeSummary`, `src/lib/notices/summary-sql.ts:10-12` |
| The desktop tooltip | Yes. The shipped `FactTooltip` with a `sentence`: 400ms, fine pointers only, portalled. One sentence each for not legal, notices and both | `src/components/cards/fact-tooltip.tsx:27`, `:135`, `:158` |
| How a phone player learns what it means | A key line on /decks at both widths, reusing `MarkKey`, drawn only when a tile in the current shelf and filter carries a mark. A tap tooltip, a first-run hint and a word beside the mark were each tried and rejected, with reasons | `src/components/decks/mark-key.tsx:33-35` |
| The tile with and without the marker, kept level | Yes, across the three footer rows of #939, at 340 and 358. The mark fits inside the chips row, and the footer is untouched | the footer's fixed rows, `deck-card.tsx:507-518`, and the chips row, `:523-526`; `probe:notices-tile` |
| Announced to screen readers | Yes. The mark is `aria-hidden`, and the tile link's name already carries `noticeSpoken` | `deck-card.tsx:315`, `:602-606`; `src/components/decks/notice-tag.tsx:45` |

**About entry:** none new, and none needed. The parent's entry (`ABOUT-entry.md:23`) already says "a small
notice sits after its bracket on the deck page and its tile", which stays true of the mark.

### Findings

| # | Sev | Evidence (origin/main) | Finding and correction | Owner |
|---|---|---|---|---|
| F19 | Medium | `deck-card.tsx:602-606` | **The mark sits under the tile's full-cover link.** The link is `absolute inset-0` and last in the DOM, so the mark never gets the pointer and its tooltip cannot open. Design lifts the mark's wrapper above it and forwards a click with `router.push`, which drops cmd-click and middle-click (open in a new tab), where the rest of the tile keeps them. **Correction:** lift the wrapper, but make it a second `Link` to the same href with `tabIndex={-1}` and `aria-hidden`, so every kind of click behaves as the tile's does and nothing is added to the tab order | eng |
| F20 | Medium | `summary-sql.ts:10-12`, `:73-78` | **The summary returns one kind.** It picks legality over data, so "both" cannot be spoken or put in the tooltip. **Correction:** return the unread data count beside a legality kind, and build the spoken name from both parts with the existing strings, as Design's copy file says | eng |
| F21 | Low | `decks-view.tsx:1053` | **The key is the first item of a list.** The tiles are a `<ul>`, so the key line is an `<li>` spanning the grid (`col-span-full`), with its region label, and not a bare `div` inside the list | eng |
| F22 | Low | `deck-card.tsx:261`, `:319`, `:534`; `scripts/probe-notices-tile.mjs:48-57` | **The yield may go.** `YIELD` has two bands, both sized for a word beside a range: `notLegal` (330 to 408, for the `Not legal` chip) and `data` (330 to 358, for `● 99`), picked at `:319`. The tile draws neither word now. Design estimates the widest row with the mark at about 333px from `md` and 320 below, near the 330 floor. **Correction:** re-run `probe:notices-tile` with the mark, and delete both bands and the `face={false}` branch only if both widths land at or under 330, as Design says. The probe reads the band from the shipped classes, so it has to change with them | eng |
| F23 | Low | addendum READINESS eng 5; parent H5 | **Measure the glyph's contrast in the theme tests.** The `!` is a 12px graphic on its own tint, and Design measures it at 3.5:1 against a 3:1 bar. It carries no word, since the key and the spoken name do. The parent's H5 (4.5:1 for the *Not legal* text) applies to the header chip, which keeps its text. **Correction:** add both inks on their tints to `status-style.test.ts` at 3:1, in every theme | eng |
| F24 | Low | `tile-marker · copy strings.ts` | **Six new strings go to `/copy-review`:** three tooltip sentences, the key's two words, and its region label | `/copy-review` |

### Hugh's rulings (2026-09-25)

Hugh approved this addendum's audit.

- **H7: two colors, as drawn.** Red for not legal, blue-grey (the card-facts color, `--fact`) for a data change,
  and one mark only.
- **H8: the mark stays red until the deck is legal again**, with no read look on the tile. The header keeps
  read versus unread.

### For Hugh (as asked)

- **H7 (Design's call, against the ruling's wording).** You ruled a small RED `!`. Design draws red only when a
  card is not legal, and a blue-grey `!` (the card-facts color) when the data behind the deck moved, such as the
  Game Changer list changing. The reasoning: a red mark for a list update reads as a broken deck. Keep the two
  colors, or red for both? Red for both drops one key entry and nothing else.
- **H8 (Design's call).** Once you've opened the notices, a legality mark stays red on the tile, with no
  "read" state at this size. The deck header still shows read versus unread. OK?
