// BuyTag — the one place the word `buy` and its colour are declared.
//
// The decklist row and the suggestion tile both mark an unowned card with it.
// Only the plate differs: the row's tag sits on a solid row, the tile's sits on
// card art, where a flat wash disappears into a bright frame.

import { addPanelCopy } from "../../lib/copy/decks-builder";

type BuyTagVariant = "row" | "tile";

const PLATE: Record<BuyTagVariant, React.CSSProperties> = {
  row: { background: "rgba(224,145,60,0.13)" },
  tile: {
    background: "rgba(20,17,14,0.82)",
    boxShadow: "inset 0 0 0 1px rgba(224,145,60,0.5)",
  },
};

const PLACEMENT: Record<BuyTagVariant, string> = {
  row: "flex-none text-[9px] md:text-[9.5px]",
  // Above the art and deaf to the pointer: the tag overlaps the card-detail
  // button it sits beside, and a corner of the art must stay clickable.
  tile: "absolute z-10 right-[6px] top-[6px] text-[9px] pointer-events-none",
};

// A labelled tag swaps the word for the sentence rather than carrying an
// `aria-label`: on a bare span the label lands on the generic role and is
// discarded outright, and `role="img"` rescued it only by announcing a run of
// text as an image. The row passes no label, because there the word already
// sits in the row's own reading order.
export function BuyTag({ variant, label }: { variant: BuyTagVariant; label?: string }) {
  return (
    <span
      className={`font-mono rounded-[4px] px-[5px] py-[1px] ${PLACEMENT[variant]}`}
      style={{ color: "var(--warning)", ...PLATE[variant] }}
    >
      {label ? (
        <>
          <span aria-hidden="true">{addPanelCopy.unowned.tag}</span>
          <span className="sr-only">{label}</span>
        </>
      ) : (
        addPanelCopy.unowned.tag
      )}
    </span>
  );
}
