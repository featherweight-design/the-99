/**
 * The Filters box: the one trigger the Commanders rack, Collection and the cart share (Small items 3
 * item 7 ruled it for every compact page; Small items 4 item 1 brought the last two onto it). 44px
 * tall, 10px corners, `--surface-sunken`, a 1px `--border-strong` edge that turns accent with a
 * filter on, a 13px label and a count badge. The box is 44 itself, so there is no `after:` hit overlay.
 *
 * Module scope, as everywhere in the callers: a component declared inside its parent would be a new
 * type on every render and would remount its own subtree.
 */
export function FiltersBoxTrigger({
  label,
  ariaLabel,
  badge,
  onClick,
  expanded,
}: {
  /** The visible word. */
  label: string;
  /**
   * The accessible name. Defaults to `label`, never the word plus the digit: the badge restates the chips
   * for sighted readers, and folding it in would have a screen reader announce "Filters 2" where the chip
   * line has already said which two.
   */
  ariaLabel?: string;
  /** The count of active dimensions or controls. Zero draws no badge at all. */
  badge: number;
  onClick: () => void;
  expanded: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel ?? label}
      aria-haspopup="dialog"
      aria-expanded={expanded}
      onClick={onClick}
      className={[
        "inline-flex h-[44px] shrink-0 cursor-pointer items-center gap-[7px] whitespace-nowrap rounded-[10px]",
        "border border-solid bg-[color:var(--surface-sunken)] font-sans text-[13px] text-[color:var(--fg)]",
        // One `px-*` either way: two would resolve by stylesheet order, not by the order of this
        // array. The badge takes the 2px the padding gives up, so the trigger keeps its width
        // whether or not a filter is on.
        badge > 0
          ? "px-[11px] border-[color:var(--accent)]"
          : "px-[13px] border-[color:var(--border-strong)]",
      ].join(" ")}
    >
      {label}
      {badge > 0 && (
        <span
          aria-hidden
          className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[color:var(--accent)] px-[5px] font-mono text-[11px] font-semibold text-[color:var(--bg)]"
        >
          {badge}
        </span>
      )}
    </button>
  );
}
