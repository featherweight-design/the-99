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
  /**
   * `short` drops the app's words and keeps the card's name — `both yours` rather than
   * `you own both`. Chosen by the HOST, because it is a question about that host's width: the
   * collection row takes it at 390px and the tile takes it always.
   */
  short = false,
  className,
}: {
  partnerName: string;
  state: "ownBoth" | "completes";
  short?: boolean;
  className?: string;
}) {
  const text =
    state === "completes"
      ? comboAwarenessCopy.clause.completes(partnerName)
      : short
        ? comboAwarenessCopy.clause.ownBothShort(partnerName)
        : comboAwarenessCopy.clause.ownBoth(partnerName);

  return (
    <span
      data-testid="combo-clause"
      // `min-w-0` so the clause is the thing that shrinks; the truncation below then eats the
      // app's words before the card's name, which is the rule the design states.
      className={`flex items-center gap-[4px] min-w-0 ${className ?? ""}`}
    >
      <ComboGlyph />
      <span
        // TRUNCATION, and an honest note about how far it meets the rule.
        //
        // The design says "the clause ellipses; the PARTNER NAME is the last thing to go".
        // End-truncation delivers that for `with {partner} — you own both`, where the name
        // sits mid-sentence and the tail `— you own both` is eaten first. It does NOT for
        // `completes with {partner}`, where the name is last and goes first.
        //
        // Honouring it there means splitting one copy string into a shrinking prefix and a
        // protected name, which puts sentence assembly in a component and is how quoted copy
        // drifts from its module. Left as a known gap rather than papered over: the hosts
        // give this clause a full secondary line, so the narrow case is reachable only at
        // 390px behind a long partner name. Recorded for the host PR, where the widths are
        // real and can be measured rather than guessed at.
        className="truncate font-mono text-[9.5px] md:text-[10.5px]"
        style={{ color: "var(--fg-body)" }}
      >
        {text}
      </span>
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
