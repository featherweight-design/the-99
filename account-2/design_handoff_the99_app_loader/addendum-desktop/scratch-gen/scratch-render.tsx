import { renderToString as rts } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { PathnameContext, SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime";
import { writeFileSync } from "node:fs";
import { NavRail } from "./src/components/shell/nav";
import { Dashboard } from "./src/components/home/dashboard";
import { named } from "./src/lib/person-name/mint";
const router: any = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {} };
const wrap = (el: any) => rts(<AppRouterContext.Provider value={router}><PathnameContext.Provider value="/"><SearchParamsContext.Provider value={new URLSearchParams() as any}>{el}</SearchParamsContext.Provider></PathnameContext.Provider></AppRouterContext.Provider>);
const NOW = "2026-11-15T03:00:00.000Z";
const d = (id: string, name: string, cmd: string, art: string, o: any = {}) => ({
  id, name, createdAt: new Date("2026-10-01T00:00:00Z"), commanderName: cmd, commanderColorIdentity: ["G", "U"],
  commanderImageUri: null, commanderArtCropUri: `art/${art}.png`, partnerName: null, partnerColorIdentity: null,
  folderId: null, folderName: null, built: 99, ownedCount: 99, toBuyCount: 0, unresolvedCount: 0, pendingChanges: 0,
  versionNumber: null, statusPill: "Complete", bracket: null, lastPlayedAt: null, lastEditedAt: new Date("2026-11-15T02:40:00Z"),
  lastCommittedAt: null, inUseElsewhere: 0, proxiedCount: 0, ...o });
const decks = [
  d("a", "Tidewrack Library", "Pako, Arcane Retriever", "tide"),
  d("b", "Ashen Banner Parade", "Ashling, the Limitless", "ashen", { statusPill: "To buy", ownedCount: 97, toBuyCount: 2, bracket: { permits: [3], answered: null }, lastEditedAt: new Date("2026-11-15T02:39:00Z") }),
  d("c", "Hollow Oak Hours", "Brawn", "hollow", { partnerName: "Amadeus Cho", statusPill: "Draft", ownedCount: 85, toBuyCount: 14, lastEditedAt: new Date("2026-11-15T02:38:00Z") }),
  d("e", "Saltmarsh Reclamation", "Giada, Font of Hope", "salt", { statusPill: "Draft", built: 101, ownedCount: 86, toBuyCount: 15, lastEditedAt: new Date("2026-11-15T02:37:00Z") }),
  d("f", "Fifth Deck", "Atraxa, Praetors' Voice", "tide", { lastEditedAt: new Date("2026-11-01T00:00:00Z") }),
];
const altar = { oracleId: "pa", name: "Phyrexian Altar", image: "art/altar.png", art: null, colorIdentity: [] };
const drop = { key: "k1", kind: "price-drop", at: "2026-11-15T01:00:00.000Z", unseen: false, card: altar, friend: null, href: null, opens: null,
  outbound: "https://manapool.com/x", name: null, setSize: null, owned: null, drop: { fromCents: 1200, toCents: 700 }, combo: null, answer: null, askable: false };
const props: any = {
  stats: { totalCards: 4004, uniqueCards: 2900 }, lastUpdated: new Date("2026-11-01T00:00:00Z"),
  ready: null, feed: { chosen: true, on: ["price-drop"], items: [drop], unseen: 0, lead: null }, archive: true,
  inUse: new Map(), decks, commitments: { inUse: 134, overCommitted: 0 },
  friends: { you: { displayName: "Hugh", commander: null }, friends: [{ publicId: "p1", displayName: named("Alex"), commander: { oracleId: "x", name: "X", artCropUri: "art/alex.png" } }], links: [] },
  shopping: { byDeck: new Map([["b", { copies: 2, cents: 400, pricedCopies: 2 }], ["c", { copies: 14, cents: 30000, pricedCopies: 14 }], ["e", { copies: 15, cents: 30000, pricedCopies: 15 }]]), total: { copies: 45, cents: 76663, pricedCopies: 45 } },
  now: NOW,
};
const page = <div className="flex min-h-screen"><NavRail locked={false} theme={"amonkhet" as any} adminDoor={false as any} adminEnv={null as any} credits={null as any} /><main className="flex min-w-0 flex-1 flex-col"><Dashboard {...props} /></main></div>;
writeFileSync("hero/home-desktop.html", wrap(page));
console.log("ok");
