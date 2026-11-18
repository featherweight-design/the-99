// Move a copy later R1 (#2980, account 2, 2026-11-18): shipped components SSR'd with shipped CSS, the proposal applied.
import { renderToString } from "react-dom/server";
import { writeFileSync, mkdirSync } from "node:fs";
import type { ReactNode } from "react";
import * as React from "react";
import { NavRail, TabBar, MobileHeader } from "../src/components/shell/nav";
import { AvailabilityDetail } from "../src/components/cards/card-detail-blocks";
import { CopyChooserDialog } from "../src/components/decks/copy-chooser-dialog";
import { OtherDecks, type OtherDeck } from "../src/components/decks/other-decks";
import { HistoryList, HistoryEntryItem } from "../src/components/collection/history-list";

mkdirSync("dz/frames", { recursive: true });
const NOW = new Date("2026-11-18T02:00:00Z").getTime();
const D = (iso: string) => new Date(iso).getTime();
const NAME = "Swords to Plowshares";
const G = { id: "dg", name: "Giada's Angels" }, H = { id: "dh", name: "Heroes of the Plains" };
const claim = (d: { id: string; name: string }, since: number, v: number): any => ({ id: d.id, name: d.name, quantity: 1, mature: true, pending: false, commander: false, commanderCopies: 0, since, versionNumber: v });
const card: any = {
  name: NAME, oracleId: "o-swords", quantity: 1, imageUri: "art/c-swords.jpg",
  availability: { owned: 1, hard: 2, soft: 0, free: -1, claims: [claim(G, D("2026-09-02"), 7), claim(H, D("2026-10-21"), 3)] },
  draftWants: [],
};
// claimants in commit order; alloc = deck ids that get a copy.
const DK = { g: G, h: H, a: { id: "da", name: "Ajani's Pride" } } as const;
const CL: Record<string, [number, number]> = { dg: [D("2026-09-02"), 7], dh: [D("2026-10-21"), 3], da: [D("2026-11-03"), 2] };
const contested = (owned: number, ids: string[], alloc: string[], picked: string[] = []): any => ({
  oracleId: "o-swords", cardName: NAME, arrived: owned, fromImport: false, ownedBefore: owned, owned,
  claimants: ids.map((id) => { const d = Object.values(DK).find((x) => x.id === id)!; return {
    deckId: id, deckName: d.name, quantity: 1, commanderCopies: 0, granted: picked.includes(id) ? 1 : 0, grantedAt: picked.includes(id) ? NOW : null,
    since: CL[id][0], versionNumber: CL[id][1], allocated: alloc.includes(id) ? 1 : 0 }; }),
});
const OTHER = (pick?: string): OtherDeck[] => [
  { id: "ds", name: "Samut's Haste", cards: 96 }, { id: "dt", name: "Tam's Sweepers", cards: 99 }, { id: "dq", name: "Quintorius Digs", cards: 84 },
].map((d) => ({ ...d, picked: d.id === pick }));
const MANY: OtherDeck[] = ["Samut's Haste:96", "Tam's Sweepers:99", "Quintorius Digs:84", "Sai's Thopters:100", "Zada Copies:91", "Killian Ink:97",
  "Heliod Lifegain:99", "Kenrith Group Hug:88", "Atraxa Counters:100", "Ghired Tokens:95", "Rhys Elves:92", "Winota Knights:98"]
  .map((x, i) => { const [name, n] = x.split(":"); return { id: "m" + i, name, cards: +n }; });
const chooser = (c: any, other: React.ReactNode, sub = `${NAME} · ×${c.owned} in your collection`, extra = 0) => (
  <CopyChooserDialog extraGiven={extra} card={c} cardName={NAME} thisDeckId="" sub={sub} onCard={() => {}} onClose={() => {}}>{other}</CopyChooserDialog>
);
const od = (decks: OtherDeck[], open: boolean, copies = 1, find?: string) => <OtherDecks decks={decks} cardName={NAME} open={open} copies={copies} find={find} hiddenColors={2} />;
const entry = (id: string, iso: string, first: string, went: any, kind: any = "add"): any => ({
  id, seq: 1, createdAt: new Date(iso), kind, source: null, raised: 1, lowered: 0, rowCount: 1, copiesUp: 1, copiesDown: 0, removesOnly: false,
  revertsId: null, revertedBy: null, revertsVisible: true, revertedByVisible: true, uploadFilename: null, firstName: first,
  shoppingDeck: null, shoppingCart: false, preconName: null, addedFromDeck: null, cartDecks: null, wentTo: went,
});
const went = (d: { id: string; name: string }, proposal: any) => ({ decks: { named: [d], more: 0, gone: 0 }, soft: false, proposal });
const ENTRIES = (moved: boolean) => [
  entry("e1", "2026-11-17T22:10:00Z", "Lightning Greaves", went({ id: "dl", name: "Lathliss Dragons" }, {})),
  entry("e2", "2026-11-17T19:42:00Z", NAME, went(G, moved ? { now: H.name, change: true } : { change: true })),
  entry("e3", "2026-11-16T16:05:00Z", "Arcane Signet", went({ id: "dt", name: "Tam's Sweepers" }, {})),
];
const history = (moved: boolean) => <HistoryList initial={ENTRIES(moved)} nextBefore={null} nowMs={NOW} reachesBack={new Date(NOW - 90 * 864e5)} reachesBackLabel="Aug 20" shipLabel="Aug 1" />;

// ── R1c: a large History entry (Hugh's live capture, 62 cards to 9 decks).
const BD: Record<string, string> = { mm: "HD Tune - Mutant Menace", zo: "HD - Zombies", pa: "HD Tune - Prismari Artistry", bi: "HD - Bilm",
  gi: "HD - Gishath", ur: "HD - Urza", ka: "HD - Kaalia", ny: "HD - Nymris", ob: "HD - Obeka" };
const R = (name: string, set: string, num: string, before: number, after: number, went?: [string, boolean?], prop?: any): any => ({
  oracleId: name, setCode: set, collectorNumber: num, finish: "nonfoil", name,
  before: before ? { quantity: before, scryfallId: null, condition: null } : null, after: { quantity: after, scryfallId: null, condition: null },
  ...(went ? { wentTo: { soft: went[1] ? true : undefined, decks: [{ deckId: went[0], copies: 1 }] } } : {}), ...(prop ? { proposal: prop } : {}),
});
const UP = (moved: boolean) => [
  R("Deathcap Glade", "sos", "253", 1, 2, ["mm"], moved ? { change: true, now: BD.gi } : { change: true }),
  R("Swiftfoot Boots", "fdn", "355", 1, 2), R("Sol Ring", "soc", "128", 2, 3, ["bi", true]),
  R("An Offer You Can't Refuse", "snc", "51", 1, 2, ["mm"], { change: true }),
  R("Sol Ring", "m3c", "305", 1, 3), R("Sol Ring", "frc", "21", 1, 3), R("Arcane Signet", "fic", "332", 1, 3), R("Arcane Signet", "frc", "20", 1, 3),
  R("Command Tower", "cmm", "1003", 2, 3), R("Exotic Orchard", "cmm", "1011", 1, 2), R("Path of Ancestry", "cmm", "1018", 1, 2),
  R("Thought Vessel", "cmm", "403", 1, 2), R("Mind Stone", "cmm", "394", 1, 2),
];
const NEWR = Array.from({ length: 49 }, (_, i) => i === 3
  ? R("Fabled Passage", "w17", "247", 0, 1, ["gi"], { change: true })
  : R(["Llanowar Elves", "Counterspell", "Cultivate", "Beast Within", "Rhystic Study", "Dockside Extortionist", "Smothering Tithe"][i % 7], "cmm", String(300 + i), 0, 1, i % 5 === 0 ? [["zo", "pa", "ur", "ka"][i % 4]] : undefined));
const BIG = entry("big", "2026-11-18T10:04:00Z", "Deathcap Glade", { decks: { named: [{ id: "mm", name: BD.mm }, { id: "zo", name: BD.zo }, { id: "pa", name: BD.pa }], more: 6, gone: 0 }, soft: false, proposal: { movable: 3 } });
Object.assign(BIG, { rowCount: 62, raised: 62, copiesUp: 75 });
const bigDetail = (pick?: string, moved = false): any => { const rows: any = [...UP(moved), ...NEWR]; if (pick) rows.__pick = pick; return { ...BIG, rows, sync: null, rowDecks: BD }; };
const bigList = (open: boolean, pick?: string, moved = false) => (
  <section className="px-[16px] pb-[32px] pt-[18px] md:px-[24px] md:pt-[24px]">
    <div className="mt-[4px]">
      <h2 className="m-0 mb-[6px] font-mono text-[10.5px] font-normal uppercase tracking-[0.14em] text-[color:var(--fg-muted)]">Today · Nov 18</h2>
      <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
        <HistoryEntryItem e={BIG} title="Deathcap Glade and 61 more" isOpen={open} detail={open ? bigDetail(pick, moved) : undefined} onToggle={() => {}} onRevert={() => {}} onRetry={() => {}} />
      </ul>
    </div>
  </section>
);
const two = ["dg", "dh"], three = ["dg", "dh", "da"];

type Dev = "phone" | "desk";
const frames: { id: string; dev: Dev; vh?: number }[] = [];
function emit(id: string, dev: Dev, body: ReactNode, vh?: number) {
  writeFileSync(`dz/frames/${id}.html`, renderToString(<>{body}</>));
  frames.push({ id, dev, vh });
}
function shell(path: string, main: ReactNode) {
  (globalThis as any).__PATH = path;
  const badges = { friends: 0, friendsWaiting: 0, friendsAt: new Date(NOW).toISOString() } as any;
  const door: any = { adminDoor: false, adminEnv: null, credits: null };
  return (
    <div className="flex min-h-dvh flex-1">
      <NavRail locked={false} openLock={null as any} theme="amonkhet" {...door} friendsMoment={false} badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col pb-[var(--tabbar-h)] md:pb-0">
        <MobileHeader theme="amonkhet" {...door} />
        <main className="flex min-w-0 flex-1 flex-col">{main}</main>
      </div>
      <TabBar locked={false} openLock={null as any} friendsMoment={false} badges={badges} />
    </div>
  );
}
// Card details, phone, the sheet pulled full: grip, title row, the In your decks receipt (the card above, scrolled past).
function detailsSheet(cardProp: any) {
  return (
    <div className="relative min-h-dvh" style={{ background: "var(--bg)" }}>
      <div className="absolute inset-x-0 bottom-0 top-[56px] rounded-t-[18px] border-t border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] px-[18px]">
        <div className="flex h-[22px] items-center justify-center"><span className="block h-[4px] w-[36px] rounded-[2px]" style={{ background: "var(--border-strong)" }} /></div>
        <div className="flex items-start gap-[12px] pt-[6px]">
          <img src="art/c-swords.jpg" alt="" className="w-[63px] flex-none rounded-[4px]" />
          <div className="min-w-0 flex-1">
            <h2 className="m-0 font-display text-[20px] font-bold" style={{ color: "var(--fg)" }}>{NAME}</h2>
            <p className="m-0 mt-[4px] font-mono text-[12px]" style={{ color: "var(--fg-muted)" }}>Instant · W · Commander Masters</p>
          </div>
          <span aria-hidden className="text-[18px]" style={{ color: "var(--fg-muted)" }}>✕</span>
        </div>
        <div className="mt-[16px] rounded-[10px] p-[14px_16px] text-[14px] leading-[1.55]" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg-body)" }}>
          Exile target creature. Its controller gains life equal to its power.
        </div>
        <AvailabilityDetail card={cardProp} deckPage={false} onEditCopies={() => {}} onChangeCopy={() => {}} />
      </div>
    </div>
  );
}

const sheet = (x: React.ReactNode) => <>{detailsSheet(card)}{x}</>;
emit("C1-phone", "phone", detailsSheet(card), 844);
emit("C2-phone", "phone", sheet(chooser(contested(1, two, ["dg"]), od(OTHER(), false))), 844);
emit("C3-phone", "phone", sheet(chooser(contested(1, two, ["dh"], ["dh"]), od(OTHER(), false))), 844);
emit("O1-phone", "phone", sheet(chooser(contested(1, two, ["dg"]), od(OTHER(), true))), 900);
emit("O2-phone", "phone", sheet(chooser(contested(1, two, []), od(OTHER("dt"), true))), 900);
emit("O3-phone", "phone", sheet(chooser(contested(1, two, []), od(OTHER("dt"), false))), 844);
emit("M1-phone", "phone", sheet(chooser(contested(1, three, ["dg"]), od(OTHER(), false))), 844);
emit("M2-phone", "phone", sheet(chooser(contested(2, three, ["dg", "da"], ["da"]), od(OTHER(), false))), 844);
emit("M3-phone", "phone", sheet(chooser(contested(2, three, ["dg"]), od(OTHER("ds"), true, 2), undefined, 1)), 960);
emit("F1-phone", "phone", sheet(chooser(contested(1, two, ["dg"]), od(MANY, true))), 960);
emit("F2-phone", "phone", sheet(chooser(contested(1, two, ["dg"]), od(MANY, true, 1, "he"))), 900);
emit("H1-phone", "phone", shell("/collection", history(false)), 760);
emit("H2-phone", "phone", <>{shell("/collection", history(false))}{chooser(contested(1, two, ["dg"]), od(OTHER(), false))}</>, 844);
emit("H3-phone", "phone", shell("/collection", history(true)), 760);
emit("H1-desk", "desk", <>{shell("/collection", history(false))}{chooser(contested(1, two, ["dg"]), od(OTHER(), true))}</>, 900);
emit("H3-desk", "desk", shell("/collection", history(true)), 640);
emit("L1-phone", "phone", shell("/collection", bigList(false)), 760);
emit("L2-phone", "phone", shell("/collection", bigList(true)), 1500);
emit("L3-phone", "phone", shell("/collection", bigList(true, "move")), 1000);
emit("L4-phone", "phone", shell("/collection", bigList(true, "move", true)), 1000);
emit("L3-desk", "desk", shell("/collection", bigList(true, "move")), 760);
writeFileSync("dz/frames.json", JSON.stringify(frames));
console.log("ok", frames.length);
