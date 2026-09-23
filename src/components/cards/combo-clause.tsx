import { comboAwarenessCopy } from "../../lib/copy/combo-awareness";
import { ComboGlyph } from "./combo-glyph";
import { FactTooltip } from "./fact-tooltip";

/**
 * One inline clause: the lemniscate and the partner's name, for a two-card combo.
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
  return (
    <span
      data-testid="combo-clause"
      // `min-w-0` so the clause is the thing that shrinks, and the name truncates only when it
      // alone cannot fit its cell.
      // `inline-flex`, because this IS an inline clause: a host may put it in inline flow
      // beside other text, and a block-level flex wrapper would force a line break there. The
      // repo's other glyph-plus-text atoms are inline for the same reason.
      //
      // `max-w-full`, because inline flow is also what defeated the truncation below. An
      // inline-level box in a BLOCK parent sizes to at least its min-content, and the
      // min-content of text that cannot wrap is the whole sentence, so the clause never shrank
      // at all — `min-w-0` only governs a flex ITEM. The top-off row and the Consider tile both
      // host it in a block, and both overflowed from the day they shipped: measured at 390px,
      // `completes with Thassa's Oracle` ran 24px into the synergy figures, and a long partner
      // ran ~105px past a tile. Capped at the parent's width, the line stops at its cell on
      // every host.
      className={`inline-flex items-center gap-[4px] min-w-0 max-w-full ${className ?? ""}`}
    >
      {/* THE GLYPH HAS THE TOOLTIP THE OTHER MARKS HAVE (Hugh, 2026-09-22), on a fine pointer
          only — `FactTooltip`, the same chrome and delays as the bolt and the `/collection`
          combo marker. An enhancement, never the gloss: a phone has no hover, and Hugh ruled
          the symbol sufficient there, with the card modal spelling the combo out. */}
      {state === "completes" ? (
        <FactTooltip sentence={comboAwarenessCopy.markerTooltip.completes(partnerName)}>
          <ComboGlyph />
        </FactTooltip>
      ) : (
        <ComboGlyph />
      )}
      {/* `completes` IS THE GLYPH AND THE NAME, NOTHING ELSE. Hugh, 2026-09-22, on every
          host: `completes with` truncated to `completes wi…` on the quick-add row and to
          `complete…` on the phone's top-off row, spending the line on the app's words
          while the name — the only thing a reader cannot reconstruct — waited behind them.
          The lemniscate is glossed as `Two-card combo` by the key on the Consider tile and
          the top-off list. `ownBoth` keeps its sentence: its tail is what truncation eats,
          and no host draws it today.

          THE EAR STILL GETS THE SENTENCE, from inside the clause. A bare name is not one —
          the glyph is aria-hidden, so `Isochron Scepter` alone says nothing about a combo —
          and not every host speaks the clause for it: the top-off row draws it aria-hidden
          and composes `comboClauseSpoken` into its own label, and a quick-add option's
          aria-label overrides its contents, but the Consider tile reads the clause as
          content. So the drawn name is hidden and an sr-only sentence stands in: heard on
          the tile, and silent on the two hosts that already say it. */}
      <span
        aria-hidden={state === "completes" || undefined}
        className="truncate min-w-0 font-mono text-[9.5px] md:text-[10.5px]"
        style={{ color: "var(--fg-body)" }}
      >
        {state === "completes" ? partnerName : comboAwarenessCopy.clause.ownBoth(partnerName)}
      </span>
      {state === "completes" && (
        <span className="sr-only">{comboClauseSpoken(partnerName, "completes")}</span>
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
