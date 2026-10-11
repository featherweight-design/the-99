# Readiness audit — Tuning hub R1

Auditor pass, 2026-10-09. Source of truth: `docs/superpowers/design-briefs/2026-10-08-tuning.md`
(items 1-7) and `docs/superpowers/plans/2026-10-08-tuning-roadmap.md` ("Rulings"), both on
`origin/main`. Verified against the handoff's own canvases, README, STATES-tuning-hub.md,
READINESS.md, the copy strings file and the new design table, and against the shipped code
(`builder-shell.tsx`, `role-counter-strip.tsx`, `src/lib/copy/{decks-builder,credits,about}.ts`,
`src/lib/tuning/flag.ts`, `src/app/globals.css`).

## Verdict: YELLOW

_Update, 2026-10-09: Hugh ruled on the findings below; see "Rulings applied". Verdict stays YELLOW._

Every closed ruling the task asked me to check holds, except one real mismatch between the
roadmap and what the canvases now draw (Proposed cuts' Look deeper). That mismatch is a
roadmap/sequencing question for Hugh, not a defect in the drawing itself, and nothing in the
hub's landing, state coverage, tokens or copy blocks a build. Everything else open is
engineering-resolvable or already answered by a ruling the handoff hadn't caught up to.

## Closed rulings — verified

- Tuning sits inside the Analysis tab, replacing Suggested changes' body — confirmed (README
  "Design's three calls" §1; design table `TuningHub` placement = "last section of the Analysis
  tabpanel", matching the shipped `view === "analysis"` panel in `builder-shell.tsx`).
- Free result instant, Look deeper (1 credit) at the top, no always-deeper setting — confirmed
  (README "Other decisions" §3, `DeeperBand` offer state); no always-deeper toggle anywhere in
  the canvases or copy.
- One shared History for every tool — confirmed (`HistoryRow` is tool-generic: mark + tool column,
  tier, outcome).
- Proposed cuts offered once total passes 100, commanders included, matching Over — confirmed
  (`Trim line link` condition `total > 100, commanders included (= built > bodySize)`; tile copy
  `notOffered` reads "at {total}" for ≤100, matching `overCopy.trim`'s existing figure).
- Thin EDHREC data: both tools run anyway and say what's missing, never refuse — confirmed for
  both (Mana Balance B7 / `mana.thin`; Proposed cuts C5 / `cuts.leadThin`, `cuts.thinRow`); the
  states table's "Must not" column says "refuse" for both.
- View resets to landing on navigate-away — confirmed (`openTool` resets "on the Analysis
  tabpanel's unmount", which is what switching to Your deck/Your games already does in the
  shipped code, since the Analysis `tabpanel` div is conditionally rendered only when
  `view === "analysis"`).
- Roles strip in "Your deck" only — confirmed already shipped (`builder-shell.tsx:1476`'s single
  mount, comment: "One mount, at 'Your deck', whether or not Analysis is on"; `inset` prop is
  gone from `role-counter-strip.tsx`). The handoff does not redraw the strip inside Analysis
  anywhere in the three canvases.
- No About entry this round — confirmed (README header line, brief §8 cited directly; no new
  About-entry canvas).

## Finding: Proposed cuts tier 2 — roadmap/handoff mismatch (Hugh) — CLOSED by ruling (a)

The brief and roadmap both say Proposed cuts ships tier 1 only this round, with tier 2
"eval-contingent" (roadmap sub-projects 4 and 6: tier 2 "is added only if the golden-deck eval...
shows gaps tier 1 cannot close"). The handoff's own self-assessment (`READINESS.md` item 1,
README's "Feedback · Proposed cuts + History") says Hugh's landing feedback put Look deeper for
Proposed cuts "now in scope," and the canvases draw it (C2 offer band, C8 running, C9 result).
Nothing in the roadmap has been updated to match. This is a genuine engine mismatch: sub-project
4's eval was supposed to decide whether this tier gets built at all, and the handoff now draws it
as committed. Needs Hugh to confirm the roadmap's eval-gate is superseded (and have the roadmap
doc amended) before sub-project 6 scopes Proposed cuts tier 2 as guaranteed work.

## Finding: curve weighting — already answered, handoff's "open" item is stale (eng-resolvable) — CLOSED by ruling (c)

`README.md` "Open — for Hugh" item 1 still asks whether Mana Balance's pip demand is
curve-weighted (the brief's original text) or plain (Deck Stats' shipped choice). This is no
longer open: Hugh's ruling 10 (2026-10-09, `docs/superpowers/plans/2026-10-08-deck-stats.md`,
"Settled by Hugh") dropped curve weighting — "demand stays the raw pip count everywhere" — and
nothing in the measured data justified the added rule. Checked the copy strings file, the design
table and all three canvases for a stray "weighted" figure or label: none exists (the table draws
`asked` as a plain column with no "weighted" wording, confirming Design left this open rather than
committing either way). Engineering should build Mana Balance's demand as plain pip counts per
Ruling 10, and this open item can close without going back to Hugh — the answer already exists,
it just predates the handoff catching up to it.

## Other open items — engineering-resolvable, not blocking

- **Suggested changes as two lists** (CLOSED by ruling (b): sub-project 8) changes its model contract (one rationale per card, not per
  swap) — real work, but a plan/engineering task to add to the roadmap, not a design gap.
- **Stop on a deeper look** (open 6) — handoff explicitly leaves this to engineering's judgement.
- **Free runs recorded once per list version** (open 3) — a data-model question (History's
  ledger shape), not a visual one; the rule the canvases draw is internally consistent and can
  ship as drawn pending confirmation.
- **Mana Balance's "covers the cost" target** — a fixed table owned by engineering (sub-project
  3's job to produce), correctly left unspecified by Design.
- **The dork caveat as a counted sentence, not a weighting** — consistent with the curve-weighting
  finding above; no separate action needed.
- **The 400ms delay on Proposed cuts' loading frame** — a judgement call, non-blocking.
- **Tab names** (open 5) — the brief's own text says "Your deck, Your games," but the handoff
  correctly drew against the shipped three-tab set (`Your deck · Analysis · Consider`,
  `addPanelCopy.tabs`, confirmed in code). The brief is stale here, not the handoff.
- **"A third door" from Deck Stats' Mana colors card** (open 2) and **Staple adds going over**
  (open 4) are both design calls Design already made and documented (left unlinked; drawn
  honestly) — nothing further needed.

## Rulings applied (Hugh, 2026-10-09)

Recorded in `docs/superpowers/plans/2026-10-08-tuning-roadmap.md` (Rulings 2026-10-09).

- **(a) Proposed cuts tier 2 is not built this round.** It waits for the golden-deck eval of the
  free tier (lane b4) and ships only if the eval shows the free tier missing cuts. C2/C8/C9 stay on
  file as reference. Closes the tier 2 finding; the roadmap's eval gate stands.
- **(b) Suggested changes adopts the two lists, Additions and Cuts, one rationale per card.** A
  model-contract change (prompt plus validator), then an eval re-run, which needs Hugh's OK on
  cost. It also applies to the SHIPPED panel (`src/components/decks/tuning-panel.tsx` and its
  manifest), so it is its own roadmap task (sub-project 8), independent of the hub UI and able to
  ship before it; the hub inherits it. The UI change follows this #1312 drawing, so it needs no
  new Design round. Closes the "two lists" item.
- **(c) Curve weighting is dropped** (Deck stats plan, Ruling 10). Mana Balance demand is plain pip
  counts. Closes the curve-weighting finding and README "Open" item 1.
- Tab names (open 5): the brief's "Your deck, Your games" is stale; roadmap note added.

Verdict stays YELLOW.

## Mechanical checks

- **Tokens**: every `--token` referenced in `design-tables/tuning-hub.md`, `README.md` and
  `STATES-tuning-hub.md` exists in `src/app/globals.css` (`--accent`, `--accent-dim`, `--border`,
  `--border-dashed`, `--border-strong`, `--danger`, `--elevated`, `--fg`, `--fg-body`,
  `--fg-faint`, `--fg-locked`, `--fg-muted`, `--success`, `--surface`, `--surface-sunken`,
  `--warning`, plus the five color tokens `--w --u --b --r --g`). No new token introduced, as
  README claims.
- **Copy**: no em dashes in any shipped/placeholder copy string (`tuning-hub · copy strings.ts`).
  The only em dashes anywhere in the handoff are in document headings/table placeholder cells
  (`—` used as a title separator or "not applicable" cell), which is this repo's standing doc
  convention, not player-facing copy. US English throughout; no British spellings found. The
  copy strings file itself notes the house rule never to say "AI," "model," or "LLM" — consistent
  with the hub referring to tier 2 only as "a deeper look."
- **States coverage**: ready / running / results / refused / failed are drawn at both 900 and 390
  for Mana Balance and Proposed cuts (`STATES-tuning-hub.md`'s per-tool tables cite frame ids for
  each, desktop and phone variants). Mana Balance tier 1 correctly has no "refused" state (ruling
  6: it never refuses) and no "running" frame (it's instant); Proposed cuts tier 1 gets a brief
  running frame behind a 400ms delay, Design's call per the brief's own "Design's call" language
  in item 7.
- **Hedged vs counted** (brief §7): B9 draws three carriers (tag shape, ink, wording) so a
  "Checked"/"Unchecked"/"Suggestion" claim never reads as the same kind of statement by color
  alone — confirmed in `KindTag`'s table and `claim.*` copy (hedge wording explicitly uses "may"
  and names its uncertainty per the design table's note).
- **Design tables placement (corrected after Copilot round 1)**: `design-tables/tuning-hub.md` is
  new and currently sits inside the handoff folder, NOT in `docs/superpowers/design-tables/` beside
  `deck-tuning.md` and the others, so `check:copy-drift` (whose `TABLE_DIR` is that directory) does
  not scan it. The build PR must move it there, per the brief's "Where it lives". An earlier
  version of this line said it was already there; that was wrong.
- **Design's three calls** (README) are each made and recorded: (1) the landing's four
  fixed-order tiles with Proposed cuts present-but-inert under 100; (2) the two shortcuts, one
  action per cell, no dead link added before Mana Balance's engine exists; (3) a running tool
  shown on its own tile only, no banner, no disabled siblings.

## Not re-verified (handoff's own "Not read" list, accepted as-is)

`builder-shell.tsx` in full (only its mount-point lines, cross-checked against the brief's line
refs — confirmed accurate against the current tree), `src/lib/intake/deeper-read.ts` internals,
and `AnalysisBanner`'s exact geometry. None of these affect the verdict above.

## Copilot round 1 — design errata for Design's next round (not edited here)

These land on Design's drawing package, so they are recorded rather than patched in the handoff:

- `design-tables/tuning-hub.md` rows ~121, ~126 and ~256 still specify the separate `1 credit` /
  `0 left` tags, the failed-band retry tag and the `failed` danger pill, which the later
  credit-in-button decision and the Failure mark rule (13px icon, segmented retry button) removed.
  The superseding paragraph governs; the rows need re-syncing.
- `README.md` ~74 says the over-100 tally turns `--warning`; the later Hugh feedback and the
  property table say ordinary ink, "never `--warning`". The property table governs.
- `TuningToolMark.dc.html` ~88: the metadata `variant: geo` default is always passed by the
  standalone runtime, so `tool=cuts` previews the unapproved geometric mark. Remove the metadata
  default so the tool-specific fallback can run.

## R2 re-audit: Proposed cuts, model-first (2026-10-10)

**Verdict: GREEN, with Design errata that do not block the build.** Audited against
`docs/superpowers/plans/2026-10-09-proposed-cuts-model-tier.md` (main) and Hugh's model-first ruling.

**Canvases.** `(R2) · C Proposed cuts and History` is CURRENT (C1 to C9 at 900 and 390; C6c is phone only;
H1 to H4 carried from R1 with the Cuts summaries updated). `(R1) · C Proposed cuts and History` is
SUPERSEDED, kept for the record. `(R1) · A Landing` and `(R1) · B Mana Balance` remain current. Note the
drop omitted `READINESS-audit.md`; main's copy is kept and this section is appended to it.

### Checked against the ask
- **Free pass is counted facts only.** C1 names no card and shows no list: lead, Look deeper, then
  `What we counted` (role overages, curve crowding, bracket flags, EDHREC spread). The bracket row reads
  "bracket 3 allows 3", so a flag shows only against the declared bracket, as the plan requires.
- **Thin-data note.** C5 drops the EDHREC fact row, adds a dashed row, and the offer lead names the gap.
- **Look deeper is the main action.** First in the panel, filled `--accent`, `1 credit` segment, the hub's
  only filled button. States drawn: running (C2), results (C3, C4), refused (C6, plus all-locked C6c),
  failed (C7), thin (C5), back to 99 (C8). Credits-used-up is not redrawn (B6 rule), which is acceptable.
- **Results reuse the tier-2 frames and the citation pattern.** C2 is the old C8, C3 the old C9. Lines carry the
  Suggestion tag, one sentence and chips. Exactly the overage is asked for, 1 to N accepted, a shortfall is
  a dashed slot and never padded (C4). The arithmetic holds: six over, two cut, four over; ramp 14 to 13;
  EDHREC under 10% from 17 to 16 as the 3% card leaves.
- **Fact versus claim (C9).** Four carriers (shape, tag, type, words), never color alone.
- **Over tally never `--warning`.** The R2 canvas uses `--warning` nowhere but the `:root` declaration and a
  note that forbids it. Only canvas A's A1 tile still draws it (decision 1).
- **Tokens.** Every `var(--x)` in the R2 canvas is declared in `src/app/globals.css`. The only non-token
  value is the segment rule `rgba(18,18,23,0.35)` (decision 2).
- **Copy.** No em dash in the canvas or the copy file; spelling is US. The only em dash in the diff is the `STATES-tuning-hub.md` heading, which the R1 heading already carried (Design errata). Retired R1 keys are listed in the copy file.
- **No R1 free-ranked-list frame is current.** README marks the R1 canvas superseded and renumbers frames.

### Design items (errata for Design's next round; recorded here, not patched). None is layout or visual, none blocks.
1. `design-tables/tuning-hub.md` was not re-synced: rows ~192 to ~238 still specify the rank number, `Rank again`,
   overage + 2 candidates, the tier-2 band over a shortlist, and `Couldn't rank`. There is no R2 property
   table for C1's `What we counted` rows or C3's lines. The R2 canvas is the specimen until one exists.
2. `README.md` lines ~63 to ~73 (R1 Proposed cuts bullets: overage + 2, shortlist C2/C8/C9) carry no
   "superseded" mark beside the R2 section, so a reader of the old bullets sees a live spec.
3. Canvas notes say every chip repeats a figure "from the count". The EDHREC per-card chips (`14% · median 38%`)
   and `you said` chips are not count rows; they come from the model's input. C5b also draws a `curve 4 mana`
   chip that matches no count row. The plan's validator (figure equals the input) governs.

### Decided, override if you disagree
1. **A1 tile status ink: build in `--fg-muted`**, not `--warning` (README open 10). Hugh's neutral-tally ruling already decides it.
2. **The segment rule is `color-mix(in srgb, var(--bg) 35%, transparent)`**, a value and no new token.
3. **Re-offer (README open 9): ship as drawn.** Cuts pressed from a result do not re-offer Look deeper; any other
   edit does. Re-offering on every Cut would invite a credit per card.
4. **Stop on a deeper look (open 6): keep it, as in Mana Balance.** One behavior across both tools.
5. **Ordinal helper (flag 12): engineering writes a small helper** for the shortfall slot ("A sixth"), up to the overage cap.
   `/copy-review` may reword to a numeral if it prefers.
6. **Chip contract: the validator's input is the source of truth** (design errata 3), so build chips from the evidence pack, not from the visible count rows.
7. **Build PR 4 writes the R2 property table from the canvas** and replaces rows ~192 to ~238 when it moves
   `design-tables/tuning-hub.md` to `docs/superpowers/design-tables/` (existing instruction).

### To `/copy-review` (not decided here)
The `cuts` block of `tuning-hub · copy strings.ts`: offer lead, `Name the six cuts`, the shortfall slot, the
refused and failed sentences, and the tile purpose `Counts where the deck runs long. A deeper look names the cuts.`

## R3 Mana Balance audit, 2026-10-11

Audited against `docs/superpowers/design-briefs/2026-10-10-mana-balance-evidence.md`, its "Rulings 2026-10-11"
(Hugh, closed) and the engine on main (`src/lib/tuning/mana-balance*.ts`, `mana-help.ts`, `src/lib/mana/karsten.ts`,
`pattern.ts`, `lands-tapped.ts`). The canvases were read from their data blocks, not opened in a browser. Figures
were checked against staging read-only (`pnpm eval:mana`, plus a one-off read of the same loader for the five
fixture decks; nothing written, no model call).

**Verdict: GREEN.** Build from R3b F3 (folded view), F1 (each section open) and F2 (door and step), with R3a's
per-deck frames and R3's thin, failed and help-row states. Every finding below is engineering-resolvable or
goes to `/copy-review`; none needs a Design round.

### Checked against the ask
- **(a) No always-on pointer.** Holds in R3a and R3b. R3a's header and notes state revised ruling 1, and no
  frame renders a lead line: R3a's data still builds a `lc` lead object per deck and a `leadName` size, but the
  template never reads either (dead data, harmless). R3b draws the view with no color named on open; its one
  sentence under the title ("Pips and sources for each color ... beside what each color's tightest cost needs")
  names no color and is not the forbidden line. **R3b supersedes R3a for the whole view; R3a stays the source for
  the per-deck step frames (N3, N3b, N3c), Wizards (N4) and Eldrazi (N5).** R3 (`evidence`) M1 and M2 still draw
  the pre-ruling `Karsten, hardest card` column and the `Reading the Karsten figure` box; both are superseded by
  R3a/R3b, as the README and STATES say.
- **(b) Pattern rows.** `You have N · Needs M`, `Needs at most N`, `No published figure`, column `Needed`: drawn
  (R3a N2/N2b, R3b F1/F3c). The tap-open line is Hugh's sentence verbatim (copy strings `needs.needsBody`). Karsten
  is NOT confined to that line and the citation; see finding 1.
- **(c) One door.** `Improve my mana` opens a radio step, tightest first, nothing checked (R3a N3/N3b/N3c, R3b F2b).
  The order and figures are right for Gishath (G 28·28, R 27·22, W 26·15) and Blood Rites (W 24·26 before B 30·30,
  March of the Canonized's single-card `CC` not deciding). Aang's order is wrong at its tie; see finding 2.
- **(d) No verdicts.** No `short`, no pass/fail, no tint by gap, no word `labels`. `--warning` appears only in the
  shipped BuyTag's `buy` pill and `--danger` only on the help-failed mark (B8's shape); neither is on a figure.
- **(e) Fixtures.** Gishath matches staging on every figure (pips 18/26/56, sources 26/27/28 + 1 U + 1 B, 6
  colorless; 36 lands, 4/5/4 tapped, average 4.34, ramp 10, land figure 42.2; patterns). Blood Rites' step and rows
  match. Wizards, Eldrazi and Aang's sub lines do not; see finding 5.
- **(f) Widths.** 900 and 390 both drawn: R3b F3/F3b/F3c, F1/F1b; F2 is phone only, with the desktop step in R3a
  N3. STATES gains R3, R3a and R3b tables; design tables gain ManaEvidenceTable, PatternRows, LandFacts,
  HelpPicker, HelpResult, KarstenCitation, NeedsExplainer, ImproveDoor, ColorStep and ManaSection.
- **(g) Design's open calls**, all answered: the explanation is inline (the shipped `StripRationale` disclosure),
  not an InfoTip per row; a one-color deck skips the step and the door opens that color's help; a colorless deck
  has no door. Also answered: help rows are information only (no Apply); the land cell shows `balance mana →`
  whenever the deck has a colored pip (a door, not an alarm); pips lead with the commander.

### Findings
1. **Karsten is named outside the tap-open line and the citation** (ruling 2: "nowhere else on the screen").
   R3b's Lands row `Karsten’s land count`, the Lands clause `Karsten’s count {x}`, `thin.noSources` ("Pips and
   Karsten’s figures still show"), and design-tables `KarstenCitation` ("`Karsten` heads every column, row and
   caption") and `LandFacts`. R3a's own STATES says `Karsten` is gone as a label, so R3b contradicts it.
   *eng-resolvable, to `/copy-review`* (decision 1).
2. **Aang's step breaks a tie the wrong way.** White and green both read 22 · 19 (`1C`); the ruling breaks a
   tie on more pips with the commander, then W U B R G. Staging: green 22 pips, white 20, so green lists before
   white. R3a N3b draws white first, and STATES, design-tables `ColorStep` and the R3a note all state the tie as
   W U B R G alone. *eng-resolvable* (decision 2).
3. **The ranking rule as written in the handoff is incomplete.** `ColorStep` (design tables) omits the ruling's
   fallback: a color with no pattern two or more cards share ranks by its worst single-card published pattern.
   It also does not place a color whose patterns are all ceilings or unpublished. *eng-resolvable* (decision 3).
4. **`How moves are picked` contradicts the engine.** The copy strings say a move keeps every other color "at or
   above what its tightest cost needs", i.e. the `Needed` figure. The engine's guard (`mana-help.ts`,
   `requirement`) uses `karstenHardest`, the hardest published pattern over all patterns, shared or not: for
   Gishath red that is 30 (`CC`, Shatterskull Smashing), while the table shows Needed 22. R3's canvas text
   ("Karsten’s figure for its hardest card") matched the engine; the R3b copy file does not.
   *eng-resolvable, to `/copy-review`* (decision 4).
5. **Fixture drift.** Against staging: Aang's sub `94 pips · 102 sources` is 83 · 100; Wizards' `75 · 41` is 75 · 39,
   with `73 without Baral` (74), `33 lands · 4 other` (35 · 2), average 2.71 (2.52), cheap ramp 8 (4), land figure
   37.7 (38.2); Eldrazi's `21 pips · 17 sources` is 15 {C} pips · 47 sources, and 36 lands is 38. Aang's R3 help draws
   red 23 and green 24 where the step reads 21 and 22, and a rebalance and a Hinterland Harbor trade that take red
   below its guard figure, which the engine refuses (staging: no rebalance for Aang blue). Blood Rites' sub
   (`white 24, black 30 sources`) breaks the Colors card's `N pips · M sources` form. The brief allows
   illustrative figures; the build reads the engine. *eng-resolvable*.
6. **Engine gap: the `Needed` figure and the step's ranking do not exist yet.** `readManaBalance` keeps every
   pattern internally but exposes only the six hardest and `karstenHardest` (over all patterns, regardless of how
   many cards share them). Gishath white's Needed is `4C` (2 cards, 15), which is not among its six shown
   patterns, and `karstenHardest` reads 26. Needed per color (pattern, figure, cards behind it, commander
   excluded) and the ranking over it are new pure functions over the same pattern map. *eng-resolvable*.
7. **Engine gap: tapped-land names.** R3/R3b open each tapped kind to its land names; `TappedLands` carries counts
   only. *eng-resolvable* (extend `lands-tapped.ts` to return names, or drop the disclosure).
8. **The step needs the commander's identity**, which `ManaBalance` does not carry (Gishath's blue and black have
   sources and are outside its identity, so they are not listed). `loadManaHelp` already reads it from the deck;
   pass it to the view. *eng-resolvable*.
9. **STATES R3 "Must not" says "sorting colors by any comparison (always W U B R G)".** That holds for the evidence
   view and is overridden inside the step by revised ruling 1. *eng-resolvable* (doc wording, at the build).
10. **Blood Rites' white rows (R3a N2b) show two patterns**; staging has at least `CC`, `2CC` and `4CC`. Illustrative.
    *eng-resolvable*.

### Decided, override if you disagree
1. **Karsten's name leaves the Lands block.** The row reads as a land-count figure without his name (wording to
   `/copy-review`), and the citation, already the panel's last line, credits the formula to him. `thin.noSources`
   drops his name the same way. This is the only reading of ruling 2's "nowhere else on the screen".
2. **The step and the table follow the ruling's tie-break, not the drawn order:** lowest ratio first, then more
   pips with the commander, then W U B R G. Aang lists U, R, G, W, B.
3. **The full ranking rule**, as the build implements it: a pattern counts only with a published figure (`known`);
   "two or more cards" counts nonland COPIES behind the pattern with the commander excluded, as the calibration
   table does; a color's figure is its worst ratio over those patterns, else its worst single-card published
   pattern; colors with pips but no published pattern come after every color with a ratio, in W U B R G order;
   identity colors with no pips come last (`N sources · no pips`), as drawn; under `noSources` every ratio is 0
   and the tie-break orders them. The `Needed` cell of a color with no published pattern reads like a pipless
   one (`—`), wording to `/copy-review`.
4. **The guard stays as built** (hardest published pattern, `karstenHardest`); `How moves are picked` is reworded to
   describe it without the word "tightest", so it never reads against the table's Needed column.
5. **Build figures come from the engine**, never the canvas; finding 5's figures are not errata for Design.

### To `/copy-review` (not decided here)
`mana-balance R3 · copy strings.ts` in full, with findings 1 and 4 and the Needed cell for a color with no
published pattern; the About entry (M10) rides the Tuning line's batched bump with `MANA_BALANCE_ENABLED` added
to `AboutSwitch`.

### Landing notes
- Design's package deleted `READINESS-audit.md`; it is kept (this file).
- Design's `README.md` was built on a copy older than main and reverted two R2 errata already merged: the
  "SUPERSEDED by R2" note over the Proposed cuts feedback bullets, and the C3 chip sentence ("a figure the
  validator checked ... audit decision 6"). Both are restored to main's text; Design's R3 additions stand as drawn.
- Every earlier canvas (R1 A, R1 B, R1 C, R2 C, `TuningToolMark`) is kept.
