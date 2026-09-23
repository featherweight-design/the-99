# Readiness audit: deck tuning placement addendum (r1 + r2)

**Verdict: 🟠 Orange** (one Design item; Hugh's rulings below settle the rest). Audited 2026-09-23 on `design/tuning-placement-addendum` (`c9885589`, which is
`origin/main` at `f8a949b7` (#890) plus Design's addendum). Placement, the zero-games path, the
allowance line and the lifecycle are buildable, and nothing that shipped in #884, #887, #889 or
#891 has to be redrawn. **One of the four named asks is not drawn, and its README text rules
against it:** the bracket flag (finding 1). Hugh ruled on 2026-09-23 that a suggestion which moves
the deck's bracket is shown and flagged, and the column exists (`src/db/schema.ts:1596-1599`,
`bracket_after`). The addendum says the opposite: *"It never cites the bracket. No suggestion, chip
or rationale names a bracket"* (`README.md:30-32`, r1 text that r2 never replaced). That one element
goes back to Design. Everything else resolves in engineering or with Hugh.

**Which canvas is current:** `The 99 - Deck Tuning · Placement Addendum v2.dc.html`. README
(`README.md:70-72`, `:452-453`) and READINESS (`READINESS.md:5-7`) both say so, and they agree with
it. **One catch:** README's Files list calls r1 "history only" (`README.md:454`), but r1 is still the
only drawing of the Games line (r1 C1/C2, canvas `:231-256`), the exhausted state at 390 (r1 B3,
`:208`) and the Overview's exhausted slot (r1 B2, `:198`). r2 says placement is unchanged and that its
credits line "replaces r1's allowance line, same two surfaces" (`README.md:83`). Build r1's B and C
frames with r2's strings (finding 9).

**`pnpm check:copy-drift`:** passes. *"18632 strings in 38 copy modules and 213 components vs 46
design tables. No design table quotes a form the code stopped emitting."* That green tells you
nothing about this addendum: `docs/superpowers/design-tables/deck-tuning.md` is allowlisted
because #10 is unbuilt (`scripts/lib/copy-drift-allowlist.mjs:34-39`), and the check reads design
tables, not handoff canvases.

## Hugh's rulings, 2026-09-23 (they settle the questions below)

1. **The bracket flag stands.** A swap that would move the deck's bracket is shown, flagged. That
   one line goes back to Design (finding 1), with the rest of this audit's Design items.
2. **Up to five swaps per run**, as Design drew. `MAX_SUGGESTIONS` goes from 3 to 5 and the token
   budget is sized to match, in the tuning lane's C-fix PR.
3. **Re-analyze says when it will spend a credit.** When a re-analyze would also rewrite the
   synopsis, the banner says so before the press, as *Suggest changes* does. This lands with the
   synopsis (sub-project 6), since nothing spends a credit on re-analyze until then.
4. **The model is `claude-sonnet-5`.** Hugh also asked for a measured eval harness to find the
   lowest-cost model that holds quality. That is scoped separately.
5. **Credits roll over 24 hours**, as already ruled and built (`allowance-rule.ts:7-9`). Design's
   *left today* / *more at 00:00 UTC* copy becomes *{n} of {total} left · next one at {time}*,
   through `/copy-review`. No Design round.
6. **Decided in engineering, the only defensible reading:** a deck with no reading gets no
   suggestions (tuning follows the analysis, and analysis needs a legal deck), and tuning ships
   and hides with `ANALYSIS_TAB_ENABLED`, because it lives inside the tab.

## The four asks from the plan (`2026-09-23-deck-tuning-pr-d.md:240-245`)

| Ask | 1300 | 390 | Status |
|---|---|---|---|
| 1. The tab (panel **and** intent control) | v2 A1 `:59` | v2 A2 `:114` | Panel drawn at both widths. The intent control is not addressed (finding 8). |
| 2. Ready with zero games, state 1 retired | v2 D1 `:403`, D2 `:430` | not drawn | Retirement is stated (`README.md:44-47`). At 390 it is built from A2 plus D1 (finding 9). The case of games logged with no marks is not drawn (finding 10). |
| 3. Allowance spent, drawn once for both | v2 C6 `:385`, r1 B2 `:198` | r1 B3 `:208` (with r1's string) | Drawn. The wording conflicts with the rolling window (finding 5). |
| 4. Bracket flag on a card, up and down | **not drawn** | **not drawn** | **Missing, and ruled against (finding 1).** |

## Findings

| # | Sev | What | Addendum | `main` / plan | Resolves |
|---|---|---|---|---|---|
| 1 | **High** | **No bracket flag drawn, and the README forbids one.** The ask was "this swap would take the deck to bracket N", plus the case where a swap lowers the bracket. The rule is right about the model's rationale (the prompt carries no bracket figure). It is wrong about the app-computed flag. | `README.md:30-32`. No bracket anywhere in the card markup (the canvas mentions a bracket only at `:69` and `:215`) | `schema.ts:1596-1599`; `state.ts:27-28` `bracketAfter`; plan index `:34-36`, `:97`; `pr-c.md:128` | **Design**: one line on the card at both widths, both directions |
| 2 | High | **Applying a swap unmounts the panel on today's `main`.** The panel mounts only with a reading. An edit drops the reading to `idle` (`use-deck-profile.ts:201-204`), and an apply is an edit. So the panel would unmount mid-write, which the plan forbids. The addendum assumes the lifecycle banner, where a stale reading stays on screen (`README.md:36-39`). | `README.md:9-11`, `:36-41` | `use-deck-profile.ts:39`, `:59-66`, `:201-204`; `analysis-panel.tsx:68-79` | **eng**: PR D mounts after the lifecycle UI (C2) keeps a stale reading, or it gates on "a reading exists" and ignores freshness |
| 3 | Med | **The tie to a version is not in the state.** C5 (a commit retires the set, *"Your last suggestions were for version 3…"*) and the `no longer applies` row cannot come out of `TuningState`. Runs carry no deck version (`schema.ts:1533-1550`). `versionMoved` means the prompt or profile version (`state.ts:49-51`), so the name will be misread. `listFingerprint` holds no version (`schema.ts:1538-1539`). So a commit with an unchanged list gates as `unchanged` (`gate.ts:29-31`), and the retired panel's *Suggest changes* would then be refused. | `README.md:85`; v2 C5 `:338-351`, `retiredLead`/`brokenLine` `:535-536` | `state.ts:10-56`, `gate.ts:25-36`, `pr-c.md:355-367` | **eng**: `readTuningState` derives `retiredAt: {from, to}` from `deck_versions.created_at` against the run's `createdAt`. A retired set opens the gate. Each item gets `applies: boolean` (cut still in the deck, add not yet in it). Apply refuses a non-applying item. Rename `versionMoved` to `modelVersionMoved`. |
| 4 | Med | **Five suggestions and a `mix` citation are new contract.** The shipped code caps at three (`limits.ts:10-11`), sizes tokens for three (`:28-29`), and has four citation kinds (`response-schema.ts:15`, `schema.ts:1577-1581`, `validate.ts:135-160`). The mix is already in the pack (`evidence.ts:35-40`). | `README.md:77-78`; v2 `:494`, `:503` | as cited | **eng**: `MAX_SUGGESTIONS = 5`, re-measure `TUNING_MAX_TOKENS`, add `mix` to the enum, the column type and the validator (the value must match a pack cell's `have of target`), bump `PROMPT_VERSION`. Five answers cost more per call, which feeds the allowance formula (`allowance-rule.ts:17-19`). |
| 5 | Med | **The allowance copy describes a calendar day. The allowance is a rolling 24 hours.** *"of today's credits … more at {time}"* and *"left today"*, with a fixture of `00:00 UTC`. The code frees one unit at `reopensAt`, 24 hours after the oldest counted use. Hugh's ruling says "daily" (`READINESS-r1-audit.md:47-51`). Rolling was an eng reading of it (`allowance-rule.ts:7-9`). | `README.md:83`; v2 `exhausted`/`againNote`/`firstNote` `:529-531` | `allowance-rule.ts:7-9`, `:21-23`, `:50-55`; `deck-tuning.ts:76-83` (placeholder `allowance.spent`) | **Hugh** (question 1), then eng through `/copy-review` |
| 6 | Med | **Design's sample rationales fail the shipped validator.** (a) `N of your M cards` breaks `denominator`: the regex needs the digits to sit right next to `of` (`presentation.ts:39-47`). Samples at `:480` and `:496`. (b) A note quoted with *"26 Aug"* breaks `quotedNote`, which requires the ISO date (`validate.ts:51`, `:158`; `presentation.ts:64`). As shipped, a player would read `2026-08-26` in a sentence. | v2 `:480-497`, `:502-505` | as cited | **eng**: let `denominator` accept `of your/its/the`; quote notes with the app's display date from `format.ts`, in prompt and validator both |
| 7 | Med | **A validator rule the addendum claims does not exist.** *"now also drop any rationale that claims a bracket or result."* `presentationFailures` has no bracket or result rule. | `README.md:33-34` | `presentation.ts:29-74`, `prompt.ts:17` | **eng**: `noBracketClaim` (the word `bracket`, a rung name) as a suggestion rule. A "result" rule (win or strength words) needs its word list written down first. |
| 8 | Low | **The intent control is not placed.** Original ruling: the line goes under the deck name on every tab, and the ask goes in the panel (`INTENT-where-it-lives.md:5-6`). The header order has since been redrawn and shipped (`analysis_tab/HANDOFF.md:26-28`, #889), and no slot in it holds the intent line. The ask moves to Analysis with the panel. | not mentioned | `HANDOFF.md:26-30` | **Design**: one line (where it sits in the new order at 1300 and at 390) |
| 9 | Low | **Frames to compose rather than redraw:** D1 and D2 at 390, C6 at 390, and the Games line. These live only in r1 (A2 plus D1; r1 B3 with r2's string; r1 C1/C2). | `README.md:454` | n/a | **eng**, following r2's phone spacing (`README.md:88`) |
| 10 | Low | **Ready with games but no marks.** `readyLead` names a marked axis (`:532`), and `noGamesLead` (`:537`) covers zero games only. The plan names this case (`pr-d.md:112`). | v2 `:532`, `:537` | `pr-d.md:112` | **eng** writes the lead; `/copy-review` |
| 11 | Low | **`backLabel` cannot draw.** Only a `ModalChrome` sheet registers one (`receipt-modal.tsx:110`, `:135`; `card-detail-provider.tsx:268-274`). The panel is inline, so a card opened from it is not stacked and shows its own ✕. The pair as the list works as drawn (`card-detail-provider.tsx:44-58`). No new modal is introduced: good. | `README.md:79`; `READINESS.md:24`; v2 `:224` | as cited | **eng**: `open(id, [cut, add])`, no backLabel |
| 12 | Low | **PR D's written tests contradict r2.** `card.notOwned` and the "Complete" status test (`pr-d.md:199-213`) test the consequence and ownership atoms r2 removed (`README.md:80-81`). `statusPill` is no longer a dependency. | `README.md:80-82` | `pr-d.md:195-218`, `pr-c.md:405` | **eng**: amend pr-d/pr-c |
| 13 | Low | **The synopsis brief never mentions the shared allowance.** Ruling 7 has an exhausted allowance leave the synopsis stale "with a reset line", and the modal's stale banner offers Re-analyze (`SYNOPSIS-modal.md:62-64`). The brief should import the same `allowance.exhausted` string for the modal's banner. | r1 B2 `:198-202` | `design-briefs/2026-09-23-the-synopsis.md:57-68`, `:88-90` | **eng** amends the brief |
| 14 | Low | **The flag-off layout has no home for tuning.** With `ANALYSIS_TAB_ENABLED` off there is no Analysis tab (`builder-shell.tsx:169-170`, `:1097`; `page.tsx:340`). | n/a | as cited | **Hugh** (question 3); default: tuning ships behind the same flag |
| 15 | Info | **Design's open question 1 is already settled.** A failed or stopped run is refunded (Hugh, 2026-09-23): `allowance-rule.ts:6-7`, `gate.ts:17`. Tell Design. | `READINESS.md:34`, `README.md:90-91` | as cited | settled |
| 16 | Info | **Copy.** No em dash in any new string. US spelling in every string. `centre` and `colour` appear only in design notes. Every string is still in canvas logic (`:527-553`), so each needs its `deckTuningCopy` key. The r1 string and the r1 bracket rule are still in README (`:30-35`, `:49-58`); r2 wins by `READINESS.md:7`. | as cited | n/a | eng via `/copy-review` |
| 17 | Info | **About entry.** The addendum is silent. The plan batches it at the line's launch (`2026-09-07-deck-tuning-suggestions.md:211`), which is the rule for a multi-round line, but no numbered task names it. `ABOUT-entry.md` for the Analysis tab does not mention tuning. | none | plan `:211` | **eng**: name the batched task in the index; Design draws it at launch |

The short and full rationale ask from R2 is covered: `rationaleShort` is capped at 80 characters
(`response-schema.ts:24`) and requested by the prompt (`prompt.ts:34`). The canvas draws `whyShort`
on the phone (`:148`) and `why` on desktop (`:90`).

## Questions for Hugh

1. **When the five run out, when does a player get more?** All at once at a set time each day, or
   one at a time, each 24 hours after it was spent? The copy says "left today" and "more at
   midnight"; the build does the second.
2. **Should Re-analyze's banner warn that it will spend one of the five,** when it would also
   rewrite the synopsis? (Design's open question 2.)
3. **Suggestions now need an analysis first, and an analysis needs a legal 100-card deck** (your
   ruling 1). A half-built deck can no longer ask for swaps. Is that right? And with the Analysis
   tab switched off, should tuning also be absent?
4. **Bracket flag:** send it back to Design for its one line, or let eng draw it with the shipped
   bracket chip (`bracket-mark`, the header chip's chip form) under the pair?

## What PR D must build (for amending `pr-d.md`)

1. **Mount.** A `tuning` slot on `AnalysisPanel`, rendered after `{children}` (the mix), only when a
   reading exists (`analysis-panel.tsx:68-82`). The orchestrator sequences this after the lifecycle
   UI keeps a stale reading mounted (finding 2). One `HoverPreviewProvider` around the tab body, which
   also pays off Analysis finding 9. `readTuningPanel` is called on the tab's first open, like
   `peek`. `export const maxDuration = 120` on `src/app/decks/[id]/page.tsx`. A `builderTabSpecs`
   case, plus a probe that presses the tab.
2. **`TuningPanel` states:** never run, both with games and without (dashed *Your games · none
   logged* row, *Log a game →* calling `setView('games')`); loading, with the manifest ticking,
   `CardFanMark` animated (`fan-shuffle` 2.4s, static under reduced motion) and a live heading;
   results with five or fewer, and the *fewer* lead; part-answered; all answered; retired by a
   commit; unchanged (state 5); 6a–6e; credits spent (disabled primary, note, body kept). Credit
   notes beside both primaries.
3. **`SuggestionCard`:** both names and both thumbnails are card-open triggers (`open(id, [cut,
   add])`, hover preview). The add carries the shipped availability marks and the `buy` chip, on
   its own row on a phone. The cut carries no mark. `Reject` / `rejected` + *Show it again*. The
   `no longer applies` row. **The bracket flag line, once drawn.** No consequence line, no verdict
   clause.
4. **Games line** after `GameFindings`, only with a reading and one game or more. `GamesPanel` gains
   a `hasReading` prop and `onOpenAnalysis`. `readBack` gains *and read by Suggested changes*.
5. **Shared `allowance.exhausted` copy**, imported by the panel and by the Overview once it exists.
6. **Contract changes owed first, in B2/C** (not D): findings 3, 4, 6 and 7.
7. **Copy keys** for every r2 string, through `/copy-review`. Retire `card.notOwned` and the
   status-pill test (finding 12).
