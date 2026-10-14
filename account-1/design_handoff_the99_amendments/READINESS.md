# READINESS — Four amendments (R3)

**R3 · self-assessed overall: 🟡 Yellow, and one amendment is the reason.** Amendments 1, 3 and
4 audited Green at R1 and are cleared to build; R2 corrects figures, revises §1's value on
review feedback, and rules on §2's phone entry point. Three of the four are
🟢 Green with rulings that cost nothing behind either answer. Amendment 2 is 🟡 on a hard
dependency and one Product decision.

| # | Amendment | Verdict | Blocks on |
|---|---|---|---|
| 1 | The black mana pip | 🟢 | Nothing. One taste call to confirm. |
| 2 | Update a deck by re-import | 🟡 | **Amendment 3 landing first**, and a ruling that the diff is the undo for v1. |
| 3 | Decks over 99 | 🟢 | Nothing. One vocabulary ruling, both answers drawn. |
| 4 | Commanders detail, "Full card" | 🟢 | Nothing. One copy ruling, one optional addition. |

## Blocking — one item, in the whole hand-off

**Amendment 3 must land before amendment 2.** An update that lands a deck over 99 is refused by
`add-validation.ts:42`'s cap; the player's list then arrives five cards short with nothing on
screen saying which five went missing — the worst outcome available in a feature whose promise is
*the list becomes the deck*. If 3 slips, 2 needs a hard stop in the diff (refuse past 99 and name
the dropped cards): **a redraw of the apply bar and one new state.** This is the only dependency
between the four.

## The four rulings

1. **§1 — the black pip stops reading as near-black, and takes a hue.** `#98748F` is a
   mid-lightness violet: beside the other four it reads as the black one, in isolation it reads
   as a dark violet. Design's position is that a swatch's job is identity and the palette offers
   two axes — so **black takes both: the darkest of the five, and the only violet.** Three of the
   other four are identified by hue in exactly the same way; what black cannot be on a canvas
   this dark is identified by darkness alone, which is the defect. All 22 reads of the token sit
   beside a caption, so no surface leans on the swatch by itself.
   **R2/R3:** R1's neutral grey at the same lightness read as a second white at 9–12px, where
   the pip carries no glyph (`CONTRAST-black-pip.md` §7); R2's 305° violet then failed
   `contract.test.ts:145` at ΔE 0.087 against Oil and Iron, so R3 pushed the hue to 335° for
   0.115 against a 0.100 floor. **Rejecting the lift entirely means accepting a ring, and a ring
   cannot follow card art** — so the fallback is per-surface rings, which is a larger amendment.
   No redraw either way.
2. **§3 — `Over` is a fifth `statusPill` value.** The deck-import handoff closed the vocabulary
   at four; that reasoning was about `unresolvedCount`, a *new input*, and `built` is already an
   argument. The alternative (`Building` at 104) is drawn in the pill scale and costs one branch.
   Design does not recommend it: `Building` beside a `Complete` 99 makes the bigger deck look
   less finished for no stated reason.
3. **§4 — `Full card` becomes `Card details`.** The only player-visible change in that
   amendment. **If Product keeps the old label, the 262 → 180px art regression becomes a genuine
   problem** rather than a trade, because the surface would still be promising a picture.
4. **§2 — the diff is the undo, for v1.** The flow leans hard on it: removals first,
   `you added this` on hand-placed cards, a sentence counting them, a per-row `Keep`, and a CTA
   stating its own arithmetic. A player who skims all five and applies has lost cards they placed
   by hand over a month. Design's preference is to ship R1 as drawn and estimate undo as its own
   increment (it needs a new table or a soft-delete column). **What is needed now is Product
   agreeing on the record**, because every mitigation above is a consequence of that decision.
   **This is the only ruling in the hand-off whose "no" is a redraw.**

## Called, not asked — the short list

**§1** `PIP_TEXT` is deleted rather than promoted (all five keys would hold `--bg`) · one hex for
six themes, no per-theme toning; Phyrexia's `--g` exception does not generalise, and this value
sits ΔE 0.115 from the nearest of the six accents against a 0.100 floor · **`#8E7792` passes that
floor at exactly 0.100 and is rejected on headroom**, not looks — the two cannot be told apart at
9px · `#98748F` is minimum-passing on the *accent* gate, which is the binding one; `#7C7671`
clears 3:1 on every ground and still fails the glyph at 4.17, and a 305° violet at R1's pre-lift
lightness fails three gates — hue does not buy contrast · the 4.5 floor is applied to a 12px pip
glyph deliberately.

**§2** the product's first confirm step, and the previous refusals turned on the action being
reversible or cheap · the commander cannot be changed · additions have no per-row refusal ·
default is remove · **`auto` is cleared on unchanged cards the list names**, so the shipped sweep
cannot later delete what the player just declared — the least visible call in the hand-off ·
unresolved rows are replaced, not merged · the update strip's dismissal is not persisted · the
celebration is suppressed with no new flag · 75% is the everything-out threshold and it is a
judgement.

**§3** `Complete`/`Playable` narrow to exactly 99 · cutting 104 → 99 by hand fires the reveal,
and Design wants that · `MATURE_DECK_SIZE` stays `>= 99` — do not narrow it for symmetry ·
`deck-full` and its message are deleted, not reworded · no numeric ceiling · the trim line is in
the spine's centre column, not a band.

**§4** `lightbox.tsx` and its test are deleted, not left unused · the sharp art goes 262 → 180px,
drawn at both sizes so the audit can judge rather than take the argument · `Tap anywhere to
close` is deleted, the gesture kept · no sibling list, so `1 of 1` · no `Add` control on this
route · the desktop trigger is beyond the brief and can be dropped alone.

## Worth reading before estimating

- **§1 is one CSS file and one deletion.** No component file is touched; all 22 reads go through
  `WUBRG_COLOR` → `var(--b)`. **CI gates half of it:** `contract.test.ts:145` asserts
  `deltaEOk(pip, accent) >= 0.1` per pip per theme, which is the constraint that set the value —
  **run `pnpm test` before believing any candidate.** What CI cannot see is the legibility half:
  there are no visual-regression baselines for pips, so the six-theme frame is the reference for
  that and a reviewer's eyes are the gate.
- **§3 is arithmetic in two components plus one branch in `status.ts`.** The thing to check
  first in review is that the pill, count, bar and both lines all derive from `counts.built`
  (the optimistic list) and not `deck.built`, or crossing 99 will flicker.
- **§2 is the only real build.** One route, three components, one pure module, one server
  action, one URL param. The diff is computed **twice on purpose**: the client renders a plan,
  the server re-parses and re-plans on Apply, and the only thing the client contributes is the
  `keep` array — trusting a client-computed diff would let a crafted request delete an arbitrary
  set of cards. `buildDeckImport` is reused unchanged.
- **§4 is a deletion plus two props.** Nothing in `src/components/cards/` changes and the
  provider is already mounted on the route.
- **Re-measure colour after 8-bit quantisation**, per the themes handoff's own finding. Every
  figure in §1 is post-quantisation.
- **`import-actions.ts`'s doc comment is now wrong** and it is the sentence that warned against
  this feature arriving by accident. It should point at `updateDeckFromList` and keep saying that
  `importDeck` itself never dedupes. It is the **only shipped edit** in amendment 2.

## Not blocking, across all four

- **No new token, no new key, no new hex beyond one value, no new motion class, no new modal, no
  toast, no new empty-state construct, no schema change, and no `--danger` anywhere.**
- The 36-key theme contract stays at 36 keys.
- Untouched: `celebration.ts`, `availability.ts`, `fill.ts`, `last-slots.ts`, `suggest.ts`,
  `RollupBands`, the role counter strip, `ColorPip`, `OwnershipDot`, `AvailabilityGlyph`,
  everything in `src/components/cards/`, `buildDeckImport`, and every shipped failure banner.
- Under 99, every deck surface is byte-identical to what ships.
- The fill controls and every suggestion path still stop at 99.
- Every figure in the package reconciles: §1's 18 grounds and the candidate table are computed
  from the hexes at `main`; §2 is 91 built · 106 lines → 103 matched + 3 unnamed · 84 + 19 = 103 ·
  7 out, 1 kept → 6 removed · 91 − 6 + 19 = 104 · `?updated=19-6`; §3 is 104 = 96 owned + 8 to
  buy, 99/104 = 95.2%, and 137 gives 72.3% / 27.7%.

## R2 change log

Everything below is done and in the files; it is here so the re-audit can diff R1 to R2 without
re-reading the canvas.

| # | Change | Where |
|---|---|---|
| 1 | **`--b` becomes `#98748F`** (violet-grey) instead of R1's neutral `#837D78`. Same lightness (L 0.2115 vs 0.2085), C 0.059, every gate unchanged. Answers the review's *"reads almost identical to white"*. | canvas §1 R2 panel + all pip frames · `CONTRAST-black-pip.md` §§1–6 · both READMEs · this file |
| 2 | **§2's phone entry point is *both*** — the `⋯` menu item appears at 390px (PR #289 shipped the menu there at a 44px target) and the spine control stays. | canvas §2 entry panel + rejected-entries panel · `STATES-reimport.md` states 1–2 · §2 decision 1 |
| 3 | `--border-dashed` floor is Screen Glow `#3F4B55`, not amonkhet — 2.21 at R2's value, **2.23** at R3's (see the R3 log, row 6). | `CONTRAST` §4 · both READMEs · canvas §1 body + cover |
| 4 | The binding `--bg` glyph case is **Moonlit at 4.65** (lightest `--bg` by luminance), not Rune Frost. `CONTRAST` §2 always said so; the README was wrong. | `CONTRAST` §2 · both READMEs · cover |
| 5 | `lightbox.tsx` is **282 lines**, not 253. | `PARITY` header · §4 README · canvas §4 (four places, incl. the candidate table's `Lines of bespoke code` row) |
| 6 | `LightboxCommander` carries **six** fields, not five. | §4 README prose (`PARITY` row 20 was already right) |
| 7 | The pip is read **22 times across 15 component files**, not "fourteen call sites". | both READMEs · canvas §1 (three places) |
| 8 | §2 has **24** states, not eighteen. | `STATES-reimport.md` header |
| 9 | `deck-full` has **two** dead tests (`mutation-result.test.ts`, `add-validation.test.ts:66`). | §3 README + engineering notes |

**Not changed by R2:** every drawn frame's geometry, every other figure, all four copy files'
strings (only §1's token comment was reworded), and the three Green verdicts. The revision to
`--b` reopens **nothing** in amendments 2, 3 or 4 — the pip's only cross-amendment appearance is
§4's Gonti frame, which is drawn at the new value.

**Ledger reconciliation, re-checked after R2:** the canvas states no contrast figure that
`CONTRAST-black-pip.md` does not, in either direction; §1's per-theme "after" chips are
4.29 / 4.39 / 4.21 / 4.57 / 4.34 / 4.07; the amonkhet ground trio is 4.66 / 4.29 / 3.81; and the
only surviving mention of R1's `#837D78` and its 2.20 floor is the comparison panel, where both
are labelled as R1.

## R3 change log

The R2 audit found one thing both earlier rounds missed, and it is a build failure rather than a
wording problem.

| # | Change | Where |
|---|---|---|
| 1 | **`--b` becomes `#98748F`** (hue 335, C 0.059) instead of R2's `#857A93`. `src/lib/theme/contract.test.ts:145` asserts `deltaEOk(pip, accent) >= 0.1` across all five pips × six themes; R2 measured **0.087** (Oil and Iron) and 0.092 (Rune Frost) — two failing themes — and R1's neutral failed harder at 0.064. R3 reaches **0.115** on both. | canvas §1 (panel, every frame, the six-theme grid) · `CONTRAST-black-pip.md` §§0–7 · both READMEs · this file |
| 2 | **`#8E7792` rejected on headroom**, not looks: it passes at exactly 0.100 (0.101 Rune Frost). Both candidates are drawn at 9/12/22px because the two cannot be told apart there — the ledger is the referee. | canvas §1 comparison row (five candidates) · `CONTRAST` §5 |
| 3 | **"CI cannot see this change" was wrong** — CI gates it. Corrected everywhere it appeared; the estimate now says to run `pnpm test` before believing a candidate. | both READMEs · both READINESS files |
| 4 | **The chroma-budget argument is withdrawn.** The budgets (≤0.02 surfaces, ≤0.04 borders, ≤0.03 text) are stated per class and never applied to WUBRG — `--r` ships at C 0.138. | `CONTRAST` §0 · both READMEs |
| 5 | **§1's ruling sentence rewritten, not patched.** R2 deleted the word "achromatic" and left "the only pip", which asserts nothing. It now reads: black takes both axes — the darkest of the five, and the only violet — which is how three of the other four are identified too. | both READINESS files |
| 6 | Figures moved with the value: grounds **3.37–4.88**, glyph **4.65** (Moonlit binding), vs `--w` **3.31**, `--border-dashed` floor **2.23** (Screen Glow), pip-to-pip **0.122** (nearest `--r`, was `--u`). | `CONTRAST` §§1–6 · canvas §1 · both READMEs |

**Not changed by R3:** every frame's geometry, every figure in amendments 2, 3 and 4, all four
copy files' strings (§1's token comment carries the new value and the new reason), and the three
Green verdicts. The pip's only cross-amendment appearance is §4's Gonti frame, drawn at the new
value.

**Ledger reconciliation, re-checked after R3:** the canvas states no figure
`CONTRAST-black-pip.md` does not, in either direction; §1's per-theme "after" chips are
4.31 / 4.42 / 4.23 / 4.60 / 4.37 / 4.09; the amonkhet ground trio is 4.69 / 4.31 / 3.83; and the
only surviving mentions of `#837D78` and `#857A93` are the comparison rows, where both are
labelled and both are marked as failing.

## A note for whoever reassembles this package

The canvas is a concatenation of the four per-amendment canvases, which link their own copy
files by name. **Do not rename those four files inside the package.** They were numbered
`1 · … 4 · …` at packaging time and it broke every one of those links, twice — once at R2 and
again when R3 re-concatenated from source. The filenames now match the per-amendment folders
exactly, so a rebuild needs no fix-up step. If a future package wants ordering, put the number
in the README's file list, not in the filename.
