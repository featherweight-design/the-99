"use client";
// Alternate printings R3: the printings panel. Opened from the strip's Search tile (desktop) or the Set line's
// printings button (phone). Searches the card's printings by set name, set code or collector number; selecting one
// shows it in place through the parent's preview (`onSelect`), and the panel stays open. Nothing is stored here.
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { identityGradient } from "../../lib/cards/gradients";
import { printingStripCopy } from "../../lib/copy/collection";
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
  printings, shownKey, onSelect, onClose, cardName, colorIdentity, cols,
}: {
  printings: StripPrinting[];
  shownKey: string | null;
  onSelect: (p: StripPrinting) => void;
  onClose: () => void;
  cardName: string;
  colorIdentity: string[];
  /** Thumbs across: 6 on desktop, 5 on the phone. */
  cols: number;
}) {
  const [query, setQuery] = useState("");
  const field = useRef<HTMLInputElement>(null);
  const q = query.trim();
  const { hits, groups } = useMemo(() => panelGroups(printings, query), [printings, query]);

  // Focus lands on the search field on open; the owner returns it to the control that opened the panel on close.
  useEffect(() => { field.current?.focus(); }, []);

  return (
    <div role="group" aria-label={printingStripCopy.groupLabel(cardName)} data-testid="printings-panel" className="flex max-h-full min-h-0 flex-col">
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
      <div className="min-h-0 flex-1 overflow-y-auto px-[16px] pb-[16px] pt-[14px] md:px-[18px]" style={{ scrollbarWidth: "none" }}>
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
                    aria-label={printingStripCopy.thumbAria(p.setName ?? p.setCode, p.collectorNumber, p.mine ? p.quantity : 0, p.pick === true)}
                    onClick={() => onSelect(p)}
                    className="flex min-w-0 cursor-pointer flex-col items-center gap-[5px] border-0 bg-transparent p-0"
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
                      {printingStripCopy.panelThumbLabel(p.setCode, p.collectorNumber, p.mine ? p.quantity : 0, p.pick === true)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The strip's leading tile (desktop): a dashed card-shaped Search tile that opens the panel. */
export function SearchTile({ onPress, onKeyDown, tileRef }: { onPress: () => void; onKeyDown: (e: KeyboardEvent) => void; tileRef: (el: HTMLButtonElement | null) => void }) {
  return (
    <button
      ref={tileRef}
      type="button"
      aria-label={printingStripCopy.searchTileAria}
      aria-haspopup="dialog"
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
