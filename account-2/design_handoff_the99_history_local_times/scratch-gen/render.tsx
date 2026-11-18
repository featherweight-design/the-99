// History local times R1 (#2986, account 2, 2026-11-18): the shipped History list SSR'd with shipped CSS.
// MODE=before renders main as shipped; MODE=after renders with proposal.diff applied. Reader in America/Denver.
import { renderToString } from "react-dom/server";
import { writeFileSync, mkdirSync } from "node:fs";
import type { ReactNode } from "react";
import { NavRail, TabBar, MobileHeader } from "../src/components/shell/nav";
import { HistoryList } from "../src/components/collection/history-list";
import { CollectionPlaceHead } from "../src/components/collection/collection-place-head";

const MODE = process.env.MODE ?? "after";
const TZ = "America/Denver";
mkdirSync("dz/frames", { recursive: true });
const NOW = new Date("2026-11-18T21:14:00Z").getTime(); // Wed Nov 18, 2:14 PM in Denver
const entry = (id: string, iso: string, kind: any, first: string | null, more: Partial<any> = {}): any => ({
  id, seq: 1, createdAt: new Date(iso), kind, source: null, raised: 1, lowered: 0, rowCount: 1, copiesUp: 1, copiesDown: 0, removesOnly: false,
  revertsId: null, revertedBy: null, revertsVisible: true, revertedByVisible: true, uploadFilename: null, firstName: first,
  shoppingDeck: null, shoppingCart: false, preconName: null, addedFromDeck: null, cartDecks: null, wentTo: null, ...more,
});
const went = (id: string, name: string) => ({ decks: { named: [{ id, name }], more: 0, gone: 0 }, soft: false });
const ENTRIES = [
  entry("e1", "2026-11-18T21:13:40Z", "add", "Arcane Signet", { wentTo: went("dt", "Tam's Sweepers") }),
  entry("e2", "2026-11-18T20:58:00Z", "edit", "Lightning Greaves", { source: "shopping:dl", shoppingDeck: { id: "dl", name: "Lathliss Dragons" } }),
  entry("e3", "2026-11-18T16:30:00Z", "revert", null, { revertsId: "e5", copiesUp: 1 }),
  entry("e4", "2026-11-18T06:40:00Z", "add", "Swords to Plowshares", { wentTo: went("dg", "Giada's Angels") }),
  entry("e5", "2026-11-17T22:15:00Z", "edit", "Sol Ring", { removesOnly: true, copiesUp: 0, copiesDown: 1, raised: 0, lowered: 1, revertedBy: "e3" }),
  entry("e6", "2026-11-17T02:30:00Z", "upload_sync", null, { uploadFilename: "collection-nov.csv", rowCount: 42, copiesUp: 31, copiesDown: 6 }),
  entry("e7", "2026-11-12T19:05:00Z", "edit", "Cyclonic Rift", { copiesUp: 1 }),
  entry("e8", "2026-11-09T03:20:00Z", "add", "Sol Ring", { copiesUp: 2, rowCount: 1 }),
];

type Dev = "phone" | "desk";
const frames: { id: string; dev: Dev; vh?: number; scroll?: number }[] = [];
function emit(id: string, dev: Dev, body: ReactNode, vh?: number, scroll?: number) {
  writeFileSync(`dz/frames/${id}.html`, renderToString(<>{body}</>));
  frames.push({ id, dev, vh, scroll });
}
function shell(main: ReactNode) {
  (globalThis as any).__PATH = "/collection/history";
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
const list = (entries = ENTRIES) => {
  const p: any = { initial: entries, nextBefore: null, nowMs: NOW, reachesBack: new Date("2026-08-20T12:00:00Z"), reachesBackLabel: "Aug 20", shipLabel: "Aug 1" };
  if (MODE === "after") p.timeZone = TZ;
  return <><CollectionPlaceHead stats={{ totalCards: 2140, uniqueCards: 1612 }} lastUpdatedLabel="today" editEnabled historyHasEntries preconPick scan wishlistEnabled /><HistoryList {...p} /></>;
};
const tag = MODE === "before" ? "B" : "A";
emit(`${tag}1-phone`, "phone", shell(list()), 1500);
emit(`${tag}1-desk`, "desk", shell(list()), 1240);
writeFileSync(`dz/frames-${MODE}.json`, JSON.stringify(frames));
console.log("ok", MODE, frames.length);
