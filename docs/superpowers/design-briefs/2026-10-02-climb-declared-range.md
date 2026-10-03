# The Climb: how a declared range is drawn

Design brief, 2026-10-02 (addendum F). A change to an existing surface: the Climb on the deck
page's Analysis tab. Nothing new is added.

## The finding

Hugh found this walking the app on 2026-10-02 (intake item H34). A deck whose cards permit a
**range** (1 or 2, or 4 or 5) can carry the player's answer, which is the bracket they say they
play. The verdict head already draws that answer. The Climb beneath it does not, so the two
halves of one reading disagree.

H34 has two halves:

- **4/5, shipped (#1164).** The 4/5 range has a declare rung: the rung above `yours`, drawn
  dashed, labeled `to claim this`, pointing up at the ask. Once the range is answered it stops
  asking and draws as a plain `above` rung. That was option (C), a code change with no new
  drawing. It stops the rung asking a question that has been answered. It does not draw the
  answer: a 4/5 deck declared 5 now shows its rung 5 as `already allowed`, the same
  contradiction as 1/2 below.
- **1/2, open (this brief).** The Climb draws a declared 1/2 range exactly as it draws an
  undeclared one. Hugh's ruling (2026-10-02) was to leave it as it is and send the drawing to
  Design.

## What the Climb draws today

The rungs come from `climb(permits)` (`src/lib/bracket/climb.ts:20-27`). `yours` is
`permits[0]`, the lowest bracket the cards reach, and there is one rung each side of it,
clamped to 1 to 5. **The player's answer plays no part in this.**

Each rung is drawn by `Rung` in `src/components/decks/bracket-climb.tsx`:

- **yours** (`:168-170`, `:178`, `:217-223`): a 12% ink tint over `--surface` with an ink
  border, and the full mark at 26px (36px from `md`). Its label is `where your cards are`, or
  `your cards` on a phone.
- **below** (`:164`, `:211`): a sunken fill with the upgrade-path label and the drop sentence.
- **above** (`:165`, `:227`, `:289`): a hairline border and the mark at 75%
  (`NEIGHBOUR_OPACITY`, `:40`). It is labeled `already allowed` and carries the sentence
  *Nothing rules it out. It permits more than this deck uses.*
  (`src/lib/copy/deck-analysis.ts:297`).
- **declare** (4/5 only, `:151-152`, `:166`, `:171`): dashed, at 55% ink.

For a **1/2 deck declared 2**, that comes out as:

| Rung | Label | Body |
|---|---|---|
| 1, tinted, full mark | `where your cards are` | the allowances |
| 2, plain, mark at 75% | `already allowed` | *Nothing rules it out. It permits more than this deck uses.* |

The verdict head above it names **Core** (bracket 2), in 2's ink, with only that mark drawn
(`verdictHead`, `src/lib/bracket/verdict-head.ts:55`, applied in
`src/components/decks/verdict-block.tsx:89`). Its description line reads *Your cards permit
Exhibition or Core: the two differ in what you are trying to do*
(`src/lib/copy/declaration.ts:53-58`, drawn at `verdict-block.tsx:138`).

So the page names 2 as the deck's bracket, and the Climb calls 2 a bracket the deck goes
beyond. That second claim is false for this deck, because the player has said 2 is what it is.

`BracketClimb` already has the answer it would need. It takes `declared`
(`analysis-panel.tsx:263`) and reduces it to `answered` (`bracket-climb.tsx:66`). Today that
only switches off the 4/5 declare rung.

## The handoffs

Three handoffs cover this ground, and none of them draws it:

- `design/design_handoff_the99_verdict/`
- `design/design_handoff_the99_verdict_addendum/`
- `design/design_handoff_the99_analysis_tab/`

A declared range is drawn only in the head. The deck-analysis states table has one line for it,
*the crown fills one rung solid* (`design/design_handoff_the99_deck_analysis/STATES-synopsis.md`,
row "Range, declared"). The 2026-09-21 drift addendum called the climb "drawn and settled", but
no artboard shows a Climb under an answered range.

## The ask

Draw the Climb for an **answered** range, so the Climb and the head tell the same story. 1/2 is
the case that is broken today. 4/5 should be drawn under the same rule, so the two ranges do not
end up with two treatments.

## Open for Design

1. **Which rung is "yours".** Should the tinted, full-mark rung follow the answer to the
   declared bracket? Or should it stay where the cards are, with the declared rung marked some
   other way? Either one changes what `where your cards are` means.
2. **When the answer is the HIGHER bracket** (1/2 declared 2, 4/5 declared 5). The chosen
   bracket sits on the `above` rung, labeled `already allowed` with *It permits more than this
   deck uses*, and that cannot stand on a rung the player chose. The `yours` rung below it is
   now a bracket the cards reach and the player has set aside. Say what each of the two rungs
   claims.
3. **When the answer is the LOWER bracket** (1/2 declared 1, 4/5 declared 4). The chosen
   bracket is already the `yours` rung, and the rung above is one the cards allow and the
   player turned down. Is today's drawing already right here, or does that rung say something
   more than `already allowed`? Say which, for both ranges.
4. **The labels.** Existing vocabulary: `where your cards are`, `your cards`, `already allowed`,
   `to claim this`, and the bracket names. The declaration copy NEVER QUOTES THE PLAYER (no
   "you said"; `src/lib/copy/declaration.ts:13`), and the same rule holds here. Any new string
   goes through copy review in the build lane, not back to Design.
5. **Both widths.** On the phone, a rung's label is one line with the role at its far end
   (`bracket-climb.tsx:198-203`). Desktop has a 186px first column. A longer role label has to
   fit at 390px.

**Not open:** the verdict head (settled by the declaration round), how the ask is made, drift,
the bracket marks and their inks, the rung below a single bracket, and the upgrade-path sheet.

## Where it lives

- `src/lib/bracket/climb.ts`: `climb`, which places the rungs.
- `src/components/decks/bracket-climb.tsx`: `BracketClimb`, `Rung` and `RungBody`.
- `src/lib/copy/deck-analysis.ts`: the climb's role labels and sentences.
- `src/lib/bracket/declaration-ask.ts`: `declarationAsk`, the rule for when a range counts as
  answered.
- `src/components/decks/verdict-block.tsx` and `src/lib/bracket/verdict-head.ts`: the head's
  declared reading, which the Climb has to agree with.
- Intake: H34. The 4/5 half shipped in #1164.
