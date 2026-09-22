import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { ComboGlyph } from "./combo-glyph";

/**
 * One inline clause: the lemniscate leading one sentence about a two-card combo.
 *
 * THE PLACEMENT RULE, which the HOST applies rather than this component: a mark WITH a
 * sentence leaves the name line and leads that sentence on the host's secondary line; a mark
 * WITHOUT one stays where Round 1 put it. One glyph is never drawn twice on one row — a host
 * that draws Round 2's bare fact AND this clause would put two lemniscates on a row, which
 * reads as two combos.
 *
 * NO CONTAINER, no target, no `--warning`. Boxed means *about your copies* and bare means
 * *about the card*; a combo is not a spending fact, so this never enters the availability slot
 * and never turns amber.
 *
 * NO COUNT, anywhere. Detection excludes template-gated variants by design, so a number beside
 * this sentence would be the first thing on the surface that is not true.
 */
export function ComboClause({
  partnerName,
  state,
  className,
}: {
  partnerName: string;
  state: "ownBoth" | "completes";
  className?: string;
}) {
  // NO SHORT FORM ANY MORE. It existed for `/collection`, which draws a 16px marker now
  // rather than a sentence, and the decision hosts never used it.
  const text =
    state === "completes"
      ? comboAwarenessCopy.clause.completes(partnerName)
      : comboAwarenessCopy.clause.ownBoth(partnerName);

  return (
    <span
      data-testid="combo-clause"
      // `min-w-0` so the clause is the thing that shrinks; the truncation below then eats the
      // app's words before the card's name, which is the rule the design states.
      // `inline-flex`, because this IS an inline clause: a host may put it in inline flow
      // beside other text, and a block-level flex wrapper would force a line break there. The
      // repo's other glyph-plus-text atoms are inline for the same reason.
      className={`inline-flex items-center gap-[4px] min-w-0 ${className ?? ""}`}
    >
      <ComboGlyph />
      {state === "completes" ? (
        /* THE PARTNER NAME IS THE LAST THING TO GO, and on THIS sentence it sits at the end
           — so plain end-truncation eats precisely the word a reader cannot reconstruct.
           The two halves shrink at different priorities instead: the app's words give up
           ~999 units for every one the name does, so they are spent first and the name
           truncates only after. Both still truncate, so neither can overflow its host.

           `ownBoth` needs none of this: its name sits mid-sentence and the tail
           `— you own both` is what end-truncation eats first, which is already the rule. */
        /* AND THE LEAD HAS NO BASE SIZE. A shrink weight alone (999 against 1) is only
           approximately "the app's words first": flex divides the deficit in proportion, the
           name still takes a fraction of a pixel, and a fraction is enough for
           `text-overflow` to fire and delete two whole letters while the lead still had room
           to give. Measured on the quick-add row on 2026-09-22 — the name at 90 of 90px, drawn
           `Exquisite Blo…`. So the lead is `basis-0 grow max-w-max`: the name gets its full
           width first, the lead fills whatever is left up to its own length, and nothing
           shrinks while the name fits. Only a name that alone overflows truncates. The 4px
           between them is the name's padding, so the lead can reach zero without a gap left
           hanging. */
        <span className="inline-flex min-w-0">
          <span
            className="truncate basis-0 grow max-w-max min-w-0 font-mono text-[9.5px] md:text-[10.5px]"
            style={{ color: "var(--fg-body)" }}
          >
            {comboAwarenessCopy.clause.completesLead}
          </span>
          <span
            className="min-w-0 pl-[4px] truncate font-mono text-[9.5px] md:text-[10.5px]"
            style={{ color: "var(--fg-body)" }}
          >
            {partnerName}
          </span>
        </span>
      ) : (
        <span
          className="truncate min-w-0 font-mono text-[9.5px] md:text-[10.5px]"
          style={{ color: "var(--fg-body)" }}
        >
          {text}
        </span>
      )}
    </span>
  );
}

/** What a screen reader hears, composed into the HOST's accessible name so it is spoken once
 *  and in the order that surface chose. */
export function comboClauseSpoken(partnerName: string, state: "ownBoth" | "completes"): string {
  return state === "completes"
    ? comboAwarenessCopy.a11y.completes(partnerName)
    : comboAwarenessCopy.a11y.ownBoth(partnerName);
}
