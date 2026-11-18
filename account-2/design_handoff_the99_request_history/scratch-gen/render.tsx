// Card request history R1 (account 2, 2026-11-18): every frame is the shipped shell and the shipped Friends page,
// rendered with the shipped CSS, with this round's proposal (request-history.tsx, the Your requests head link).
import { renderToString } from "react-dom/server";
import { writeFileSync, mkdirSync } from "node:fs";
import type { ReactNode } from "react";
import { NavRail, TabBar, MobileHeader } from "../src/components/shell/nav";
import { FriendsView } from "../src/components/social/friends-view";
import { YourRequests } from "../src/components/social/your-requests";
import { RequestHistory, type HistoryRow } from "../src/components/social/request-history";
import { named } from "../src/lib/person-name/mint";

mkdirSync("dz/frames", { recursive: true });
const NOW = new Date("2026-11-18T02:00:00Z");
const ago = (d: number) => new Date(NOW.getTime() - d * 86400_000);
const F = {
  colin: { name: named("Colin"), commander: { oracleId: "c", name: "Giada", artCropUri: "art/face-giada.jpg" } },
  peter: { name: named("Peter"), commander: { oracleId: "p", name: "Sai", artCropUri: "art/face-sai.jpg" } },
  max: { name: named("Max"), commander: { oracleId: "m", name: "Rootha", artCropUri: "art/face-rootha.jpg" } },
  chris: { name: named("Chris"), commander: null },
};
type K = keyof typeof F;
const CARD = (n: string, f: string) => ({ name: n, imageUri: `art/${f}.jpg` });
const C = { jace: CARD("Jace, Vryn's Prodigy", "jace"), ghalta: CARD("Ghalta, Primal Hunger", "ghalta"), giada: CARD("Giada, Font of Hope", "giada"),
  dina: CARD("Dina, Soul Steeper", "dina"), sai: CARD("Sai, Master Thopterist", "sai"), lath: CARD("Lathliss, Dragon Queen", "lathliss"), gisa: CARD("Gisa, Glorious Resurrector", "gisa") };
const ME: any = { publicId: "me", displayName: "Wren Calloway", commander: null };
const friend = (k: K, days: number) => ({ publicId: k, displayName: F[k].name, since: ago(days), commander: F[k].commander });
const FRIENDS = [friend("colin", 60), friend("max", 40), friend("peter", 90), friend("chris", 20)];

const live = (id: string, k: K, card: any, state: any, d: number, extra: any = {}): any => ({
  id, oracleId: id, card, copies: 1, deckName: "Thopter Works", deckId: "d1", standalone: false,
  holder: { publicId: k, displayName: F[k].name, commander: F[k].commander }, state, daysLeft: state === "open" ? 14 - d : null,
  createdAt: ago(d), answeredAt: state === "yes" || state === "no" ? ago(d - 1) : null, seenAt: null, cleared: false,
  unseen: false, othersWithSpare: [], canAskAgain: false, ...extra,
});
const LIVE = [live("l1", "colin", C.giada, "open", 2), live("l2", "max", C.dina, "yes", 5, { unseen: true })];

const H = (id: string, k: K, card: any, state: HistoryRow["state"], d: number, close: number | null, deck: string | null = "Thopter Works", copies = 1): HistoryRow => ({
  id, card, friend: { displayName: F[k].name, commander: F[k].commander }, state, createdAt: ago(d), closedAt: close === null ? null : ago(close),
  deckName: deck, copies, daysLeft: state === "open" ? 14 - d : null,
});
const ASKED = [
  H("a1", "colin", C.giada, "open", 2, null),
  H("a2", "max", C.dina, "yes", 5, 4),
  H("a3", "peter", C.jace, "no", 9, 8, "Jace Control"),
  H("a4", "chris", C.lath, "withdrawn", 16, 15, null),
  H("a5", "colin", C.sai, "yes", 24, 23),
  H("a6", "max", C.gisa, "expired", 44, 30, "Gisa's Ghouls"),
  H("a7", "peter", C.ghalta, "yes", 52, 51, "Stompy"),
];
const OFYOU = [
  H("o1", "chris", C.ghalta, "open", 5, null, null),
  H("o2", "colin", C.jace, "yes", 12, 11, null),
  H("o3", "peter", C.lath, "no", 20, 20, null, 2),
  H("o4", "max", C.sai, "expired", 47, 33, null),
];

type Dev = "phone" | "desk";
const frames: { id: string; dev: Dev; vh?: number; page: "app" }[] = [];
function app(id: string, dev: Dev, main: ReactNode, opts: { vh?: number; path?: string } = {}) {
  (globalThis as any).__PATH = opts.path ?? "/friends";
  (globalThis as any).__AV = { initials: "H", art: null };
  const badges = { friends: 0, friendsWaiting: 1, friendsAt: NOW.toISOString() } as any;
  const door: any = { adminDoor: false, adminEnv: null, credits: null };
  writeFileSync(`dz/frames/${id}.html`, renderToString(
    <div className="flex min-h-dvh flex-1">
      <NavRail locked={false} openLock={null as any} theme="amonkhet" {...door} friendsMoment={false} badges={badges} />
      <div className="flex min-w-0 flex-1 flex-col pb-[var(--tabbar-h)] md:pb-0">
        <MobileHeader theme="amonkhet" {...door} />
        <main className="flex min-w-0 flex-1 flex-col">{main}</main>
      </div>
      <TabBar locked={false} openLock={null as any} friendsMoment={false} badges={badges} />
    </div>,
  ));
  frames.push({ id, dev, vh: opts.vh, page: "app" });
}
const friendsPage = (rows: any[]) => (
  <FriendsView profile={ME} friends={FRIENDS as any} links={[]} accepted={null} origin="https://the-99.dev" nowMs={NOW.getTime()} maxLinks={10}
    invites={null} decksSeen={{ seeDecks: true, seeUnfinished: false } as any} friendLinks={true}
    waiting={<YourRequests rows={rows} now={NOW} history />} />
);
for (const dev of ["phone", "desk"] as Dev[]) {
  app(`E1-${dev}`, dev, friendsPage(LIVE), { vh: dev === "phone" ? 1180 : 960 });
  app(`E2-${dev}`, dev, friendsPage([]), { vh: dev === "phone" ? 1140 : 860 });
  app(`H1-${dev}`, dev, <RequestHistory asked={ASKED} ofYou={OFYOU} tab="asked" more />, { path: "/friends", vh: dev === "phone" ? 1390 : 1300 });
  app(`H2-${dev}`, dev, <RequestHistory asked={ASKED} ofYou={OFYOU} tab="ofYou" exFriends />, { path: "/friends", vh: dev === "phone" ? 1040 : 900 });
}
app("H3-phone", "phone", <RequestHistory asked={ASKED} ofYou={[]} tab="ofYou" />);
writeFileSync("dz/frames.json", JSON.stringify(frames));
