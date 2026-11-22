// Wishlist printing (account 1, 2026-11-22): the parts this round adds, static, driven by globalThis hooks for SSR.
// Scratch only: the Wishlist box’s Printing line, the panel’s wanted mark and foot, and the tile’s price line.
const G = globalThis as any;

export function Bookmark({ size = 12, filled = true }: { size?: number; filled?: boolean }) {
  return (
    <svg aria-hidden width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" style={{ flex: "none" }}>
      <path d="M6 3h12v18l-6-4-6 4z" />
    </svg>
  );
}

const BTN = "inline-flex h-[44px] md:h-[30px] flex-none cursor-pointer items-center justify-center gap-[7px] rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[12px] text-[13px] font-medium text-[color:var(--fg)]";
const LINK = "inline-flex h-[44px] md:h-auto flex-none cursor-pointer items-center border-0 bg-transparent p-0 font-mono text-[11.5px] text-[color:var(--fg-muted)] underline decoration-dotted underline-offset-[3px]";

/** The Wishlist box's Printing line. W = { set, num, setName, price, img, soldOut } or null (any printing); S = the printing on screen. */
export function WishlistPrintingLine() {
  const W = G.__W ?? null; const S = G.__SHOWN ?? null; // S: { set, num } when the card shows another printing than the catalog's
  const shownIsWanted = W && S && W.set === S.set && W.num === S.num;
  const offer = S && !shownIsWanted ? `Want ${S.set} ${S.num}` : null;
  return (
    <div className="mt-[12px] flex min-h-[44px] md:min-h-[34px] items-center gap-[10px] border-t border-solid border-[color:var(--border)] pt-[12px] text-[13px]" style={{ color: "var(--fg-body)" }}>
      {W ? (
        <span className="relative block h-[34px] w-[24px] flex-none overflow-hidden rounded-[3px]" style={{ boxShadow: "0 0 0 1px var(--border-strong)" }}>
          <img src={W.img} alt="" className="block h-full w-full object-cover" style={W.soldOut ? { opacity: 0.55 } : undefined} />
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="font-mono text-[9.5px] uppercase tracking-[0.1em]" style={{ color: "var(--fg-faint)" }}>Printing</span>
        {W ? (
          <span className="min-w-0 truncate">
            <span className="font-mono" style={{ color: "var(--fg)" }}>{W.set} {W.num}</span>
            <span className="font-mono" style={{ color: "var(--fg-muted)" }}> · {W.soldOut ? "sold out" : W.price}</span>
          </span>
        ) : (
          <span className="min-w-0 truncate">Any printing{!offer ? <span className="font-mono text-[11.5px]" style={{ color: "var(--fg-faint)" }}> · cheapest</span> : null}</span>
        )}
      </span>
      {offer ? (
        <button type="button" className={BTN}><Bookmark size={12} filled={false} />{offer}</button>
      ) : W ? (
        <button type="button" className={LINK}>Any printing</button>
      ) : null}
    </div>
  );
}

/** Under the line when the wanted printing is sold out: what Shopping does about it. */
export function SoldOutNote() {
  const W = G.__W ?? null;
  if (!W?.soldOut) return null;
  return <p className="m-0 mt-[8px] font-mono text-[11px] leading-[1.5]" style={{ color: "var(--fg-faint)" }}>Mana Pool has none now. Any printing is $1.49.</p>;
}

/** The panel's foot, on a card in your wishlist: what you want, and the one press for the printing on screen. */
export function PanelFoot() {
  const W = G.__W ?? null; const S = G.__SHOWN ?? null;
  if (!G.__ONLIST) return null;
  const shownIsWanted = W && S && W.set === S.set && W.num === S.num;
  return (
    <div className="flex flex-none items-center gap-[10px] border-t border-solid border-[color:var(--border-strong)] px-[16px] pt-[10px] md:px-[18px] md:pb-[12px]">
      <span className="flex min-w-0 flex-1 items-center gap-[6px] font-mono text-[11.5px]" style={{ color: "var(--fg-muted)" }}>
        <span style={{ color: "var(--accent-text)" }}><Bookmark size={12} /></span>
        <span className="truncate">Wanted: {W ? `${W.set} ${W.num}` : "any printing"}</span>
      </span>
      {S && !shownIsWanted ? <button type="button" className={BTN}><Bookmark size={12} filled={false} />Want {S.set} {S.num}</button>
        : W ? <button type="button" className={LINK}>Any printing</button> : null}
    </div>
  );
}

/** The wishlist tile's price line, under the caption: the figure (or `sold out`), then the wanted printing. Any printing is the
 * figure alone (the cheapest). Phone: the set code only; the number joins from md, where the tile is wide enough. */
export function TilePriceLine({ price, set, num, soldOut }: { price: string | null; set?: string; num?: string; soldOut?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-[6px] whitespace-nowrap font-mono text-[9px] leading-[1.2] md:text-[9.5px]" style={{ color: "var(--fg-faint)" }}>
      <span className="flex-none" style={{ color: soldOut ? "var(--fg-muted)" : "var(--fg-body)", fontWeight: soldOut ? 400 : 600 }}>{soldOut ? "sold out" : price}</span>
      {set ? (
        <span className="flex min-w-0 items-center gap-[3px]" style={{ color: "var(--accent-text)" }}><Bookmark size={9} /><span>{set}<span className="hidden md:inline"> {num}</span></span></span>
      ) : null}
    </span>
  );
}
