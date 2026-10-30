# Low N — how a thin summary says it is thin (§8.5)

§5 is explicit: **no minimum-games gate.** The summary is computed from the first game, and an
artificial "come back after three games" threshold would hide the feature during exactly the window
when someone is deciding whether to keep using it.

That leaves the whole problem to presentation, and it is a real problem: `card_flow` at `1 of 1` and
`card_flow` at `9 of 10` are the same shape, the same bucket and the same sort position. If they
also look the same, the tab tells its first-time user something it has no business asserting.

**The answer is three dials, and one constant.** `PATTERN_MIN = 3`.

---

## The three dials

### 1 · The denominator, always inside the figure

| Games | Figure |
|---|---|
| 1 | `1 down` / `1 up` |
| 2 | `2 of 2` |
| 3 | `3 of 3` |
| 5 | `4 of 5` |

The count and its denominator are **one string in one slot**, never a figure with a footnote. A
reader cannot see `4 of 5` and lose the 5.

**No percentages, at any N.** This is a permanent rule and it is what makes the low-N rule
unnecessary elsewhere: `3 of 3` cannot be quoted out of context and `100%` is designed to be. There
should be no percentage formatter anywhere in this feature.

**`net` is never rendered.** It sorts the buckets and shows no face. A signed integer needs a
legend, and `−3` invites arithmetic — across axes, across games — that nothing here supports.

At **N=1** the figure is a *direction and a count*, not a ratio: `1 down`, because `1 of 1` in a
column headed "Fix" is a ratio that reads as certainty.

### 2 · The heading, which changes grammar at three

| Games | Headline |
|---|---|
| 1 | **One game logged.** — *a description* |
| 2 | **Cards in hand went wrong both times.** — *a leaning* |
| 3+ | **Cards in hand is letting this deck down.** — *a finding* |

Below three the sentence describes **what was logged**. At three and above it states a finding
**about the deck**. One sentence, two moods, and the mood is the confidence signal — free to read,
impossible to miss, and it degrades gracefully for anyone who cannot see colour.

Sub-line, in each case:

| Games | Sub-line |
|---|---|
| 1 | `Nothing to read into yet — it is on the record. Two more and this turns into something you can act on.` |
| 2 | `Two games. Both of them, which is worth noticing and not yet worth calling a pattern.` |
| 3+ | `Marked in 3 of 3 games — every one you have logged. Record 2–1 across 3 games.` |

### 3 · Ink, which is earned at three

| | Below three | Three or more |
|---|---|---|
| Figure | `--fg-body` | `--warning` (Fix) / `--success` (Keep) |
| Bar | one neutral `--border-strong` segment | split `--success` / `--warning` |
| Bucket heading | **absent at N=1**, neutral `--fg-faint` at N=2 | `--warning` Fix, `--success` Keep |

`--success` and `--warning` are verdict colours in this product — they are what the status pill uses
to say *complete* and *missing 12 cards*. Spending them on one game puts a verdict's colour on an
anecdote.

---

## The tiers in full

### N = 0
No summary. The empty state is the whole tab. No Keep / Fix strip with nothing in it, no history
heading over nothing.

### N = 1 — a record
- Headline: `One game logged.` Record beside it: `1–0 · won it`.
- **No bucket headings at all.** The marks appear under `What that one game said`, which is a true
  title, in vocabulary order — not split into Keep and Fix.
- Figures `1 up` / `1 down`, `--fg-body`. Bar: one `--border-strong` segment.
- Sub-line per cell: `1 game`.
- A single forward-looking clause, and it promises a **count**, never a recommendation.

### N = 2 — a leaning
- Headline in the leaning voice; the sub-line names the denominator in words.
- **Keep and Fix appear**, headings neutral. Mixed appears if non-empty.
- Figures `2 of 2`, `1 of 2` — still `--fg-body`. Bar still neutral.
- Ordering is already `summarizeGames`' final ordering; nothing about the sort changes with N.

### N ≥ 3 — a finding
- Headline is the strongest Fix in the finding voice, denominator inside the sentence.
- Full ink: `--warning` on Fix figures, `--success` on Keep, split bars.
- Mixed prints as its one line under the rule.

### Headline fallback order, at every N ≥ 1
1. Strongest **Fix**.
2. If Fix is empty — strongest **Keep**, phrased as a keep (`Board presence is carrying this deck.`).
3. If both are empty and **Mixed** is not — say so plainly
   (`Nothing has pointed one way yet.`).
4. If no axis was marked in any game — the record line alone
   (`3 games logged. 2–1.`), with no aggregate panel at all.

---

## What was rejected

- **Opacity / fading the panel at low N.** Makes thin data *harder to read* rather than easier to
  weigh, and fails contrast at exactly the moment a new player is deciding whether this tab is worth
  using. Low N is quieter in *ink*, never in legibility.
- **A confidence badge, a star rating, an error bar.** A second scale to interpret, invented here,
  with no definition anywhere in the data. The denominator is already the confidence, and it is
  already exact.
- **"2 more games for a pattern" as a progress meter.** Reinstates in copy the gate §5 refused, and
  turns logging into a chore with a target. The one nudge that survives is at N=1 only, and it
  promises a count rather than an unlock.
- **Hiding axes marked only once.** That is a gate wearing presentation's clothes. Every mark the
  player made stays on screen.
- **Rounding or bucketing the counts** (`most games`, `sometimes`). Vaguer *and* less honest than
  the integers, which are short enough to print.
- **Sorting differently at low N** (e.g. by recency until three games). Two orderings for one panel,
  and it would take the order out of the pure function that §7 tests exhaustively.

## What the audit can check mechanically

1. No string in the feature contains `%` applied to a game count.
2. `net` appears in no rendered string.
3. Every rendered count is accompanied by its denominator in the same element.
4. `PATTERN_MIN` is read from one constant by the headline, the bucket headings and the cell ink —
   the number `3` is inlined nowhere.
5. At N=1 no element carries `--success` or `--warning`.
6. At N=1 no element renders the words `Keep` or `Fix`.
7. Bucket ordering is `summarizeGames`' output order at every N, unmodified.
