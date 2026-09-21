# Readiness — the push line and the upgrade path (Round 4 of 5, R2)

**Self-assessment: 🟢 Green.** All six audit items are corrected rather than argued, the top-off
premise is re-made, and the round's scope is back where it started: **one union member in a pure
function, plus copy.** No shipped surface is modified by this round.

## The six audit items

| # | Finding | Response |
|---|---|---|
| 1 | Marks placed against a convention the app doesn't have | **Reverted in full.** Round 1's inline placement stands on all three hosts. |
| 1b | Five marks claimed, three ship | **Overridden by the user: all five stay, at 16×16.** The Round 2 dependency is recorded as a sequencing note for eng, not a reason to draw less. |
| 1c | The Consider tile lost shipped affordances | **Overridden by the user: the treatment stays** — dot and marks on the line above the name, no pips on the art. **Now named as an explicit Add-panel amendment** rather than a side effect. |
| 2 | `inert` has three reachable shapes, two sentences | **Third clause written** for `to === [4]`. |
| 3 | `inert` after `ruleless` mutes the canonical add | **Precedence flipped**; the rule behind it stated. |
| 4 | `ruleless`'s closing clause is false with coverage | **Second form**, branching on the coverage flag. |
| 5 | `unquantified` quotes a rule brackets 4–5 lack | **Second form**, branching on `to[0] >= 4`. |
| 6 | `counts` names bracket 3's limit always | **Binding bracket and its figure**, with *allows none* at nought. |

### 1 — the marks, and why the answer is "neither host moves"

**Round 4 had no authority to move them.** `design_handoff_the99_card_mark/READINESS.md` states the
placement as a rule with a reason — *copies first, mark last, on every surface* — and ships it
inline after the name in both `/collection` views and after the count on the decklist row. The
phrase "per the shipped card row" in R1 described something that does not exist, and the error was
citing a convention instead of reading one.

**Relocating a shipped mark on three surfaces to suit a fourth is a Round 1 amendment**, and
nothing in this round justifies opening one. These three hosts take the inline placement as-is.

**Two parts of finding 1 were overridden by the user after review**, and both are now stated as
decisions rather than left as implications:

- **All five marks stay, at 16×16** — lemniscate and drawn-up included. The Round 2 dependency is
  real but is a *sequencing* fact: this build either lands after those glyphs or ships Round 1's
  three and picks the other two up at call sites that already exist, with no string, size, ink or
  placement change either way.
- **The Consider tile keeps this round's treatment** — ownership dot and marks on one line above the
  name, no mana pips on the art. **This is an amendment to the shipped Add-panel tile**, and the
  package now says so plainly so it is reviewed as one. It is the only shipped-surface change in
  the round.

### 3 — the precedence flip, and the rule behind it

`inert` now sits **above** `ruleless`. The general rule: **an event outranks a standing count.** A
tutor count is a standing fact the findings block already reports; a combo completing happens once.
Full order: `moves`, `counts`, `inert`, `ruleless`, `unquantified`, `none`.

That also settles the case R1 got right by accident: **a Game Changer that completes a combo keeps
its `counts` sentence**, because a count that has just crossed a limit is itself an event, and its
combo rides the third line.

### 6 — the binding bracket, including when nothing moves

`bindingBracket` is the lowest bracket in `from` whose limit the new count breaks. **When nothing
moves there is still a binding bracket**: the lowest bracket in the deck's current reading, whose
limit the count is approaching. That is the figure a player can act on, and it is the only reading
under which the non-moving `counts` sentence is worth printing.

## The top-off premise, re-made

R1 costed the list at *up to 38 rows*, which is the number of cards a player is adding, not the
number the list draws. The real figures are **262 / 423 / 480**.

- **Legibility.** The unit is the **viewport, not the list** — ten to fourteen rows at a time, of
  which the marked ones are a handful. That ratio is a property of the *rules*, not the pool, and a
  larger pool makes it better: the pool grows with colour identity while rule-touching cards grow
  far more slowly, and a ranked list's tail is where the unremarkable cards live. **What would
  break it is a filter that concentrates them** — a *Game Changers only* view would put the slot on
  every row. None exists; if one is added, the slot should collapse to clause density there.
- **Cost.** The real argument was never the row count: `bracketDelta` is **pure and synchronous
  over data the page already holds**, which is why there is no fetch at any size. **What 480 does
  change is where it may be called** — see the engineering list.

## Engineering list

| # | Item | Size |
|---|---|---|
| 1 | **`inert` union member** in `BracketDelta` — `{ kind, fact: "combo", combos, to }`, **precedence above `ruleless`** | one branch in a pure function |
| 2 | **`bindingBracket` + its `limit` on `counts`** (and `from`, already computed) | contract |
| 3 | **Compute the delta inside the windowed row, not by mapping the pool**, memoized by `(oracleId, profileVersion)` | the one new constraint in this round |
| 4 | The atom in three hosts, two densities | one component |
| 5 | The path as a disclosure on the climb's lower rung, with target chips | one component |
| 6 | Copy module(s) from `push-line - copy strings.ts` | mechanical |

**Not in the list, and deliberately:** no change to `CardFactMark`, no change to any collection or
decklist surface, no change to the Consider tile beyond its new clause.

## Gaps and open items

1. **The path is invisible until a rung is tapped.** Deliberate — it is the rung's answer, not a
   fifth block — but it is the first thing to want if nobody finds it. If it bites, the rung's link
   gains the count (*what would have to go, four things*), derivable and still one line.
2. **A batch push line is uncomputable today**, and the pool's real size makes it harder rather than
   easier: a running total would re-derive a moving profile across a selection drawn from hundreds
   of candidates, recomputed on every tick. **Still the thing to want next, still a sub-project.**
3. **`unquantified` form B names brackets 4 and 5 explicitly.** If the rules text ever gains an
   extra-turn clause up there, this string is the first casualty; it is the plainest true statement
   available today.
4. **Ordinals** need a formatter; locale is unspecified in this project, as it is for money.
5. **The blocked example's commander** must actually be on WotC's Game Changer list for that state
   to exist. The state is structural either way — it is the `candidates.length < removeCount`
   branch.
6. **Nothing tells a player the push line exists.** Accepted: a legend for a slot that is usually
   absent is worse than the absence.
7. **The same card in two path items is listed twice.** One foot sentence names the overlap. The
   alternative — a per-card annotation — was tried and dropped: it made the count rules look like
   they had exceptions.
