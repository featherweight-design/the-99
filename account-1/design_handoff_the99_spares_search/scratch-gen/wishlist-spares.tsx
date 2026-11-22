// Friends' spares on the Wishlist (account 1, 2026-11-22), PROPOSAL: the deck row's spare press, on the tile.
import { MarkedSpareGlyph, type SpareMark } from "../src/components/social/spare-key-item";
import { spareCopy } from "../src/lib/copy/social";
import { TOUCH_HIT } from "../src/components/ui/touch-hit";

export const wishlistSpareCopy = {
  /** The press's name: the shipped marker name, then how many friends. */
  aria: (card: string, friends: number) => `${spareCopy.markerAria(card)}, ${friends === 1 ? "1 friend" : `${friends} friends`}`,
  key: spareCopy.key, // shipped "friend has a spare"
  sort: "Friends' spares", // the desktop Sort's third order
};

/**
 * Sits beside the tile's press (a sibling, never inside it: a button holds no button), over the caption's lower right.
 * One friend: the glyph. Two or more: the glyph and the count of friends. None, still reading, or a failed read: nothing.
 */
export function WishlistSparePress({ friends, mark = null, name, open = false }: { friends: number; mark?: SpareMark; name: string; open?: boolean }) {
  if (friends === 0) return null;
  return (
    <span className="absolute bottom-[8px] right-[6px] z-[1] md:bottom-[9px] md:right-[8px]">
    <button
      type="button"
      aria-label={wishlistSpareCopy.aria(name, friends)}
      aria-haspopup="dialog"
      aria-expanded={open}
      data-dz="wl-spare"
      className={`flex cursor-pointer items-center border-0 bg-transparent p-0 ${TOUCH_HIT}`}
    >
      <span
        aria-hidden
        className={`flex h-[26px] items-center gap-[5px] rounded-[6px] px-[6px] [border:1px_solid_var(--border-strong)] ${open ? "outline-solid outline-2 outline-offset-[2px] outline-[color:var(--accent)]" : ""}`}
        style={{ background: "var(--surface)", ["--row-bg" as string]: "var(--surface)" }}
      >
        <MarkedSpareGlyph mark={mark} size={15} />
        {friends > 1 ? <span className="font-mono text-[11px] leading-none text-[color:var(--fact)]">{friends}</span> : null}
      </span>
    </button>
    </span>
  );
}

/** The meta row's key item, the shipped Shopping key's words and glyph, drawn only once a tile shows a press. */
export function WishlistSpareKey({ requested = false }: { requested?: boolean }) {
  return (
    <span className="inline-flex items-center gap-[12px] text-[color:var(--fg-muted)]">
      <span className="inline-flex items-center gap-[6px]"><MarkedSpareGlyph mark={null} size={14} />{wishlistSpareCopy.key}</span>
      {requested ? <span className="inline-flex items-center gap-[6px]"><MarkedSpareGlyph mark="requested" size={14} />{spareCopy.request.keyRequested}</span> : null}
    </span>
  );
}
