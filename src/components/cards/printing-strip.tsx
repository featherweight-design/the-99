"use client";
// Alternate printings R2: the card's printings as a row of card-shaped thumbs in card details opened from search.
// Selecting one shows it in place (the parent's preview state); nothing is stored here. Phone: in the sheet's
// teaser under the price line. Desktop: under the title, with paddles while the row overflows.
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import type { BrowsePrinting } from "../../lib/collection/browse";
import { identityGradient } from "../../lib/cards/gradients";
import { printingStripCopy } from "../../lib/copy/collection";
import { reveal } from "../../lib/ui/reveal";
import { ArtLayer } from "../ui/art-layer";
import { printingKey } from "./printing-region";
import { PrintingsPanel, SearchTile } from "./printings-panel";

/** A printing in the strip: `mine` is one the reader holds, `pick` the one that represents the card. */
export type StripPrinting = BrowsePrinting & { mine?: boolean; pick?: boolean };

/** The key a printing is selected, shown and focused by: its catalog id, else its set and number. */
export const stripKey = (p: Pick<BrowsePrinting, "scryfallId" | "setCode" | "collectorNumber">): string =>
  p.scryfallId ?? printingKey(p);

/**
 * The strip's order. Unowned: the card's own printings order (the catalog's main printing among them, ringed when
 * shown). Owned: the reader's pick first, the rest they own, then the catalog's other printings.
 */
export function orderStrip(
  catalog: BrowsePrinting[] | null,
  owned: BrowsePrinting[],
  others: BrowsePrinting[],
  pick: { setCode: string; collectorNumber: string } | null,
): StripPrinting[] {
  if (catalog) return catalog;
  const isPick = (p: BrowsePrinting) => pick !== null && printingKey(p) === printingKey(pick);
  const mine = owned.map((p): StripPrinting => ({ ...p, mine: true, pick: isPick(p) }));
  return [...mine.filter((p) => p.pick), ...mine.filter((p) => !p.pick), ...others];
}

export function PrintingStrip({
  printings, shownKey, onSelect, onAnnounce, cardName, colorIdentity, paddles = false, panelOpen = false, onPanelOpen, onPanelClose,
}: {
  printings: StripPrinting[];
  /** The key (`stripKey`) of the printing on screen. */
  shownKey: string | null;
  onSelect: (p: StripPrinting) => void;
  onAnnounce: (message: string) => void;
  cardName: string;
  /** The card's identity: the ground a thumb with no art keeps. */
  colorIdentity: string[];
  /** Desktop: ▸ and ◂ at the ends while the row overflows (a mouse wheel does not scroll sideways). */
  paddles?: boolean;
  /** Desktop (with `paddles`): the printings panel's state, owned by the modal so Escape can close it before the dialog. */
  panelOpen?: boolean;
  onPanelOpen?: () => void;
  onPanelClose?: () => void;
}) {
  const tile = useRef<HTMLButtonElement | null>(null);
  const hasTile = paddles && onPanelOpen !== undefined && onPanelClose !== undefined;
  const wasOpen = useRef(false);
  // Focus goes back to the tile that opened the panel when it closes.
  useEffect(() => {
    // Only when focus was lost with the panel (its ✕ or Escape): a paddle or arrow that paged the card keeps its focus.
    if (wasOpen.current && !panelOpen && (document.activeElement === null || document.activeElement === document.body)) tile.current?.focus();
    wasOpen.current = panelOpen;
  }, [panelOpen]);
  const row = useRef<HTMLDivElement>(null);
  const thumbs = useRef(new Map<string, HTMLButtonElement>());
  const [more, setMore] = useState({ back: false, forward: false });
  const ownedCount = printings.filter((p) => p.mine).length;
  // One tab stop: the printing on screen, else the first.
  const stop = printings.some((p) => stripKey(p) === shownKey) ? shownKey : printings[0] ? stripKey(printings[0]) : null;

  const measure = useCallback(() => {
    const el = row.current;
    if (!el) return;
    const back = el.scrollLeft > 1;
    const forward = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setMore((m) => (m.back === back && m.forward === forward ? m : { back, forward }));
  }, []);

  useLayoutEffect(() => {
    measure();
    const el = row.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, printings, paddles]);

  // The printing on screen starts in view, however far along a long strip it sits.
  const first = useRef(true);
  useEffect(() => {
    const el = shownKey === null ? undefined : thumbs.current.get(shownKey);
    if (!el) return;
    if (first.current) {
      first.current = false;
      // Not eased on open: the strip should arrive already at the right place.
      const host = row.current;
      if (host) host.scrollLeft = Math.max(0, el.offsetLeft - (host.clientWidth - el.offsetWidth) / 2);
      measure();
      return;
    }
    return reveal(el, "nearest", "nearest");
  }, [shownKey, measure]);

  const step = (dir: 1 | -1) => {
    const el = row.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const move = (e: KeyboardEvent, i: number) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.key === "ArrowLeft" && i === 0 && hasTile) { e.preventDefault(); tile.current?.focus(); return; }
    const to = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? printings.length - 1 : null;
    if (to === null || to < 0 || to >= printings.length) return;
    e.preventDefault();
    const next = thumbs.current.get(stripKey(printings[to]));
    next?.focus();
    if (next) reveal(next, "nearest", "nearest");
  };

  const select = (p: StripPrinting) => {
    onSelect(p);
    onAnnounce(printingStripCopy.announceShowing(p.setName ?? p.setCode, p.collectorNumber, p.mine === true));
  };

  return (
    <div role="group" aria-label={printingStripCopy.groupLabel(cardName)} data-testid="printing-strip">
      <p className="m-0 mb-[8px] font-mono uppercase text-[10px] tracking-[0.14em]" style={{ color: "var(--fg-faint)" }}>
        {ownedCount > 0 ? printingStripCopy.headOwned(printings.length, ownedCount) : printingStripCopy.head(printings.length)}
      </p>
      <div className="relative">
        <div
          ref={row}
          onScroll={measure}
          className="relative flex gap-[8px] overflow-x-auto pb-[2px]"
          style={{ scrollbarWidth: "none" }}
        >
          {hasTile ? (
            <SearchTile
              open={panelOpen}
              tileRef={(el) => { tile.current = el; }}
              onPress={() => onPanelOpen()}
              onKeyDown={(e) => {
                if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
                if (e.key === "ArrowRight" || e.key === "End" || e.key === "Home") {
                  const k = e.key === "End" ? printings.length - 1 : 0;
                  const next = printings[k] ? thumbs.current.get(stripKey(printings[k])) : undefined;
                  if (next) { e.preventDefault(); next.focus(); reveal(next, "nearest", "nearest"); }
                }
              }}
            />
          ) : null}
          {printings.map((p, i) => {
            const key = stripKey(p);
            const shown = key === shownKey;
            // A hairline where the reader's own printings end and the rest begin, only when both exist.
            const divider = i > 0 && printings[i - 1].mine === true && p.mine !== true;
            return (
              <div key={key} className="flex flex-none items-stretch gap-[8px]">
                {divider ? <span aria-hidden data-strip-divider className="w-px flex-none self-stretch my-[6px]" style={{ background: "var(--border-strong)" }} /> : null}
                <button
                  ref={(el) => { if (el) thumbs.current.set(key, el); else thumbs.current.delete(key); }}
                  type="button"
                  aria-pressed={shown}
                  aria-label={printingStripCopy.thumbAria(p.setName ?? p.setCode, p.collectorNumber, p.mine ? p.quantity : 0, p.pick === true)}
                  tabIndex={key === stop ? 0 : -1}
                  onClick={() => select(p)}
                  onKeyDown={(e) => move(e, i)}
                  className="flex w-[48px] flex-none cursor-pointer flex-col items-center gap-[5px] border-0 bg-transparent p-0"
                >
                  <span
                    className="relative block w-[48px] overflow-hidden rounded-[4px]"
                    style={{
                      aspectRatio: "63/88",
                      background: identityGradient(colorIdentity),
                      boxShadow: shown ? "0 0 0 2px var(--bg), 0 0 0 4px var(--accent)" : "0 0 0 1px var(--border-strong)",
                      opacity: shown ? 1 : 0.82,
                    }}
                  >
                    {p.imageUri ? <ArtLayer src={p.imageUri} /> : null}
                  </span>
                  <span
                    className="whitespace-nowrap font-mono text-[10px] leading-none"
                    style={{ color: shown ? "var(--fg)" : p.mine ? "var(--accent-text)" : "var(--fg-muted)" }}
                  >
                    {p.pick ? "◆ " : ""}{p.setCode}{p.mine && !p.pick ? ` ×${p.quantity}` : ""}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
        {hasTile && panelOpen ? (
          // Over the details column, under the strip: its height is the column's own, and it scrolls inside.
          <div className="absolute inset-x-0 top-full z-[5] mt-[8px] flex max-h-[min(420px,34vh)] flex-col overflow-hidden rounded-[12px] border border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] py-[10px] shadow-[0_14px_34px_rgba(0,0,0,0.45)]">
            <PrintingsPanel
              printings={printings}
              shownKey={shownKey}
              cardName={cardName}
              colorIdentity={colorIdentity}
              cols={6}
              onClose={onPanelClose}
              onSelect={select}
            />
          </div>
        ) : null}
        {paddles && more.back ? <Paddle side="back" onPress={() => step(-1)} /> : null}
        {paddles && more.forward ? <Paddle side="forward" onPress={() => step(1)} /> : null}
      </div>
    </div>
  );
}

function Paddle({ side, onPress }: { side: "back" | "forward"; onPress: () => void }) {
  const forward = side === "forward";
  return (
    <button
      type="button"
      aria-label={forward ? printingStripCopy.forward : printingStripCopy.back}
      onClick={onPress}
      className={`absolute top-[18px] flex h-[34px] w-[30px] cursor-pointer items-center justify-center rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface-raised)] text-[13px] text-[var(--fg)] ${forward ? "right-0" : "left-0"}`}
      style={{ boxShadow: `${forward ? "-14px" : "14px"} 0 14px var(--surface-rail)` }}
    >
      {forward ? "▸" : "◂"}
    </button>
  );
}
