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
  tile: "absolute right-[6px] top-[6px] text-[9px]",
};

export function BuyTag({ variant, label }: { variant: BuyTagVariant; label?: string }) {
  return (
    <span
      aria-label={label}
      className={`font-mono rounded-[4px] px-[5px] py-[1px] ${PLACEMENT[variant]}`}
      style={{ color: "var(--warning)", ...PLATE[variant] }}
    >
      {addPanelCopy.unowned.tag}
    </span>
  );
}
