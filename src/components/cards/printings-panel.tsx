"use client";
// Alternate printings R3: the printings panel. Opened from the strip's Search tile (desktop) or the Set line's
// printings button (phone). Searches the card's printings by set name, set code or collector number; selecting one
// shows it in place through the parent's preview (`onSelect`), and the panel stays open. Nothing is stored here.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { identityGradient } from "../../lib/cards/gradients";
import { printingStripCopy } from "../../lib/copy/collection";
import { cardSheetCopy } from "../../lib/copy/card-carousel";
import { wishlistPrintingCopy } from "../../lib/copy/wishlist";
import type { WishlistPrintingView } from "../../lib/wishlist/printing-line";
import { WantedMark } from "../wishlist/wishlist-tile";
import { SearchGlyph } from "../card-search/card-search";
import { ArtLayer } from "../ui/art-layer";
import { SearchField } from "../ui/text-field";
import { stripKey, type StripPrinting } from "./printing-strip";

const HEAD = "m-0 font-mono uppercase text-[10px] tracking-[0.14em]";

type Group = { label: string; items: StripPrinting[] };

/** The panel's groups: with a query, the matches grouped by set name in list order; without, yours first, then the rest. */
export function panelGroups(printings: StripPrinting[], query: string): { hits: StripPrinting[]; groups: Group[] } {
  const q = query.trim().toLowerCase();
  const hits = q === "" ? printings : printings.filter((p) => `${p.setName ?? ""} ${p.setCode} ${p.collectorNumber}`.toLowerCase().includes(q));
  const groups: Group[] = [];
  if (q !== "") {
    for (const p of hits) {
      const label = p.setName ?? p.setCode;
      const g = groups.find((x) => x.label === label);
      if (g) g.items.push(p);
      else groups.push({ label, items: [p] });
    }
    return { hits, groups };
  }
  const mine = hits.filter((p) => p.mine);
  const rest = hits.filter((p) => !p.mine);
  if (mine.length > 0) groups.push({ label: printingStripCopy.panelOwnedHead(mine.length), items: mine });
  if (rest.length > 0) groups.push({ label: mine.length > 0 ? printingStripCopy.panelOtherHead(rest.length) : "", items: rest });
  return { hits, groups };
}

// Not role="dialog": the card modal's trap (`useDialogA11y`) defers every key pressed inside a nested dialog, which would
// swallow Escape and Tab here. The panel is a group inside the modal's own dialog.
export function PrintingsPanel({
  printings, shownKey, onSelect, onClose, cardName, colorIdentity, cols, wantedId = null, foot = null,
}: {
  printings: StripPrinting[];
  shownKey: string | null;
  onSelect: (p: StripPrinting) => void;
  onClose: () => void;
  cardName: string;
  colorIdentity: string[];
  /** Thumbs across: 6 on desktop, 5 on the phone. */
  cols: number;
  /** The printing the reader's wishlist line names: its thumb carries the bookmark. */
  wantedId?: string | null;
  /** The wishlist foot (`PanelWishlistFoot`), drawn only for a card on the wishlist. */
  foot?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const field = useRef<HTMLInputElement>(null);
  const q = query.trim();
  const { hits, groups } = useMemo(() => panelGroups(printings, query), [printings, query]);

  // Focus lands on the panel itself, never the set field: the printings show first, and a focused field would raise the
  // phone's keyboard over them. The reader taps the field to narrow. The owner returns focus to the control that opened
  // the panel on close.
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => { root.current?.focus({ preventScroll: true }); }, []);

  return (
    <div ref={root} tabIndex={-1} role="group" aria-label={printingStripCopy.panelLabel(cardName)} data-testid="printings-panel" className="flex h-full max-h-full min-h-0 flex-col outline-none">
      <div className="flex flex-none items-center gap-[6px] pl-[16px] pr-[6px] md:pl-[18px]">
        <SearchField
          ref={field}
          containerClassName="h-11 min-w-0 flex-1 rounded-[10px] border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] pr-[6px] pl-[13px]"
          className="text-[16px] whitespace-nowrap"
          leading={<span className="flex-none text-[color:var(--fg-muted)]"><SearchGlyph size={18} /></span>}
          aria-label={printingStripCopy.panelSearchAria(printings.length)}
          placeholder={printingStripCopy.panelPlaceholder(printings.length)}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
          clearClassName="h-8 w-8 rounded-none bg-transparent text-[13px]"
        />
        <button
          type="button"
          aria-label={printingStripCopy.panelClose}
          onClick={onClose}
          className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center border-0 bg-transparent text-[16px] text-[color:var(--fg-muted)]"
        >
          ✕
        </button>
      </div>
      <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto px-[16px] pb-[16px] pt-[14px] md:px-[18px]" style={{ scrollbarWidth: "none" }}>
        {q !== "" && hits.length > 0 ? (
          <p className={HEAD + " mb-[12px]"} style={{ color: "var(--fg-faint)" }}>{printingStripCopy.panelMatches(hits.length, printings.length)}</p>
        ) : null}
        {hits.length === 0 ? (
          <p className={HEAD} style={{ color: "var(--fg-faint)" }}>{printingStripCopy.panelEmpty(q)}</p>
        ) : null}
        {groups.map((g) => (
          <div key={g.label || "all"} className="mb-[16px] last:mb-0">
            {g.label ? <p className={HEAD + " mb-[10px]"} style={{ color: q !== "" ? "var(--fg-muted)" : "var(--fg-faint)" }}>{g.label}</p> : null}
            <div className="grid gap-x-[10px] gap-y-[14px]" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 62px))` }}>
              {g.items.map((p) => {
                const shown = stripKey(p) === shownKey;
                return (
                  <button
                    key={stripKey(p)}
                    type="button"
                    aria-pressed={shown}
                    aria-label={printingStripCopy.thumbAria(p.setName ?? p.setCode, p.collectorNumber, p.mine ? p.quantity : 0, p.pick === true) + (wantedId !== null && p.scryfallId === wantedId ? `, ${wishlistPrintingCopy.panel.wanted(p.setCode.toUpperCase(), p.collectorNumber)}` : "")}
                    onClick={() => onSelect(p)}
                    className="flex w-full min-w-0 cursor-pointer flex-col items-center gap-[5px] border-0 bg-transparent p-0"
                  >
                    <span
                      className="relative block w-full overflow-hidden rounded-[4px]"
                      style={{
                        aspectRatio: "63/88",
                        background: identityGradient(colorIdentity),
                        boxShadow: shown ? "0 0 0 2px var(--bg), 0 0 0 4px var(--accent)" : "0 0 0 1px var(--border-strong)",
                        opacity: shown ? 1 : 0.86,
                      }}
                    >
                      {p.imageUri ? <ArtLayer src={p.imageUri} /> : null}
                    </span>
                    <span
                      className="whitespace-nowrap font-mono text-[10px] leading-none"
                      style={{ color: shown ? "var(--fg)" : p.mine ? "var(--accent-text)" : "var(--fg-muted)" }}
                    >
                      {wantedId !== null && p.scryfallId === wantedId ? <WantedMark /> : null}
                      {printingStripCopy.panelThumbLabel(p.setCode, p.collectorNumber, p.mine ? p.quantity : 0, p.pick === true)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {foot}
    </div>
  );
}

/**
 * The panel's wishlist foot (wishlist printing D5): which printing the line wants, and the press for the printing on
 * screen. Drawn only for a card on the wishlist. `Wanted: any printing` or `Wanted: SLD 2125`; another printing on screen
 * offers `Want STA 10`, and the wanted one on screen offers `Any printing` back.
 */
export function PanelWishlistFoot({ view, busy, onChoose }: { view: WishlistPrintingView; busy: boolean; onChoose: (printingId: string | null) => void }) {
  const copy = wishlistPrintingCopy;
  const { wanted, preview } = view;
  const press = "flex h-[44px] flex-none cursor-pointer items-center rounded-[8px] border border-solid border-[color:var(--border-strong)] bg-transparent px-[12px] text-[12.5px] font-medium text-[color:var(--fg)]" + (busy ? " opacity-60 cursor-progress" : "");
  return (
    <div
      data-testid="panel-wishlist-foot"
      className="flex flex-none items-center justify-between gap-[10px] border-0 border-t border-solid px-[16px] pt-[10px] md:px-[18px]"
      style={{ borderColor: "var(--border)" }}
    >
      <span className="min-w-0 font-mono text-[12px]" style={{ color: "var(--fg-body)" }}>
        <WantedMark />
        {wanted ? copy.panel.wanted(wanted.setCode.toUpperCase(), wanted.collectorNumber) : copy.panel.wantedAny}
      </span>
      {preview ? (
        <button
          type="button"
          aria-busy={busy || undefined}
          aria-label={copy.box.wantAria(preview.setCode.toUpperCase(), preview.collectorNumber, preview.setName, view.cardName)}
          onClick={() => onChoose(preview.id)}
          className={press}
        >
          {copy.box.want(preview.setCode.toUpperCase(), preview.collectorNumber)}
        </button>
      ) : wanted ? (
        <button type="button" aria-busy={busy || undefined} onClick={() => onChoose(null)} className={press}>
          {copy.box.any}
        </button>
      ) : null}
    </div>
  );
}

/** The phone's printings button (alternate printings R3): the Set line at 2+ printings, a plate like the price, `STA · 10 | 22 printings ▾`. */
export function PrintingsButton({
  setCode, collectorNumber, total, open, onPress, buttonRef,
}: {
  setCode: string;
  collectorNumber: string;
  total: number;
  open: boolean;
  onPress: () => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      data-testid="printings-button"
      aria-expanded={open}
      aria-label={printingStripCopy.buttonAria(setCode, collectorNumber, total)}
      onClick={onPress}
      className="inline-flex h-[28px] cursor-pointer items-center gap-[8px] rounded-[7px] border border-[color:var(--border-strong)] bg-[color:var(--bg)] px-[9px] font-mono text-[12px]"
    >
      <span aria-hidden style={{ color: "var(--fg-muted)" }}>{cardSheetCopy.printing(setCode, collectorNumber)}</span>
      <span aria-hidden className="h-[14px] w-px" style={{ background: "var(--border-strong)" }} />
      <span aria-hidden style={{ color: "var(--accent-text)" }}>{printingStripCopy.button(total)} ▾</span>
    </button>
  );
}

/** The strip's leading tile (desktop): a dashed card-shaped Search tile that opens the panel. */
export function SearchTile({ open, onPress, onKeyDown, tileRef }: { open: boolean; onPress: () => void; onKeyDown: (e: KeyboardEvent) => void; tileRef: (el: HTMLButtonElement | null) => void }) {
  return (
    <button
      ref={tileRef}
      type="button"
      aria-label={printingStripCopy.searchTileAria}
      aria-expanded={open}
      tabIndex={-1}
      onClick={onPress}
      onKeyDown={onKeyDown}
      className="flex w-[48px] flex-none cursor-pointer flex-col items-center gap-[5px] border-0 bg-transparent p-0"
    >
      <span
        className="flex w-[48px] items-center justify-center rounded-[4px] text-[color:var(--fg-muted)]"
        style={{ aspectRatio: "63/88", border: "1px dashed var(--border-strong)", background: "var(--surface-sunken)" }}
      >
        <SearchGlyph size={20} />
      </span>
      <span className="font-mono text-[10px] leading-none" style={{ color: "var(--fg-muted)" }}>{printingStripCopy.searchTile}</span>
    </button>
  );
}
