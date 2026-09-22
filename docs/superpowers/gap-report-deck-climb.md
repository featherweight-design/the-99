# Gap report — the climb (PR 4b)

`design-review` against `design/design_handoff_the99_verdict` §2, `STATES-verdict.md` §B and the
Turn 4 canvas, before `gh pr create`.

**Result: 8 gaps found, 7 fixed, 1 carried as a design-table note.** Nothing needs Design.

## The gaps

| # | Element | Design | Shipped | |
|---|---|---|---|---|
| 1 | the 390 label row | mark · name · role label pushed right, one line | the desktop two-line stack at both widths | ✅ |
| 2 | the 390 body | indented 7px under the mark (5px on the declare line) | flush | ✅ |
| 3 | each figure on the rung that holds | its fact mark before the rule name | no mark | ✅ |
| 4 | the cut phrase | the cards or the count in `--fg` at 600 | one flat muted string | ✅ |
| 5 | 390 type | role label 8.5, name 13, body 12/1.55, allowance 9.5, ringed `?` 13/8.5 | every desktop value | ✅ |
| 6 | the 390 figure list | a column at 6px | the desktop wrapping row | ✅ |
| 7 | 390 rung padding and gaps | 11px horizontal, 7/9px rows | 12px and a uniform 10px | ✅ |
| 8 | the design table's own drop strings | `dropCut` / `dropCutNamed` | four differently-shaped keys | note |

Gaps 5, 6 and 7 are one root cause: the phone column was never split out of the desktop values.
Gaps 1 to 4 are what a reader would actually see — a layout that differed and two pieces of ink
that were missing.

**Gap 3 draws at 16px, not the canvas's 12.** `CARD_FACT_MARK_PX` is 16 on every surface and is
not a prop, ruled 2026-09-21 after the set shipped at 12, 13, 14 and 16 across six mounts and the
same fact read as a different mark depending on which list a player was looking at. That ruling
supersedes the canvas here, as it already supersedes the handoff's 12px floor.

**Gap 8 is carried, not fixed.** The package ships `dropCut(n, rule)` — *"Cut {n} {rule}, only
{n} fewer allowed"* — which uses one parameter for both the cut and the allowance and so cannot
state them both; and `dropCutNamed(card, why)`, whose separator is an em dash this repo's shipping
strings do not carry. The four keys that shipped state the bracket by name, count in words, and
join on a colon. `check:copy-drift` is green because the table quotes a form the code never
emitted rather than one it stopped emitting — which is exactly the case that check cannot see, so
it is recorded here instead.

## Three resolutions this pass settled rather than reported

**The mark at 26/36 desktop and 22/26 phone.** The canvas draws 28 on the neighbours; `ASSETS.md`
declares itself normative on sizes and says *"28 is not a ship size"*. 22 and 26 are different
FORMS — the chip file and the full one — so the neighbour rungs mount the mark twice and hide one
per width. `BracketMark` throws on an `mdPx` that crosses a form boundary rather than drawing the
wrong art at one of the two widths, and the probe reads the resolved width at each.

**`see all brackets →` is absent rather than drawn dead.** The reference sheet behind it does not
exist. A link to nothing is the same failure as the handoff's own second build guardrail — an
affordance onto nothing is worse than none — so the foot is not drawn at all. It arrives with the
sheet.

**`no cap` on a rung at 4 or 5.** `limits` covers brackets 1 to 3 because those are the only
brackets with card limits, which the round's own copy states in the sentence a `[4,5]` deck reads:
*"Four and five have no card limits between them."* The canvas draws `3 allowed` beside a
bracket-4 figure, which is bracket 3's allowance on a rung that is not bracket 3's. The shipped
reading is `no cap`, and the divergence is recorded here rather than routed: the handoff's own
sentence settles it.

## Two defects the CONTACT SHEET found, which no assertion could

Both were correct markup drawing the wrong sentence, and both were invisible to a property table
because the property was right and the CONDITION was wrong.

- **The declare rung fired on the `above` rung of any range.** A `[1,2]` deck read the 4-5
  sentence at bracket 2 — *"Four and five share their card limits"* — claiming two brackets share
  limits that differ. §2 says the declare split is 4-5's by name.
- **A rung that holds nothing fell back to the rung ABOVE's sentence**, so a clean deck drew
  *"Nothing rules it out. It permits more than this deck uses."* twice, one directly under the
  other. It draws nothing now: the verdict block above has already said what the deck is.
