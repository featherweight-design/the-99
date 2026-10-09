# Readiness audit — Tuning hub R1

Auditor pass, 2026-10-09. Source of truth: `docs/superpowers/design-briefs/2026-10-08-tuning.md`
(items 1-7) and `docs/superpowers/plans/2026-10-08-tuning-roadmap.md` ("Rulings"), both on
`origin/main`. Verified against the handoff's own canvases, README, STATES-tuning-hub.md,
READINESS.md, the copy strings file and the new design table, and against the shipped code
(`builder-shell.tsx`, `role-counter-strip.tsx`, `src/lib/copy/{decks-builder,credits,about}.ts`,
`src/lib/tuning/flag.ts`, `src/app/globals.css`).

## Verdict: YELLOW

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

## Finding: Proposed cuts tier 2 — roadmap/handoff mismatch (Hugh)

The brief and roadmap both say Proposed cuts ships tier 1 only this round, with tier 2
"eval-contingent" (roadmap sub-projects 4 and 6: tier 2 "is added only if the golden-deck eval...
shows gaps tier 1 cannot close"). The handoff's own self-assessment (`READINESS.md` item 1,
README's "Feedback · Proposed cuts + History") says Hugh's landing feedback put Look deeper for
Proposed cuts "now in scope," and the canvases draw it (C2 offer band, C8 running, C9 result).
Nothing in the roadmap has been updated to match. This is a genuine engine mismatch: sub-project
4's eval was supposed to decide whether this tier gets built at all, and the handoff now draws it
as committed. Needs Hugh to confirm the roadmap's eval-gate is superseded (and have the roadmap
doc amended) before sub-project 6 scopes Proposed cuts tier 2 as guaranteed work.

## Finding: curve weighting — already answered, handoff's "open" item is stale (eng-resolvable)

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

- **Suggested changes as two lists** changes its model contract (one rationale per card, not per
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
- **Design tables placement**: `design-tables/tuning-hub.md` is new and sits beside
  `deck-tuning.md`, `deck-tuning-addendum.md`, `deck-tuning-d2.md`, `never-cut-tuning.md` in
  `docs/superpowers/design-tables/`, per the brief's "Where it lives" section — confirmed by
  listing that directory; nothing from the existing tables is duplicated or restated.
- **Design's three calls** (README) are each made and recorded: (1) the landing's four
  fixed-order tiles with Proposed cuts present-but-inert under 100; (2) the two shortcuts, one
  action per cell, no dead link added before Mana Balance's engine exists; (3) a running tool
  shown on its own tile only, no banner, no disabled siblings.

## Not re-verified (handoff's own "Not read" list, accepted as-is)

`builder-shell.tsx` in full (only its mount-point lines, cross-checked against the brief's line
refs — confirmed accurate against the current tree), `src/lib/intake/deeper-read.ts` internals,
and `AnalysisBanner`'s exact geometry. None of these affect the verdict above.
