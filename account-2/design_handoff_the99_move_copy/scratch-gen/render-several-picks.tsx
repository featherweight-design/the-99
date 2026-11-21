// Move a copy · several picks (account 2, 2026-11-21): shipped components SSR'd with shipped CSS, the proposal applied.
import { renderToString } from "react-dom/server";
import { writeFileSync, mkdirSync } from "node:fs";
import type { ReactNode } from "react";
import * as React from "react";
import { NavRail, TabBar, MobileHeader } from "../src/components/shell/nav";
import { AvailabilityDetail } from "../src/components/cards/card-detail-blocks";
import { ChangeDoorContext } from "../src/components/cards/change-door-context";
import { ChangeCopyDoor } from "../src/components/cards/change-copy-door";
import { CopyChooserDialog } from "../src/components/decks/copy-chooser-dialog";
import { HistoryEntryItem } from "../src/components/collection/history-list";
import { moveCopyCopy } from "../src/lib/copy/move-copy";

mkdirSync("dz/frames", { recursive: true });
const NOW = new Date("2026-11-21T15:00:00Z").getTime();
const D = (iso: string) => new Date(iso).getTime();
const NAME = "Fabled Passage";
const OID = "o-fabled";
const DECKS = [
  { id: "z", name: "HD - Zombies", since: D("2026-07-09"), v: 4 },
  { id: "p", name: "HD Tune - Prismari Artistry", since: D("2026-08-14"), v: 6 },
  { id: "u", name: "HD - Urza", since: D("2026-09-02"), v: 3 },
  { id: "g", name: "HD - Gishath", since: D("2026-10-01"), v: 5 },
  { id: "r", name: "Multiverse Reforged", since: D("2026-10-28"), v: 2 },
  { id: "m", name: "HD Tune - Mutant Menace", since: D("2026-11-18"), v: 3 },
];
const OWNED = 5;
const byId = (id: string) => DECKS.find((d) => d.id === id)!;
// The ruling: picks first, then the oldest unpicked decks fill the copies left.
function alloc(picks: string[]): Set<string> {
  const out = new Set(picks);
  for (const d of DECKS) if (out.size < OWNED && !out.has(d.id)) out.add(d.id);
  return out;
}
const contested = (picks: string[]): any => {
  const got = alloc(picks);
  return {
    oracleId: OID, cardName: NAME, arrived: OWNED, fromImport: false, ownedBefore: OWNED, owned: OWNED,
    claimants: DECKS.map((d) => ({
      deckId: d.id, deckName: d.name, quantity: 1, commanderCopies: 0, granted: picks.includes(d.id) ? 1 : 0,
      grantedAt: picks.includes(d.id) ? NOW : null, since: d.since, versionNumber: d.v, allocated: got.has(d.id) ? 1 : 0,
    })),
  };
};
const browse = (picks: string[]): any => ({
  name: NAME, oracleId: OID, quantity: OWNED, imageUri: null,
  availability: {
    owned: OWNED, hard: DECKS.length, soft: 0, free: OWNED - DECKS.length,
    claims: DECKS.map((d) => ({ id: d.id, name: d.name, quantity: 1, mature: true, pending: false, commander: false, commanderCopies: 0,
      since: d.since, versionNumber: d.v, granted: picks.includes(d.id) ? 1 : 0, grantedAt: picks.includes(d.id) ? String(NOW) : null })),
  },
  draftWants: [],
});
const chooser = (picks: string[]) => (
  <CopyChooserDialog card={contested(picks)} cardName={NAME} title={moveCopyCopy.titleMany} sub={`${NAME} · ×${OWNED} in your collection`} onCard={() => {}} onClose={() => {}} />
);
const changeDoor = (x: { oracleId: string; name: string; owned: number }) => <ChangeCopyDoor oracleId={x.oracleId} cardName={x.name} owned={x.owned} />;

// Card details, phone: the sheet scrolled to its receipt (the card's own header has scrolled past).
function detailsSheet(picks: string[]) {
  return (
    <div className="relative min-h-dvh" style={{ background: "var(--bg)" }}>
      <div className="absolute inset-x-0 bottom-0 top-[56px] rounded-t-[18px] border-t border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] px-[18px]">
        <div className="flex h-[22px] items-center justify-center"><span className="block h-[4px] w-[36px] rounded-[2px]" style={{ background: "var(--border-strong)" }} /></div>
        <div className="mt-[6px] rounded-[10px] p-[14px_16px] text-[14px] leading-[1.55]" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg-body)" }}>
          {"{T}, Sacrifice Fabled Passage: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle. Then if you control four or more lands, untap that land."}
        </div>
        <ChangeDoorContext.Provider value={changeDoor as any}>
          <AvailabilityDetail card={browse(picks)} deckPage={false} onEditCopies={() => {}} />
        </ChangeDoorContext.Provider>
      </div>
    </div>
  );
}
// Card details, desktop: the shipped 720 modal's receipt column over the dimmed page.
function detailsModal(picks: string[]) {
  return (
    <div className="flex min-h-dvh items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-[640px]">
        <div className="rounded-[10px] p-[14px_16px] text-[14px] leading-[1.55]" style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--fg-body)" }}>
          {"{T}, Sacrifice Fabled Passage: Search your library for a basic land card, put it onto the battlefield tapped, then shuffle. Then if you control four or more lands, untap that land."}
        </div>
        <ChangeDoorContext.Provider value={changeDoor as any}>
          <AvailabilityDetail card={browse(picks)} deckPage={false} onEditCopies={() => {}} />
        </ChangeDoorContext.Provider>
      </div>
    </div>
  );
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

// History. `live` is the per-card read; `gained` = the decks only a pick put a copy in (the proposal).
const clock = { nowMs: NOW, zone: "America/Denver", locale: "en-US" };
const liveFor = (picks: string[]) => {
  const got = alloc(picks);
  const seniority = alloc([]);
  return {
    [OID]: {
      change: true,
      holders: DECKS.filter((d) => got.has(d.id)).map((d) => ({ id: d.id, name: d.name })),
      gained: DECKS.filter((d) => got.has(d.id) && !seniority.has(d.id)).map((d) => ({ id: d.id, name: d.name })),
    },
  } as any;
};
const entry = (id: string, iso: string, first: string, went: any, single?: any): any => ({
  id, seq: 1, createdAt: new Date(iso), kind: "add", source: null, raised: 1, lowered: 0, rowCount: 1, copiesUp: 1, copiesDown: 0, removesOnly: false,
  revertsId: null, revertedBy: null, revertsVisible: true, revertedByVisible: true, uploadFilename: null, firstName: first,
  shoppingDeck: null, shoppingCart: false, preconName: null, addedFromDeck: null, cartDecks: null, wentTo: went, single,
});
const wentTo = (d: { id: string; name: string }) => ({ decks: { named: [{ id: d.id, name: d.name }], more: 0, gone: 0 }, soft: false });
const historyList = (picks: string[]) => {
  (globalThis as any).__TAB = null;
  const live = liveFor(picks);
  const g = byId("g"), m = byId("m");
  const items = [
    { e: entry("e1", "2026-11-21T14:12:00Z", "Arcane Signet", wentTo(m), { oracleId: "o-signet", wentDeckIds: ["m"] }), t: "Arcane Signet" },
    { e: entry("e2", "2026-11-20T23:40:00Z", NAME, wentTo(g), { oracleId: OID, wentDeckIds: ["g"] }), t: NAME },
  ];
  return (
    <section className="px-[16px] pb-[32px] pt-[18px] md:px-[24px] md:pt-[24px]">
      <h1 className="m-0 font-display text-[22px] font-bold md:text-[28px]" style={{ color: "var(--fg)" }}>Changes to your collection</h1>
      <p className="m-0 mt-[6px] text-[14px] leading-[1.5]" style={{ color: "var(--fg-muted)" }}>Every upload and edit from the last 90 days is listed here. A revert takes a change back as of today.</p>
      <div className="mt-[18px]">
        <h2 className="m-0 mb-[6px] font-mono text-[10.5px] font-normal uppercase tracking-[0.14em] text-[color:var(--fg-muted)]">Today · Nov 21</h2>
        <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
          <HistoryEntryItem e={items[0].e} title={items[0].t} isOpen={false} detail={undefined} onToggle={() => {}} onRevert={() => {}} onRetry={() => {}} clock={clock} live={{ "o-signet": { change: false, holders: [{ id: "m", name: m.name }] } } as any} onWritten={() => {}} />
        </ul>
      </div>
      <div className="mt-[18px]">
        <h2 className="m-0 mb-[6px] font-mono text-[10.5px] font-normal uppercase tracking-[0.14em] text-[color:var(--fg-muted)]">Yesterday · Nov 20</h2>
        <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
          <HistoryEntryItem e={items[1].e} title={items[1].t} isOpen={false} detail={undefined} onToggle={() => {}} onRevert={() => {}} onRetry={() => {}} clock={clock} live={live} onWritten={() => {}} />
        </ul>
      </div>
    </section>
  );
};

// A large entry open on its last tab, Can move (R1c), Hugh's 62-card add.
const BD: Record<string, string> = { m: "HD Tune - Mutant Menace", zo: "HD - Zombies", pa: "HD Tune - Prismari Artistry", g: "HD - Gishath", ur: "HD - Urza" };
const R = (oid: string, name: string, set: string, num: string, before: number, after: number, went?: string): any => ({
  oracleId: oid, setCode: set, collectorNumber: num, finish: "nonfoil", name,
  before: before ? { quantity: before, scryfallId: null, condition: null } : null, after: { quantity: after, scryfallId: null, condition: null },
  ...(went ? { wentTo: { decks: [{ deckId: went, copies: 1 }] } } : {}),
});
const bigRows = [
  R("o-deathcap", "Deathcap Glade", "sos", "253", 1, 2, "m"),
  R("o-offer", "An Offer You Can't Refuse", "snc", "51", 1, 2, "m"),
  ...Array.from({ length: 11 }, (_, i) => R("o-up" + i, ["Swiftfoot Boots", "Sol Ring", "Arcane Signet", "Command Tower", "Exotic Orchard"][i % 5], "cmm", String(400 + i), 1, 2)),
  R(OID, NAME, "w17", "247", 0, 1, "g"),
  ...Array.from({ length: 48 }, (_, i) => R("o-new" + i, ["Llanowar Elves", "Counterspell", "Cultivate", "Beast Within", "Rhystic Study"][i % 5], "cmm", String(300 + i), 0, 1)),
];
const bigList = (picks: string[]) => {
  (globalThis as any).__TAB = "move";
  const live = {
    "o-deathcap": { change: true, holders: [{ id: "m", name: BD.m }] },
    "o-offer": { change: true, holders: [{ id: "m", name: BD.m }] },
    ...liveFor(picks),
  } as any;
  const BIG = entry("big", "2026-11-18T17:04:00Z", "Deathcap Glade",
    { decks: { named: [{ id: "m", name: BD.m }, { id: "zo", name: BD.zo }, { id: "pa", name: BD.pa }], more: 6, gone: 0 }, soft: false });
  Object.assign(BIG, { rowCount: 62, raised: 62, copiesUp: 75, multi: { oracleIds: ["o-deathcap", "o-offer", OID], capped: false } });
  const detail: any = { ...BIG, rows: bigRows, sync: null, rowDecks: BD };
  return (
    <section className="px-[16px] pb-[32px] pt-[18px] md:px-[24px] md:pt-[24px]">
      <h2 className="m-0 mb-[6px] font-mono text-[10.5px] font-normal uppercase tracking-[0.14em] text-[color:var(--fg-muted)]">Nov 18</h2>
      <ul className="m-0 flex list-none flex-col gap-[8px] p-0">
        <HistoryEntryItem e={BIG} title="Deathcap Glade and 61 more" isOpen detail={detail} onToggle={() => {}} onRevert={() => {}} onRetry={() => {}} clock={clock} live={live} onWritten={() => {}} />
      </ul>
    </section>
  );
};

type Dev = "phone" | "desk";
const frames: { id: string; dev: Dev; vh?: number }[] = [];
function emit(id: string, dev: Dev, body: ReactNode, vh?: number) {
  writeFileSync(`dz/frames/${id}.html`, renderToString(<>{body}</>));
  frames.push({ id, dev, vh });
}
const over = (picks: string[], under: ReactNode) => <>{under}{chooser(picks)}</>;
const MM = ["m"], BOTH = ["m", "r"], ONLY_R = ["r"], FULL = ["p", "u", "g", "r", "m"];

// P · the chooser, phone, over card details
emit("P1-phone", "phone", over([], detailsSheet([])), 900);
emit("P2-phone", "phone", over(MM, detailsSheet(MM)), 900);
emit("P3-phone", "phone", over(BOTH, detailsSheet(BOTH)), 900);
emit("P4-phone", "phone", over(ONLY_R, detailsSheet(ONLY_R)), 900);
emit("P5-phone", "phone", over(FULL, detailsSheet(FULL)), 940);
// C · card details, phone
emit("C1-phone", "phone", detailsSheet([]), 640);
emit("C2-phone", "phone", detailsSheet(BOTH), 640);
emit("C3-phone", "phone", detailsSheet(FULL), 640);
// H · History, phone
emit("H1-phone", "phone", shell("/collection", historyList([])), 760);
emit("H2-phone", "phone", shell("/collection", historyList(BOTH)), 760);
// L · a large entry's Can move tab, phone
emit("L1-phone", "phone", shell("/collection", bigList([])), 1000);
emit("L2-phone", "phone", shell("/collection", bigList(BOTH)), 1000);
// D · desktop
emit("D1-desk", "desk", over([], shell("/collection", historyList([]))), 900);
emit("D2-desk", "desk", over(BOTH, shell("/collection", historyList([]))), 900);
emit("D3-desk", "desk", over(FULL, shell("/collection", historyList([]))), 900);
emit("D4-desk", "desk", detailsModal(BOTH), 600);
emit("D5-desk", "desk", shell("/collection", historyList(BOTH)), 640);
emit("D6-desk", "desk", shell("/collection", bigList(BOTH)), 860);
writeFileSync("dz/frames.json", JSON.stringify(frames));
console.log("ok", frames.length);
