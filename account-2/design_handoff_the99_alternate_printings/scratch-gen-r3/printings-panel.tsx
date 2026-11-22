"use client";
// Alternate printings R3 (account 2, 2026-11-22): the printings panel. Opened from the Set line's printings button (A) or the
// strip's search tile (B). Searches the card's printings by set name, set code or number; selecting one shows it in place.
import type { BrowsePrinting } from "../../lib/collection/browse";
import { SearchField } from "../ui/text-field";
import { SearchGlyph } from "../card-search/card-search";
import { stripKey, type StripPrinting } from "./printing-strip";

const head = "m-0 font-mono uppercase text-[10px] tracking-[0.14em]";

function Thumb({ p, shown, w }: { p: StripPrinting; shown: boolean; w: number }) {
  return (
    <button type="button" aria-pressed={shown} className="flex flex-col items-center gap-[5px] border-0 bg-transparent p-0 cursor-pointer" style={{ width: w }}>
      <span className="relative block w-full overflow-hidden rounded-[4px]" style={{ aspectRatio: "63/88",
        boxShadow: shown ? "0 0 0 2px var(--bg), 0 0 0 4px var(--accent)" : "0 0 0 1px var(--border-strong)", opacity: shown ? 1 : 0.86 }}>
        {p.imageUri ? <img src={p.imageUri} alt="" className="block h-full w-full object-cover" /> : null}
      </span>
      <span className="whitespace-nowrap font-mono text-[10px] leading-none" style={{ color: shown ? "var(--fg)" : p.mine ? "var(--accent-text)" : "var(--fg-muted)" }}>
        {p.pick ? "◆ " : ""}{p.setCode} {p.mine && !p.pick ? `×${p.quantity}` : p.collectorNumber}
      </span>
    </button>
  );
}

export function PrintingsPanel({ printings, shownKey, query, cols, thumbW, cardName }: {
  printings: StripPrinting[]; shownKey: string | null; query: string; cols: number; thumbW: number; cardName: string;
}) {
  const q = query.trim().toLowerCase();
  const hits = q === "" ? printings : printings.filter((p) =>
    `${p.setName ?? ""} ${p.setCode} ${p.collectorNumber}`.toLowerCase().includes(q));
  // Searching groups by set; otherwise yours first, then the rest.
  const groups: { label: string; items: StripPrinting[] }[] = [];
  if (q !== "") {
    for (const p of hits) {
      const label = p.setName ?? p.setCode;
      const g = groups.find((x) => x.label === label);
      if (g) g.items.push(p); else groups.push({ label, items: [p] });
    }
  } else {
    const mine = hits.filter((p) => p.mine);
    if (mine.length) groups.push({ label: `In your collection · ${mine.length}`, items: mine });
    groups.push({ label: mine.length ? `Other printings · ${hits.length - mine.length}` : "", items: hits.filter((p) => !p.mine) });
  }
  return (
    <div role="dialog" aria-label={`Printings of ${cardName}`} className="flex h-full min-h-0 flex-col">
      <div className="flex flex-none items-center gap-[6px] pl-[16px] pr-[6px] md:pl-[18px]">
        <SearchField containerClassName="h-11 min-w-0 flex-1 rounded-[10px] border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] pr-[6px] pl-[13px]"
          className="text-[16px] whitespace-nowrap" leading={<span className="flex-none text-[color:var(--fg-muted)]"><SearchGlyph size={18} /></span>}
          aria-label={`Search ${printings.length} printings`} placeholder={`Search ${printings.length} printings by set`} value={query} onChange={() => {}} onClear={() => {}}
          clearClassName="h-8 w-8 rounded-none bg-transparent text-[13px]" />
        <button type="button" aria-label="Close printings" className="flex h-11 w-11 flex-none items-center justify-center border-0 bg-transparent text-[16px] text-[color:var(--fg-muted)]">✕</button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-[16px] pt-[14px] pb-[16px] md:px-[18px]" style={{ scrollbarWidth: "none" }}>
        {q !== "" ? <p className={head + " mb-[12px]"} style={{ color: "var(--fg-faint)" }}>{hits.length} of {printings.length} printings</p> : null}
        {groups.map((g) => (
          <div key={g.label || "all"} className="mb-[16px]">
            {g.label ? <p className={head + " mb-[10px]"} style={{ color: q !== "" ? "var(--fg-muted)" : "var(--fg-faint)" }}>{g.label}</p> : null}
            <div className="grid gap-x-[10px] gap-y-[14px]" style={{ gridTemplateColumns: `repeat(${cols}, ${thumbW}px)` }}>
              {g.items.map((p) => <Thumb key={stripKey(p)} p={p} shown={stripKey(p) === shownKey} w={thumbW} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A: the Set line as the printings button (a plate, like the price), on cards with 2+ printings. */
export function PrintingsButton({ set, number, total }: { set: string; number: string; total: number }) {
  return (
    <button type="button" aria-haspopup="dialog" aria-label={`${set} ${number}. ${total} printings. Search and view them.`}
      className="inline-flex h-[30px] items-center gap-[8px] rounded-[7px] px-[9px] font-mono text-[12px] cursor-pointer"
      style={{ background: "var(--bg)", border: "1px solid var(--border-strong)", color: "var(--fg)" }}>
      <span>{set} · {number}</span>
      <span aria-hidden style={{ color: "var(--fg-faint)" }}>|</span>
      <span style={{ color: "var(--accent-text)" }}>{total} printings ▾</span>
    </button>
  );
}

/** B: the strip's leading search tile. */
export function SearchTile() {
  return (
    <button type="button" aria-label="Search printings" className="flex w-[48px] flex-none flex-col items-center gap-[5px] border-0 bg-transparent p-0 cursor-pointer">
      <span className="flex w-[48px] items-center justify-center rounded-[4px] text-[color:var(--fg-muted)]" style={{ aspectRatio: "63/88", border: "1px dashed var(--border-strong)", background: "var(--surface-sunken)" }}>
        <SearchGlyph size={20} />
      </span>
      <span className="font-mono text-[10px] leading-none" style={{ color: "var(--fg-muted)" }}>Search</span>
    </button>
  );
}
export type { BrowsePrinting };
