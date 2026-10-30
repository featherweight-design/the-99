# About page — correction for `New` and `Draft`

`design_handoff_the99_deck_statuses_pending/` · R6 · supersedes this file's R4 and R5 revisions

**The entries amended for R4 describe things that do not exist.** The unfilled badge and the bright
left edge are retired; so is R5's `To build`. The state they were all reaching for is now the
**`Draft`** status — a deck with no committed version, at any card count — with **`New`** taking
the 0-card slot `Draft` used to hold. Both entries must be corrected **in the same build** that
lands the vocabulary: a page teaching a retired mark is worse than one teaching nothing.

The count stays at **33**. No entry is added or removed.

---

## 1 · `versions` (chapter 03) — key 3 rewritten

The key line added at R4 described both marks. It is replaced, not removed: the entry still owns
the draft/commit model, and the seventh value is where that model becomes visible outside the deck
page.

```
keys: [
  'the draft is reviewable before it lands: every add and cut beside the committed list, with nothing counted twice.',
  'a version carries its own record, so you can see whether a change helped rather than only that it happened.',
- 'a deck you have never committed shows an unfilled status badge wherever it is listed — it is a plan, not a deck yet. Once you commit v1 the badge fills in, and a bright edge appears whenever the list drifts from the version again.',
+ 'a deck you have never committed reads New until it has cards, then Draft — commit v1 and it takes the status its list earns.',
],
```

Still 3 keys. It names both phase values and the threshold they turn on (a committed version),
and "the status its list earns" points the reader at the six that follow without listing them —
which is `statuses`' job, one chapter on.

## 2 · `statuses` (chapter 04) — the caption sentence is deleted

```
- An unfilled badge belongs to a deck you have never committed — a plan rather than a deck. A filled badge with a bright left edge is a real deck you have edited since its last version. Neither is a seventh status.
```

**Deleted, not rewritten.** That sentence existed to explain marks that were *not* statuses. There
are no marks now, and both `New` and `Draft` are simply values this entry teaches — the caption
needs no special case for them, in the same way it needs none for `To buy`.

The entry returns to its shipped caption and keeps its four keys (the template cap). The keys
describe the *thresholds*, not one value each, so a seventh value does not need a fifth key.

⚠ **One check for whoever builds this:** if any of those four keys names `Draft` as the 0-card
state, that key is now wrong and must move to `New`. It is a threshold change inside an entry that
teaches thresholds — the one place in About where this rename genuinely bites.

## 3 · `ABOUT_VERSION` does not move

It went to **5** on 2026-09-18 and put `/about` in front of every account. Bumping a second time
inside a week — to correct our own copy — spends the reader's attention on our error. And `/about`
has no *amended* state (`since` is the version an entry **first** appeared in), so a returning
reader would be interrupted and then shown a page with nothing marked: the exact defect recorded
at the foot of R4's READINESS.

**Correct in place at 5.** `since` stays `1` on both touched entries, and no `NEW` plate is spent.
This is now the **second** correction in two days, which strengthens the ruling rather than
weakening it: the reader should not be interrupted twice for our own revisions.

The `amended` treatment that would make a future bump honest is still owed and still Design's. It
is not this round.

## 4 · The specimen

The `versions` entry is a **plate** entry, so its figure has room. It carries **one badge, twice**:
`Draft` (dashed), then `Complete` after the commit. Two readings, one arrow — replacing R4's
three-reading specimen, which drew two retired marks.

Drawn on the R6 canvas (`6a`) of `design_handoff_the99_deck_statuses_pending/`.

## 5 · `resume`'s caption — one word, and it is this round's debt

The caption says "the keyline on the left is the deck's status in the same **six** colours as its
badge". That sentence now has two faults, and they are not equal:

- **"six" is wrong at seven, and this round is what makes it wrong.** It is corrected here:
  **"in the same colours as its badge"**. Dropping the numeral rather than incrementing it is the
  fix, because a count in prose is a thing to get wrong again on the next value.
- **The keyline is dead code** — `statusKeylineStyle` is rendered by nothing (READINESS, "Carried
  out of scope"), so the sentence describes something the app does not draw. **Pre-existing and
  not this round's.** It wants its own ticket: either the keyline returns or the clause goes.

Fixing the first without the second leaves a true sentence about a thing that does not exist,
which is the honest intermediate state and better than an untrue one.

## What is deliberately not touched

- Chapter counts, the index, and the `NEW` plate. Unchanged, all three.
- Every entry other than `versions`, `statuses` and `resume`.
