# PROSE — one string, two surfaces

**§5.3's answer in full.** This is the item the handoff prompt says cannot slip to a later round,
because the prose is generated once for ~3,300 commanders: if it is written to fit only
`/commanders/[slug]` and the home hero later needs a different length, that is a full re-backfill.

Nothing here is a design preference. It is a **contract the index build can enforce**, stated so
that one string renders correctly in both places without either surface asking for a variant.

---

## 1. The ruling

**The home hero card prints sentence 1 and only sentence 1, clamped to two lines, from the same
stored string.**

Not a second column. Not a shortened variant. Not a summary. Not a server-side truncation.

Sentences 2 and 3 — the templated per-user clauses — **stay on the detail page**, for two reasons:

1. The home card's completeness row already carries sentence 2's fact in figures
   (`own 34 of top 100`), and printing it in prose beside its own bar states it twice.
2. Sentence 3 is a gap. The dashboard is not where a gap is actionable, and a gap you cannot act on
   is a worse sentence there than no sentence. Must-not 4's logic — do not put a prompt where the
   thing it prompts is not — applies to the card as much as to the section.

So the home card needs exactly one sentence to fit exactly one narrow column, and the detail page
needs the same sentence to read as prose in a wide one.

## 2. Why a length alone cannot do it

Measured off the drawn frames, at the type each surface actually uses:

| Surface | Type | Column | Two lines hold |
|---|---|---|---|
| Detail section | 13.5px / 1.6 | `max-width: 640` | **~160 characters** |
| Home card, desktop | 13px / 1.55 | 420px cap | **~128 characters** |
| Home card, 375px | 13px / 1.55 | **~183px** | **~58 characters** |

**The 183px is a correction.** R1 measured this column at ~233px and derived its threshold from
that figure. The shipped card nets roughly 183px at 375: the dashboard wrapper's `p-5` comes off
first, then the 84px art column, then the info area's own `p-6`. R1's own §9 warned that the
threshold has to come down if this column falls below ~180px — it was already there.

The narrowest column shows about **58 characters** in two lines. A sentence written to 58 characters
reads as a fragment in a 640px column — it would be the shortest paragraph on the page, under a
heading, in a section whose entire job is to explain something. A sentence written to 160 loses more
than half of itself on a phone dashboard.

**No single length reconciles 58 with 160.** Which is why the second rule is not a length.

## 3. The contract

### Rule 1 — the band

> **One sentence. 110–160 characters. Hard cap 190.**

- One sentence: a second sentence in sentence 1's slot would be half-clamped on the home card, and
  §4.2 gives the generated part exactly one sentence anyway.
- 110 is a floor, not a suggestion: below it the detail section reads as a caption.
- 160 is the target ceiling; **190 is the reject threshold** at index build, so a slightly long
  string is stored and a runaway one is not.

### Rule 2 — front-loading

> **The claim lands inside the first 55 characters. Everything after the first comma is
> elaboration, and losing it must cost nothing but detail.**

This is the rule that makes the two-line clamp safe. The home card is not showing a *shorter
sentence*; it is showing the **first two lines of the same sentence** — so those two lines have to
be a complete thought on their own, with the rest reading as more detail rather than as the point.

**Passes** — 120 characters, first break at 49:

> *Kess decks tend to cast the same few spells twice, leaning on cheap draw and graveyard value
> rather than one combo line.*

At 375px the clamp shows `Kess decks tend to cast the same few spells twice, lean…` — the claim,
intact. The reader who taps through gets the elaboration. The reader who does not has lost nothing
they needed.

**Fails review** — 126 characters, in band, first break at 23, and broken:

> *Built around cheap draw, recursion and a graveyard nobody else is using, Kess decks win by
> casting the same spell three times.*

Its claim does not begin until character 73 and does not complete until the full stop. The clamp
cuts the verb, and the reader gets a list of ingredients and no dish. **Length is not the test;
position is.**

**And the comma predicate does not catch this one** — its first break falls at 23, comfortably
inside the threshold, because the sentence opens with a subordinate clause. This is the limit of the
mechanical checks and it is worth stating plainly: **§4 enforces the shape a front-loaded sentence
has; it cannot verify that the shape holds the claim.** A generator that reliably produces
`{subject} tend to {verb}` openings satisfies both; one that varies its syntax needs the reviewer.

### Rule 3 — inherited from §4.1 and §4.2, restated because the generator needs all of it in one place

- **Subject is the commander's decks**, not the commander and not the player: *"Kess decks tend
  to…"*. The index knows what decks do; it does not know what a card does.
- **No card names.** Not one. A named card is a rules claim by implication, and the synergy panel
  below names cards with figures attached.
- **No rules text and no interactions as fact** (must-not 2).
- **No second-person claim** in sentence 1 — the per-user sentences own "you". Sentence 1 must read
  identically for every player, because it is stored once for all of them.
- **"tend to" / "usually" / "mostly", not "will" or "can".** The index is a distribution, and the
  hedge is the honest verb.

**Both counts are measured, not estimated** — 120 and 126 characters including spaces and the
terminal period. R2 stated 119 and 125; the sentences were right and the arithmetic was not.

## 4. The predicates

All three checks are mechanical, run at write time, and need no model in the loop:

```ts
const OK_MIN = 110, OK_MAX = 160, HARD_MAX = 190, CLAIM_BY = 55;

function acceptProse(s: string): boolean {
  const t = s.trim();
  if (t.length < OK_MIN || t.length > HARD_MAX) return false;
  // Exactly one terminal period, at the end.
  if (t.split(/[.!?](\s|$)/).filter((p) => p.trim().length > 0).length !== 1) return false;
  // Front-loading: the first clause boundary must fall inside CLAIM_BY.
  const firstBreak = t.search(/[,;—]/);
  const claimEnd = firstBreak === -1 ? t.length - 1 : firstBreak;
  if (claimEnd > CLAIM_BY) return false;
  // Vocabulary floor — no card names is not checkable, but the hedge is.
  if (!/\b(tend|tends|usually|mostly|often|typically)\b/i.test(t)) return false;
  return true;
}
```

Notes on the predicates:

- **A comma-free sentence passes** if it is under 55 characters end to end — a short declarative
  claim is front-loaded by definition. In practice such a sentence fails the 110 floor, so this
  branch mostly exists so the check does not reject a legitimate 115-character sentence whose only
  break is an em dash at 50.
- **A leading subordinate clause defeats the check** (see the failing example above): its first
  break is early, so the predicate passes a sentence whose claim is at the end. Catching it needs
  syntax, not position. The prompt should require the sentence to open with its subject; review is
  the backstop.
- **The hedge check is a proxy**, not a guarantee. It catches the confident-assertion failure mode
  cheaply. It cannot catch a hedged sentence that says nothing (gap 6).
- **No card-name check.** Matching ~30,000 card names against every string is possible and it is
  the wrong place for it; the prompt forbids names and review catches the residue.

## 5. Reject, never truncate

**A string that fails any predicate is not stored.** The commander falls to the **prose-absent
state**, which the canvas draws as a normal state at both widths on both surfaces:

- Detail section: heading + the two templated sentences, nothing else, no note.
- Home card: no paragraph element at all — the card as it ships today.

Truncation was the alternative and it is worse in every direction: it produces a sentence nobody
wrote, it produces it silently, and it produces it *permanently*, because the stored string is what
review sees. A missing paragraph is visible to the review queue as a missing paragraph. A truncated
one looks like a paragraph.

There is also no cost to falling back. §4.1's whole point is that the window between a set landing
and the next index run always exists, so the absent state is on screen regularly regardless.

## 6. The clamp is CSS

```
display: -webkit-box;
-webkit-line-clamp: 2;
-webkit-box-orient: vertical;
overflow: hidden;
```

- The **full string stays in the DOM and in the accessible name** at every width. A screen-reader
  user on the dashboard hears the whole sentence, which is strictly better than the visual reading
  and costs nothing.
- No ellipsis string, no server-side slice, no second column in `commander_support`, no per-viewport
  branch in the component.
- The card is one stretched `Link` and the paragraph adds no interactive child, so nothing needs
  lifting above it. The clamped text sits inside the hit area, which is correct: wanting the rest of
  the sentence *is* wanting the page.

## 7. Placement on the home card

**Between the commander name and the completeness row, `margin-top: 10px`.**

13px / 1.55 `--fg-muted`, `max-width: 420` — the cap the completeness row already uses, so the two
blocks share a right edge. At 375 the column is the ~183px §2 measures, not the cap.

- **Above the name** it competes with the WUBRG pips and pushes the name — the card's actual
  headline — down.
- **Below the completeness row** it reads as a footnote to a figure it does not describe.
- **Between** them it reads as a subtitle to the name, which is what it is.

Quieter than the detail section on purpose: `--fg-muted` on the card against `--fg-body` in the
section. The card is a doorway; the section is the argument.

The shipped `synergy data offline` line, when present, sits **between the name and the paragraph**,
unchanged. It is about the figure below, not about the prose.

## 8. What this buys, stated as the cost avoided

One string, one band, one rule, two surfaces, **one generation**.

The failure this document exists to prevent: sentence 1 written at 200 characters to read well in
the 640px column, shipped, and then the home hero needs it — at which point either the dashboard
shows a sentence cut mid-clause on every load, or ~3,300 paragraphs are regenerated against a new
prompt. The band and the front-loading rule cost the generator two constraints. Deciding the two
placements apart costs a re-backfill.

## 9. Open

- **The 58-character measurement is against `IBM Plex Sans` at 13px in a 183px column** — the
  shipped column, after the dashboard wrapper's padding, the 84px art column and the info area's
  padding. **This should be re-measured in the browser before the generator runs**, not because the
  arithmetic is doubtful but because it is now the tightest constraint in the contract and R1 got it
  wrong once. It leaves only ~3 characters of slack over rule 2's 55, so **any reduction in that
  column, or any increase in the card's art width, forces the threshold down again.**
- **Rule 2's 55 is a character count, not a word boundary.** A sentence whose claim ends at 53 with
  a long word starting at 51 can still clamp mid-word on the narrowest column. It reads as a
  hyphenless break, not as a lost fact, and the check is not worth complicating.
- **58 characters is a short leash for a specific claim.** At 375px the reader gets about nine
  words. "Kess decks tend to cast the same few spells twice" spends five of them on setup. If the
  generator cannot reliably say something commander-specific inside 55 characters, the honest
  alternative is not a longer threshold but **a shorter home-card treatment** — one clamped line,
  or none — and that is a design question worth reopening before ~3,300 paragraphs are written.
- **Nothing here specifies the prompt.** The band, the predicates and the vocabulary floor are the
  contract; how the paragraph is asked for is §4.1's and eng's. The one thing the prompt must carry
  that the predicates cannot check is *say something specific to this commander* — see gap 6.
