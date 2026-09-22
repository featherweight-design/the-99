// The card note — the slot on an add surface that says what the card IS and what the rules say
// about that kind. `HANDOFF.md` §Geometry, `STATES-card-note.md` §A.
//
// TWO DENSITIES, ONE COMPONENT. `row` is the sentence and `tile` is the clause, and the only
// things that differ are the body size, its leading and the cap the rule applies. Drawing them
// as two components is how a phone diverges from a desktop; drawing them as one means a change
// to the rule reaches both, which is the whole reason the sentences come from
// `cardNoteSentences` rather than from either host.
//
// THE ROW NEVER RESERVES THE HEIGHT. A card with no fact draws no note, no rule and no slot —
// `STATES-card-note.md` n9, and the reason this returns null rather than an empty box. On a
// 480-candidate pool most rows carry nothing, so a reserved height would be the commonest
// rendering there is.
//
// NEVER `--warning`, NEVER `--danger`, and no confidence figure — the loudest signal on the
// least certain claim is the treatment the handoff rejects by name, and this note is *likely*
// by construction. What it draws instead is ordinary body text: the label at `--fg-muted` and
// the sentences at `--fg-body`, both from §Geometry. (`--fact` is the FACT MARKS' ink, §C2's
// five glyphs, and nothing in this component draws one.)
//
// The label is `--fg-muted` and not `--fg-disabled`: at 9px on `--surface` that measures
// 1.71:1, which is under the text floor, and the handoff says so at the point it binds.

import {
  cardNoteSentences,
  type CardNoteFacts,
  type NoteCounts,
  type NoteDensity,
} from "../../lib/bracket/card-note";
import { cardNote } from "../../lib/copy/card-note";
import type { Bracket } from "../../lib/bracket/types";


/** The body's type per density. The label is 9px mono at both. */
const BODY: Record<NoteDensity, string> = {
  row: "text-[12.5px] leading-[1.6]",
  tile: "text-[11.5px] leading-[1.45]",
};

export type CardNoteProps = {
  facts: CardNoteFacts | null;
  /** The deck's LIVE declaration. Null is unanswered, and draws no deck clause. */
  declared: Bracket | null;
  /** What the deck's list already holds of each kind — the ordinals' denominator. */
  counts: NoteCounts;
  density: NoteDensity;
  /** The candidate is already a row in this deck, so its ordinal is where it sits. */
  inDeck?: boolean;
  /**
   * The host folds the note's text into its own accessible name and hides this.
   *
   * The two hosts differ, deliberately. The top-off row composes one `aria-label` for its
   * tick and every atom on it is `aria-hidden`, so the note joins that sentence. The Consider
   * tile composes no accessible name of its own — its name is a `CardDetailTrigger` carrying
   * the card's name — so hiding the note there would delete it rather than relocate it, and
   * there is nowhere to relocate it to.
   */
  spokenElsewhere?: boolean;
  /** The 390 row indents to the name column; nothing else sets this. */
  className?: string;
};

/**
 * The composed sentences, for a host that speaks the note in its own accessible name.
 *
 * Exported so the host and the rendering cannot disagree: a host assembling its own copy of
 * this would drift from the rule one round at a time, which is the failure the rule module's
 * own header names.
 */
export function cardNoteSpoken(props: Omit<CardNoteProps, "className" | "spokenElsewhere">): string {
  return cardNoteSentences(props).join(" ");
}

export function CardNote({
  facts,
  declared,
  counts,
  density,
  inDeck = false,
  spokenElsewhere = false,
  className = "",
}: CardNoteProps) {
  const sentences = cardNoteSentences({ facts, declared, counts, density, inDeck });
  if (sentences.length === 0) return null;

  return (
    <div
      aria-hidden={spokenElsewhere || undefined}
      data-testid="card-note"
      // The rule above it is the note's own, drawn on the top edge rather than as a separate
      // element: a `<hr>` here would be an extra box to lay out on every row that has one.
      className={`mt-[9px] pt-[9px] border-t border-[color:var(--border)] ${className}`}
    >
      <p
        className="font-mono text-[9px] uppercase tracking-[.14em]"
        style={{ color: "var(--fg-muted)" }}
      >
        {cardNote.label}
      </p>
      {sentences.map((sentence) => (
        <p key={sentence} className={BODY[density]} style={{ color: "var(--fg-body)" }}>
          {sentence}
        </p>
      ))}
    </div>
  );
}
