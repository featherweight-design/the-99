import { twMerge } from "tailwind-merge";

// Ownership dot — solid green when the card is in the collection, dashed hollow
// when it is not. Shared by the decklist row, the suggestion card and the
// export dialog's shopping list.
//
// Color and shape only. Sizing stays with the caller: the design tables put
// the dot at 7px responsive in the decklist row, a flat 8px on the suggestion
// card and a flat 7px in the export dialog, so a fixed size here would be
// overridden at every call site.
const BASE = "flex-none rounded-full";
const OWNED =
  "bg-[color:var(--success)] [border:1px_solid_var(--success)]";
const UNOWNED = "bg-transparent [border:1px_dashed_var(--fg-locked)]";

type OwnershipDotProps = {
  owned: boolean;
  className?: string;
  /**
   * Announce ownership to assistive tech. Omit where adjacent text already
   * conveys it — the dot is then marked decorative.
   */
  label?: string;
};

export function OwnershipDot({ owned, className, label }: OwnershipDotProps) {
  return (
    <span
      className={twMerge(BASE, owned ? OWNED : UNOWNED, className)}
      {...(label ? { "aria-label": label } : { "aria-hidden": true })}
    />
  );
}
