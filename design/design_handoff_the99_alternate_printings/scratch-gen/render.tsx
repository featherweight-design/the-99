// Alternate printings from search (#3002, account 2, 2026-11-20): shipped components SSR'd with shipped CSS, the proposal applied.
import { renderToString } from "react-dom/server";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import type { ReactNode } from "react";
import * as React from "react";
import { CardModal } from "../src/components/cards/card-modal";
import { SearchRow } from "../src/components/card-search/search-row";
import { SearchField } from "../src/components/ui/text-field";
import { SearchGlyph } from "../src/components/card-search/card-search";
import { cardSearchCopy } from "../src/lib/copy/card-search";
import { SW } from "./fixtures";

mkdirSync("dz/frames", { recursive: true });
const G = globalThis as any;
const P = (set: string, setName: string, n: string, rel: string, img: string, q = 0) => ({
  setCode: set.toUpperCase(), setName, collectorNumber: n, releasedAt: rel, quantity: q,
  finishes: q ? { nonfoil: q } : {}, imageUri: `art/${img}`, flavorName: null,
});
const ALL = SW.map(([s, n, c, r, i]) => P(s, n, c, r, i));
const CENTS: Record<string, number> = (globalThis as any).__CENTS ?? {};
const AS_OF = new Date("2026-11-20T08:00:00Z");
const PRICES: any = { byScryfallId: {}, byPrintingKey: Object.fromEntries(ALL.map((p, i) => [`${p.setCode}|${p.collectorNumber}`,
  { cents: CENTS[`${p.setCode}|${p.collectorNumber}`] ?? [149, 1899, 2450, 189, 165, 129, 1250, 1675, 2299, 349, 299, 449, 1599, 3899, 2899, 279, 1450, 1199, 4599, 899, 675, 145000][i] ?? 250, foilCents: null, etchedCents: null, asOf: AS_OF }])),
  ambiguousKeys: [], catalogIds: [], catalogKeys: ALL.map((p) => `${p.setCode}|${p.collectorNumber}`), newestAsOf: AS_OF };
const base: any = {
  oracleId: "o-swords", name: "Swords to Plowshares", typeLine: "Instant", manaCost: "{W}", cmc: 1,
  oracleText: "Exile target creature. Its controller gains life equal to its power.", keywords: [],
  rarity: "uncommon", colorIdentity: ["W"], printedName: null, setCodes: [], preferredPrinting: null, prices: PRICES,
};
// Unowned: catalogCard fills printings with the whole catalog at quantity 0.
const unowned: any = { ...base, quantity: 0, imageUri: ALL[0].imageUri, printings: ALL, primarySetCode: ALL[0].setCode,
  availability: { owned: 0, hard: 0, soft: 0, free: 0, claims: [] } };
// Owned: two printings held (CMM ×1, C19 ×1); card.printings is the owned list.
const at = (k: string) => ALL.find((p) => `${p.setCode}|${p.collectorNumber}` === k)!;
const OWN = [{ ...at("BLC|109"), quantity: 1, finishes: { nonfoil: 1 } }, { ...at("STA|10"), quantity: 1, finishes: { nonfoil: 1 } }];
const PV = (k: string) => ({ setCode: at(k).setCode, collectorNumber: at(k).collectorNumber, imageUri: at(k).imageUri, setName: at(k).setName });
const owned = (pick: any = null): any => ({ ...base, quantity: 2, imageUri: (pick ? OWN[1] : OWN[0]).imageUri, printings: OWN,
  primarySetCode: OWN[0].setCode, preferredPrinting: pick,
  availability: { owned: 2, hard: 1, soft: 0, free: 1, claims: [{ id: "dg", name: "Giada's Angels", quantity: 1, mature: true, pending: false, commander: false, senior: true }] } });
// One printing: Muddle, the Ever-Changing (SOC 5), unowned.
const MUD = P("soc", "Secrets of Strixhaven Commander", "5", "2026-04-24", "c-muddle.jpg");
const single: any = { oracleId: "o-muddle", name: "Muddle, the Ever-Changing", typeLine: "Legendary Creature — Elemental Otter Shapeshifter",
  manaCost: "{2}{U}{R}", cmc: 4, oracleText: "Whenever you cast an instant or sorcery spell, Muddle becomes a copy of up to one target nonlegendary creature you control until end of turn, except it has myriad.",
  keywords: [], rarity: "mythic", colorIdentity: ["U", "R"], printedName: null, setCodes: [], preferredPrinting: null,
  quantity: 0, imageUri: MUD.imageUri, printings: [MUD], primarySetCode: "SOC", availability: { owned: 0, hard: 0, soft: 0, free: 0, claims: [] } };

type Dev = "phone" | "desk";
const frames: any[] = [];
function emit(id: string, dev: Dev, body: () => ReactNode, o: { vh?: number; scroll?: string; expanded?: boolean; preview?: any; full?: boolean; bg?: boolean } = {}) {
  G.__EXPANDED = o.expanded ?? false; G.__PREVIEW = o.preview ?? null; G.__FULL = o.full ?? (dev === "phone" ? true : undefined);
  writeFileSync(`dz/frames/${id}.html`, renderToString(<>{body()}</>));
  frames.push({ id, dev, vh: o.vh, scroll: o.scroll, bg: o.bg ?? id[0] !== "S" } as any);
}
const modal = (card: any, catalog: any[] | null) => (
  <CardModal card={card} catalogPrintings={catalog} position={1} total={4} onClose={() => {}} onPrev={() => {}} onNext={() => {}} onEditCopies={() => {}} />
);

// ── Search results (phone sheet), shipped chrome + shipped rows.
const ROWS: any[] = [
  { oracleId: "o-swords", name: "Swords to Plowshares", imageUri: "art/sw/eoc-45.jpg", owned: 0, decks: [], wishlist: false, flavorName: null, printings: ALL.length },
  { oracleId: "o-swan", name: "Swan Song", imageUri: "art/c-swan-song.jpg", owned: 1, decks: ["Tam's Sweepers"], wishlist: false, flavorName: null, printings: 4 },
  { oracleId: "o-aang", name: "Aang, Swift Savior", imageUri: "art/c-aang-swift-savior.jpg", owned: 0, decks: [], wishlist: true, flavorName: null, printings: 1 },
];
function phoneSearch(q: string, variant: "A" | "B") {
  return (
    <div className="flex min-h-dvh flex-col bg-[color:var(--bg)]">
      <div className="flex items-center gap-[6px] border-b border-b-[color:var(--border)] py-3 pr-2 pl-[14px] pt-[14px]">
        <SearchField containerClassName="h-11 min-w-0 flex-1 rounded-[10px] border-[color:var(--border-strong)] bg-[color:var(--surface-sunken)] pr-[6px] pl-[13px]"
          className="text-[16px] whitespace-nowrap" leading={<span className="flex-none text-[color:var(--fg-muted)]"><SearchGlyph size={18} /></span>}
          aria-label={cardSearchCopy.label} placeholder={cardSearchCopy.label} value={q} onChange={() => {}} onClear={() => {}} clearClassName="h-8 w-8 rounded-none bg-transparent text-[13px]" />
        <button type="button" className="flex h-11 w-11 flex-none items-center justify-center text-[16px] text-[color:var(--fg-muted)]">✕</button>
      </div>
      <p className="px-4 pt-[14px] pb-[6px] font-mono text-[11px] text-[color:var(--fg-faint)]">{cardSearchCopy.count(ROWS.length)}</p>
      <div role="listbox">
        {ROWS.map((r, i) => (
          <SearchRow key={r.oracleId} row={r} query={q} id={`r${i}`} first={i === 0} active={false} returned={false}
            onPick={() => {}} onAdd={() => {}} {...(variant === "B" ? { printingsCount: r.printings, onPrintings: () => {} } as any : {})} />
        ))}
      </div>
    </div>
  );
}
function deskSearch(q: string, variant: "A" | "B") {
  return (
    <div className="fixed top-[73px] left-[calc(var(--rail-w)+12px)] z-40 flex w-[540px] flex-col gap-2">
      <span aria-hidden className="absolute top-[18px] -left-[6px] z-10 h-[10px] w-[10px] rotate-45 border-b border-l border-solid border-[color:var(--accent)] border-b-[color:var(--accent)] border-l-[color:var(--accent)] bg-[color:var(--bg)]" />
      <div className="rounded-[10px] border border-solid border-[color:var(--accent)] bg-[color:var(--bg)] shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
        <SearchField containerClassName="h-[46px] min-w-0 gap-3 rounded-none border-0 bg-transparent pr-[10px] pl-4 focus-within:shadow-none" className="text-[15px] whitespace-nowrap"
          leading={<span className="flex-none text-[color:var(--fg-muted)]"><SearchGlyph size={18} /></span>} aria-label={cardSearchCopy.label} placeholder={cardSearchCopy.label}
          value={q} onChange={() => {}} onClear={() => {}} clearClassName="w-[28px] rounded-none bg-transparent text-[13px]" />
      </div>
      <div className="flex flex-col overflow-hidden rounded-[12px] border border-solid border-[color:var(--border-strong)] bg-[color:var(--surface-raised)] py-[6px] shadow-[0_22px_50px_rgba(0,0,0,0.6)]">
        <p className="px-[14px] pt-2 pb-[6px] font-mono text-[11px] text-[color:var(--fg-faint)]">{cardSearchCopy.count(ROWS.length)}</p>
        <div role="listbox">
          {ROWS.map((r, i) => (
            <SearchRow key={r.oracleId} row={r} query={q} id={`d${i}`} first={i === 0} active={i === 0} returned={false}
              onPick={() => {}} onAdd={() => {}} {...(variant === "B" ? { printingsCount: r.printings, onPrintings: () => {} } as any : {})} />
          ))}
        </div>
        <p className="flex flex-none items-center justify-between gap-3 border-t border-solid border-[color:var(--border)] px-[14px] pt-[9px] pb-[5px] font-mono text-[11px] text-[color:var(--fg-faint)]">
          <span>{cardSearchCopy.keysHintAdd("⌘↵")}</span><span>{cardSearchCopy.shortcutFoot("⌘K")}</span>
        </p>
      </div>
    </div>
  );
}
emit("S1-phone", "phone", () => phoneSearch("sw", "A"), { vh: 330 });
emit("S2-phone", "phone", () => phoneSearch("sw", "B"), { vh: 330 });
emit("S1-desk", "desk", () => deskSearch("sw", "A"), { vh: 420, bg: true });
emit("S2-desk", "desk", () => deskSearch("sw", "B"), { vh: 420, bg: true });

// ── Unowned (phone + desktop)
emit("U1-phone", "phone", () => modal(unowned, ALL), { scroll: "set", vh: 844 });
emit("U2-phone", "phone", () => modal(unowned, ALL), { expanded: true, scroll: "region", vh: 844 });
emit("U3-phone", "phone", () => modal(unowned, ALL), { expanded: true, preview: PV("SLD|2125"), scroll: "region", vh: 844 });
emit("U1-desk", "desk", () => modal(unowned, ALL), { vh: 760 });
emit("U2-desk", "desk", () => modal(unowned, ALL), { expanded: true, scroll: "region", vh: 760 });
emit("U3-desk", "desk", () => modal(unowned, ALL), { expanded: true, preview: PV("SLD|2125"), scroll: "region", vh: 760 });
// ── Owned
emit("O1-phone", "phone", () => modal(owned(), ALL), { scroll: "set", vh: 844 });
emit("O2-phone", "phone", () => modal(owned(), ALL), { expanded: true, scroll: "region", vh: 844 });
emit("O3-phone", "phone", () => modal(owned({ setCode: OWN[1].setCode, collectorNumber: OWN[1].collectorNumber }), ALL), { expanded: true, preview: PV("SLD|2804"), scroll: "region", vh: 844 });
emit("O1-desk", "desk", () => modal(owned(), ALL), { vh: 760 });
emit("O2-desk", "desk", () => modal(owned(), ALL), { expanded: true, scroll: "region", vh: 760 });
emit("O3-desk", "desk", () => modal(owned({ setCode: OWN[1].setCode, collectorNumber: OWN[1].collectorNumber }), ALL), { expanded: true, preview: PV("SLD|2804"), scroll: "region", vh: 760 });
// ── One printing
emit("X1-phone", "phone", () => modal(single, [MUD]), { scroll: "set", vh: 844 });
emit("X1-desk", "desk", () => modal(single, [MUD]), { vh: 760 });
writeFileSync("dz/frames.json", JSON.stringify(frames));
console.log("ok", frames.length);
