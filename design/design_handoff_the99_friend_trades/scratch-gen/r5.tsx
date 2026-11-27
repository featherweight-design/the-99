// Friend trades R2 (2026-11-27): every frame is the shipped shell and the shipped page, rendered with the shipped CSS,
// with R1's proposal plus this round's changes applied (proposal.diff). Full pages around every addition (item 7).
import { app, done } from "./shell";
import { FriendHead } from "../src/components/social/friend-head";
import { FriendStrip } from "../src/components/social/friend-strip";
import { FriendSparesTab, type SparesTabTrade } from "../src/components/social/friend-spares-tab";
import { FriendsView } from "../src/components/social/friends-view";
import { RequestsBox } from "../src/components/social/requests-box";
import { WaitingOnYou } from "../src/components/social/waiting-on-you";
import { YourRequests } from "../src/components/social/your-requests";
import { RequestHistory } from "../src/components/social/request-history";
import { TradeTab, type TradeTabProps } from "../src/components/social/trade-tab";
import { TradeRows, TRADES_SHOWN, type TradeRowView } from "../src/components/social/trade-rows";
import { TradeSheet } from "../src/components/social/trade-sheet";
import { SheetTradeContext } from "../src/components/social/friend-spares";
import { TradesHead } from "../src/components/social/trades-head";
import { CartView } from "../src/components/decks/cart/cart-view";
import { StoreProvider } from "../src/components/stores/store-provider";
import { Dashboard } from "../src/components/home/dashboard";
import { SettingsView } from "../src/components/settings/settings-view";
import { NewsSection } from "../src/components/settings/news-section";
import { SparesSection } from "../src/components/settings/spares-section";
import { FriendDecksSection } from "../src/components/settings/friend-decks-section";
import { StoreSection } from "../src/components/settings/store-section";
import { tradeCopy as t, cardList } from "../src/lib/copy/trades";
import { named } from "../src/lib/person-name/mint";
import { K, FR, NOW, line } from "./fx";

const G = globalThis as any;
const only = process.env.ONLY;
const want = (id: string) => !only || only.split(",").some((o) => id.startsWith(o));
const both = (id: string, main: () => any, path: string, vh?: { desk?: number; phone?: number }) => {
  if (!want(id)) return;
  app(`${id}-desk`, "desk", main(), { path, vh: vh?.desk }); app(`${id}-phone`, "phone", main(), { path, vh: vh?.phone });
};
const ago = (h: number) => new Date(NOW.getTime() - h * 3600_000);
const short = (c: any) => c.name.split(",")[0];
const ids = (...cs: any[]) => new Set<string>(cs.map((c) => c.oracleId));
const SP = (cs: any[], extra: (c: any) => any = () => ({})) => cs.map((c) => line(c, extra(c)));

// Spares: Colin's has two cards on your wishlist and one a deck needs, as the shipped tab orders them.
const wish = (c: any) => ({ onWishlist: [K.ghalta.oracleId, K.miku.oracleId].includes(c.oracleId), deckNeed: [K.sai.oracleId, K.ash.oracleId].includes(c.oracleId) ? 1 : 0 });
const COLIN = SP([K.ghalta, K.miku, K.sai, K.jace, K.zada, K.quin, K.kil, K.rootha, K.tch, K.ool, K.gisa, K.ash], wish);
const PETER = SP([K.miku, K.jace, K.quin, K.rootha, K.ash, K.tch, K.kil, K.zada], wish);
const MAX = SP([K.rootha, K.quin, K.kil]);
const MINE = SP([K.lath, K.dina, K.zim, K.giada, K.doom, K.zada]);
const pods = [named("Thursday pod")];
const sf = (fr: any) => ({ publicId: fr.publicId, displayName: fr.displayName, commander: fr.commander, pods });

const sparesPage = (fr: any, lines: any[], tab: (Partial<TradeTabProps> & Pick<TradeTabProps, "state">) | null, trade: SparesTabTrade | null,
  o: { waits?: boolean; counts?: any; back?: { href: string; label: string } } = {}) => (
  <div className="w-full px-[14px] pt-[18px] pb-[30px] md:px-[34px] md:pt-[28px] md:pb-[34px]">
    <FriendHead friend={fr} nowMs={NOW.getTime()} back={o.back ?? null} />
    <FriendStrip publicId={fr.publicId} counts={o.counts ?? { decks: 6, wishlist: 18, spares: lines.length || undefined }} tradeWaits={o.waits} />
    {tab ? <TradeTab friend={fr.displayName} fromThem={[]} fromYou={[]} daysLeft={14} {...tab} /> : null}
    <FriendSparesTab name={fr.displayName} spares={{ pods, friend: sf(fr), lines: o.filter === "want" ? lines.filter((l: any) => l.onWishlist || l.deckNeed > 0) : lines, wishlist: true } as any} deckNeed={{ [K.sai.oracleId]: 1, [K.ash.oracleId]: 1 }} trade={trade}
      asks={{ friend: { publicId: fr.publicId, displayName: fr.displayName, commander: fr.commander }, spare: null, goneName: null, prices: {}, newestAsOf: null }} />
  </div>
);
const compose = (side: "them" | "you", picked: Set<string>, yours = MINE): SparesTabTrade => ({ side, yours, picked, composing: true, started: picked.size > 0 || side === "you" });
const live: SparesTabTrade = { side: "them", yours: MINE, picked: new Set(), composing: false, started: true };
const sp = (fr: string) => `/friends/${fr}/spares`;


// ── One Spares tab (item b): the trade heads the friend's Spares tab; no fourth tab ─────────────────────────────────

// ── Make it a trade (items 2 and 3): Peter asked for Lathliss; the Yes; the receipt; the trade ──────────────────────

const tr = (key: string, fr: any, theirs: any, yours: any, kind: any, ink: TradeRowView["ink"], h: number, title: any, ln: any, action: any = null, extra: any = {}): TradeRowView => ({
  key, friend: { displayName: fr.displayName, commander: fr.commander }, theirCard: theirs?.imageUri ?? null, yourCard: yours?.imageUri ?? null,
  kind, ink, age: h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`, title, line: ln, action, ...extra,
});
const r = t.row;
const WAITING: TradeRowView[] = [
  tr("o", FR.colin, K.ghalta, K.lath, r.kind.offer, "accent", 2, r.offer(FR.colin.displayName, cardList([short(K.ghalta), short(K.sai)]), short(K.lath)), t.daysLeft(13), { label: r.answer }, { unseen: true }),
  tr("c", FR.peter, K.miku, K.dina, r.kind.countered, "accent", 5, r.countered(FR.peter.displayName), r.counteredLine(short(K.miku), cardList([short(K.dina), short(K.zada)]), 9), { label: r.seeCounter }, { unseen: true }),
  tr("l", FR.max, K.rootha, K.giada, r.kind.look, "warning", 20, r.look(short(K.giada)), r.lookLine(FR.max.displayName, 6), { label: r.look2 }),
  tr("a", FR.chris, K.ghalta, K.doom, r.kind.accepted, "success", 26, r.accepted(FR.chris.displayName), r.acceptedLine, { label: t.markTraded, filled: true }),
  tr("m", FR.colin, K.jace, K.zim, r.kind.themMarked(FR.colin.displayName), "success", 30, r.themMarked(FR.colin.displayName), r.themMarkedLine, { label: t.markTraded, filled: true }),
  tr("o2", FR.chris, K.ash, K.giada, r.kind.offer, "accent", 33, r.offer(FR.chris.displayName, short(K.ash), short(K.giada)), t.daysLeft(12), { label: r.answer }),
  tr("c2", FR.max, K.kil, K.zim, r.kind.countered, "accent", 36, r.countered(FR.max.displayName), r.counteredLine(short(K.kil), short(K.zim), 11), { label: r.seeCounter }),
];
const REST: TradeRowView[] = [
  tr("y", FR.peter, K.quin, K.doom, r.kind.youMarked, "success", 40, r.youMarked(FR.peter.displayName), r.youMarkedLine(FR.peter.displayName), { label: r.open }),
  tr("s", FR.max, K.rootha, K.zim, r.kind.offered, "accent", 50, r.offered(FR.max.displayName, cardList([short(K.rootha), short(K.quin)]), short(K.zim)), r.waitingLine(FR.max.displayName, 12), { label: r.open }),
  tr("t", FR.peter, K.miku, K.dina, r.kind.traded, "success", 70, r.traded(FR.peter.displayName), r.tradedLine(short(K.miku), cardList([short(K.dina), short(K.zada)]), "Nov 24"), null, { clear: true }),
  tr("d", FR.max, K.kil, K.giada, r.kind.declined, "faint", 96, r.declined(FR.max.displayName), r.nothingElse, null, { clear: true }),
  tr("w", FR.chris, K.ash, K.lath, r.kind.withdrawn, "faint", 120, r.withdrawn(FR.chris.displayName), r.nothingElse, null, { clear: true }),
  tr("x", FR.colin, K.tch, K.giada, r.kind.expired, "faint", 340, r.expired(FR.colin.displayName), r.expiredLine(14), null, { clear: true }),
];
const ALL = [...WAITING, ...REST];
const ME: any = { publicId: "me", displayName: "Hugh", commander: { oracleId: "w", name: "Lathliss", artCropUri: "art/face-giada.jpg" } };
const FRIENDS = [FR.colin, FR.peter, FR.max, FR.chris];
const side = (fr: any) => ({ publicId: fr.publicId, displayName: fr.displayName, commander: fr.commander });
const ASK = (id: string, fr: any, c: any, h: number) => ({ key: id, kind: "spare-request", createdAt: ago(h), unseen: true,
  ask: { id, oracleId: c.oracleId, card: { name: c.name, imageUri: c.imageUri, oracleId: c.oracleId }, copies: 1, deckName: named("Thopter Works"), spare: 2, asker: side(fr), createdAt: ago(h), daysLeft: 13 } });
const WAIT: any[] = [ASK("s1", FR.peter, K.lath, 1), ASK("s2", FR.chris, K.giada, 3)];
const MINEQ: any[] = [{
  id: "l1", oracleId: K.jace.oracleId, card: { name: K.jace.name, imageUri: K.jace.imageUri }, copies: 1, deckName: "Thopter Works", deckId: "d1", standalone: false,
  holder: side(FR.colin), state: "open", daysLeft: 12, createdAt: ago(48), answeredAt: null, seenAt: null, cleared: false, unseen: false, othersWithSpare: [], canAskAgain: false,
}];
const friendsPage = (box: any) => (
  <FriendsView profile={ME} friends={FRIENDS} links={[]} accepted={null} origin="https://the-99.app" nowMs={NOW.getTime()} maxLinks={10}
    invites={null} decksSeen={{ seeDecks: true, seeUnfinished: false } as any} friendLinks waiting={box}
    wanted={{ [FR.colin.publicId]: 4, [FR.peter.publicId]: 2, [FR.chris.publicId]: 1 }} sparable={{ [FR.colin.publicId]: 2, [FR.max.publicId]: 1 }} />
);
const box = (rows: TradeRowView[], waitingCount = WAIT.length) => {
  const shown = rows.slice(0, TRADES_SHOWN), rest = rows.slice(TRADES_SHOWN);
  const waits = (x: TradeRowView) => WAITING.includes(x);
  return (
    <RequestsBox history waitingCount={waitingCount} mineCount={MINEQ.length} unseenAnswer={false}
      waiting={<WaitingOnYou rows={WAIT} now={NOW} bare />} mine={<YourRequests rows={MINEQ} now={NOW} bare />}
      trades={<TradeRows rows={shown} />} tradesCount={rows.length} tradeWaits={rows.some(waits)}
      tradesMore={rest.length ? { rest: rest.length, waiting: rest.filter(waits).length } : null} />
  );
};

// A0 the ask, before the Yes; A1 the Yes receipt with Make it a trade (Friends, Waiting on you).
G.__TAB = "waiting";
both("A0", () => friendsPage(box(ALL)), "/friends");
G.__RECEIPTS = new Map([["s1", { row: WAIT[0], answer: "yes", index: 0 }]]);
both("A1", () => friendsPage(box(ALL)), "/friends");
G.__RECEIPTS = undefined;
// L1 the Trades tab capped at five, the foot naming the rest; L2 fewer waiting past five; E3 none yet.
G.__TAB = "trades";
both("L1", () => friendsPage(box(ALL)), "/friends");
both("L2", () => friendsPage(box([...WAITING.slice(0, 3), ...REST])), "/friends");
both("E3", () => friendsPage(box([])), "/friends");
G.__TAB = undefined;
// RH Request history's Trades tab (G5): every trade, live and ended.
G.__RHTAB = "trades";
both("RH", () => <RequestHistory asked={{ entries: [], next: null } as any} ofYou={{ entries: [], next: null } as any} hiddenCount={0} nowMs={NOW.getTime()} trades={<TradeRows rows={ALL} />} />, "/friends/requests");
G.__RHTAB = undefined;

// ── Home (item 7): the Yes receipt leading, with Make it a trade; What's new with the trade rows in flow ─────────────
const fc = (c: any) => ({ oracleId: c.oracleId, name: c.name, image: c.imageUri, art: c.imageUri, colorIdentity: null });
const fr = (x: any) => ({ publicId: x.publicId, displayName: x.displayName });
const item = (key: string, kind: string, x: any, c: any, h: number, extra: any = {}) => ({
  key, kind, at: ago(h).toISOString(), unseen: true, card: fc(c), friend: fr(x), href: `/friends/${x.publicId}/spares`, opens: null, outbound: null,
  name: null, setSize: null, owned: null, drop: null, combo: null, answer: null, askable: false, ...extra,
});
const TR = (push: string, theirs: any[], yours: any[]) => ({ push, theirs: theirs.map(short), yours: yours.map(short), yourImage: yours[0]?.imageUri ?? null });
const leadAsk = item("ask", "spare-request", FR.peter, K.lath, 1, { href: null, ask: { id: "s1", spare: 2, copies: 1, deckName: named("Thopter Works"), daysLeft: 13 } });
const FEED = [
  item("t-o", "trade", FR.colin, K.ghalta, 1, { trade: TR("offer", [K.ghalta, K.sai], [K.lath]) }),
  item("t-c", "trade", FR.peter, K.miku, 3, { trade: TR("counter", [K.miku], [K.dina, K.zada]) }),
  item("t-a", "trade", FR.chris, K.ghalta, 5, { trade: TR("accept", [K.ghalta], [K.doom]) }),
  item("t-d", "trade", FR.max, K.kil, 7, { trade: TR("decline", [K.kil], [K.giada]) }),
];
const deck = (id: string, name: string, cmd: string, art: string): any => ({ id, name, createdAt: NOW, commanderName: cmd, commanderColorIdentity: ["U"], commanderImageUri: `art/${art}.jpg`, commanderArtCropUri: `art/${art}.jpg`, partnerName: null, partnerColorIdentity: null, folderId: null, folderName: null, built: 99, ownedCount: 93, toBuyCount: 6, unresolvedCount: 0, pendingChanges: 0, versionNumber: 3, lastPlayedAt: null, lastEditedAt: NOW, lastCommittedAt: NOW, inUseElsewhere: 0, proxiedCount: 0, statusPill: "built", bracket: null });
const home = (lead: any, items: any[]) => {
  G.__VW = 0;
  return (
    <Dashboard stats={{ totalCards: 4492, uniqueCards: 2926 }} lastUpdated={new Date("2026-11-25T12:00:00Z")} timeZone="UTC" ready={null}
      inUse={new Map()} decks={[deck("d1", "Thopter Works", "Sai, Master Thopterist", "sai"), deck("d2", "Dino Stampede", "Ghalta, Primal Hunger", "ghalta")]} commitments={null}
      shopping={{ byDeck: new Map(), total: { cards: 0, cents: 0 } } as any} now={NOW.toISOString()}
      feed={{ chosen: true, on: ["trade", "spare-request"], items, unseen: items.length, lead } as any} />
  );
};
G.__ANSWERED = "yes";
both("A2", () => home(leadAsk, FEED), "/");
G.__ANSWERED = undefined;
both("N2", () => home(FEED[0], FEED), "/");

// ── From a deck or All shopping (item a): Trade beside Ask in the sheet; the trade made in the sheet ─────────────────
const DK = [{ id: "thop", name: "Thopter Works", brew: false, copies: 3, cents: 0, pricedCopies: 3 }, { id: "dino", name: "Dino Stampede", brew: false, copies: 3, cents: 0, pricedCopies: 3 }];
const cl = (c: any, deckId: string) => ({ oracleId: c.oracleId, name: c.name, imageUri: c.imageUri, commander: false, owned: 0, heldElsewhere: 0, heldBy: [],
  rows: [{ deckId, quantity: 1, cents: c.cents, state: c.cents == null ? null : "priced", commander: false, held: 0, finish: null }] });
const CART: any = { totalDecks: 6, priced: true, newestAsOf: "2026-11-23T00:00:00Z", holders: [], decks: DK,
  lines: [cl(K.ghalta, "dino"), cl(K.miku, "thop"), cl(K.jace, "thop"), cl(K.gisa, "dino"), cl(K.ash, "dino"), cl(K.quin, "thop")] };
const spr = (c: any, x: any, n = 1) => ({ oracleId: c.oracleId, friend: sf(x), spare: n });
const SPARES = [spr(K.ghalta, FR.colin), spr(K.ghalta, FR.chris, 2), spr(K.miku, FR.peter), spr(K.miku, FR.colin), spr(K.jace, FR.peter), spr(K.ash, FR.chris)];
const sheetCard = { oracleId: K.ghalta.oracleId, name: K.ghalta.name, printedName: null, layout: null, imageUri: K.ghalta.imageUri, price: { cents: 1450, foilCents: null, etchedCents: null, asOf: new Date("2026-11-23T00:00:00Z"), soldOut: false } as any, quantity: 1 };
const STC = { waiting: new Set(["chris"]), open: new Map([["chris", 1]]), wants: new Map([["colin", [short(K.lath), short(K.dina)]]]), onTrade: () => {} };
const WANTED = ids(K.lath, K.dina);
const cart = (over: any = null, opened = false) => {
  G.__SP = SPARES; G.__SP_OPENED = opened ? sheetCard : null;
  return (
    <SheetTradeContext.Provider value={STC}>
      <StoreProvider store={"manapool" as any}><CartView cart={CART} provenance={{ behind: false, when: "Monday" } as any} /></StoreProvider>
      {over}
    </SheetTradeContext.Provider>
  );
};
const gh = { ...K.ghalta };
both("D1", () => cart(null, true), "/decks/shopping");
const CS = (x: any) => cart(<TradeSheet friend={FR.colin.displayName} theirs={COLIN} yours={MINE} wanted={WANTED} fromSpares {...x} />);
both("D2", () => CS({ fromThem: [gh], fromYou: [], side: "you", picked: ids(K.ghalta) }), "/decks/shopping");
both("D3", () => CS({ fromThem: [gh], fromYou: [K.lath], side: "you", picked: ids(K.ghalta, K.lath) }), "/decks/shopping");
both("D4", () => CS({ fromThem: [gh], fromYou: [K.lath], side: "you", picked: ids(K.ghalta, K.lath), sent: true }), "/decks/shopping");
G.__SP = undefined; G.__SP_OPENED = undefined;
G.__SP = undefined; G.__SP_OPENED = undefined;


// ── R3 ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const WANTS = [short(K.lath), short(K.dina)];
const fpage = (fr: any, lines: any[], liveRows: TradeRowView[], wants: string[], o: { over?: any; back?: any; counts?: any; waits?: boolean; capped?: boolean; filter?: "all" | "want" } = {}) => (
  <SheetTradeContext.Provider value={STC}>
    <div className="w-full px-[14px] pt-[18px] pb-[30px] md:px-[34px] md:pt-[28px] md:pb-[34px]">
      <FriendHead friend={fr} nowMs={NOW.getTime()} back={o.back ?? null} />
      <FriendStrip publicId={fr.publicId} counts={o.counts ?? { decks: 6, wishlist: 18, spares: lines.length }} tradeWaits={o.waits} />
      <TradesHead friend={fr.displayName} live={liveRows} wants={wants} youWant={fr === FR.colin ? [short(K.ghalta), short(K.miku), short(K.sai), short(K.ash)] : []} capped={o.capped} total={lines.length} filter={o.filter} />
      <FriendSparesTab name={fr.displayName} spares={{ pods, friend: sf(fr), lines: o.filter === "want" ? lines.filter((l: any) => l.onWishlist || [K.sai.oracleId, K.ash.oracleId].includes(l.oracleId)) : lines, wishlist: true } as any} deckNeed={{ [K.sai.oracleId]: 1, [K.ash.oracleId]: 1, [K.ghalta.oracleId]: 1 }}
        asks={{ friend: { publicId: fr.publicId, displayName: fr.displayName, commander: fr.commander }, spare: null, goneName: null, prices: {}, newestAsOf: null }} />
    </div>
    {o.over ?? null}
  </SheetTradeContext.Provider>
);
const LIVE_COLIN: TradeRowView[] = [
  tr("lo", FR.colin, K.sai, K.lath, r.kind.offer, "accent", 2, r.offer(FR.colin.displayName, short(K.sai), short(K.lath)), t.daysLeft(13), { label: r.answer }, { unseen: true }),
  tr("la", FR.colin, K.ghalta, K.doom, r.kind.accepted, "success", 50, r.acceptedYou(FR.colin.displayName), r.acceptedLine, { label: t.markTraded, filled: true }),
];
const sheet = (x: any) => <TradeSheet friend={FR.colin.displayName} theirs={COLIN} yours={MINE} wanted={WANTED} {...x} />;
G.__SP = undefined; G.__SP_OPENED = undefined;
both("S0", () => fpage(FR.colin, COLIN, [], WANTS), sp("colin"));
// R10: an open ask (Miku) and a yes (Sai), so the gray count chip shows its ask word.
const ASKL = (c: any, state: string, id: string) => ({ id, oracleId: c.oracleId, holder: { publicId: FR.colin.publicId, displayName: FR.colin.displayName }, state, daysLeft: state === "open" ? 9 : null, createdAt: ago(30).toISOString(), answeredAt: null });
G.__SP_ASKS = [ASKL(K.miku, "open", "q1"), ASKL(K.sai, "yes", "q2")];
both("S0w", () => fpage(FR.colin, COLIN, [], WANTS, { filter: "want" }), sp("colin"));
G.__SP_ASKS = undefined;
G.__SP = SPARES; G.__SP_OPENED = sheetCard;
both("S1", () => fpage(FR.colin, COLIN, [], WANTS), sp("colin"));
G.__SP = undefined; G.__SP_OPENED = undefined;
both("S2", () => fpage(FR.colin, COLIN, [], WANTS, { over: sheet({ state: "draft", fromThem: [], fromYou: [], side: "them", picked: new Set() }) }), sp("colin"));
both("S3", () => fpage(FR.colin, COLIN, [], WANTS, { over: sheet({ state: "draft", fromThem: [K.ghalta], fromYou: [K.lath], side: "you", picked: ids(K.ghalta, K.lath), alsoIn: new Map([[K.dina.oracleId, [{ name: FR.peter.displayName, daysLeft: 12 }, { name: FR.chris.displayName, daysLeft: 9 }]], [K.zim.oracleId, [{ name: FR.max.displayName, daysLeft: 5 }]]]) }) }), sp("colin"));
both("S3t", () => fpage(FR.colin, COLIN, [], WANTS, { over: sheet({ state: "draft", fromThem: [K.ghalta], fromYou: [K.lath], side: "you", picked: ids(K.ghalta, K.lath), alsoIn: new Map([[K.dina.oracleId, [{ name: FR.peter.displayName, daysLeft: 12 }, { name: FR.chris.displayName, daysLeft: 9 }]], [K.zim.oracleId, [{ name: FR.max.displayName, daysLeft: 5 }]]]) }) }), sp("colin"), { desk: 1560, phone: 1700 });
both("S3p", () => fpage(FR.colin, COLIN, [], WANTS, { over: sheet({ state: "draft", fromThem: [K.ghalta], fromYou: [K.lath], side: "you", picked: ids(K.ghalta, K.lath), openOffered: K.dina.oracleId, alsoIn: new Map([[K.dina.oracleId, [{ name: FR.peter.displayName, daysLeft: 12 }, { name: FR.chris.displayName, daysLeft: 9 }]], [K.zim.oracleId, [{ name: FR.max.displayName, daysLeft: 5 }]]]) }) }), sp("colin"), { desk: 1560, phone: 1700 });
both("S4", () => fpage(FR.colin, COLIN, LIVE_COLIN, WANTS.slice(1), { waits: true }), sp("colin"));
both("S5", () => fpage(FR.colin, COLIN, LIVE_COLIN, WANTS.slice(1), { waits: true, over: sheet({ state: "theirs", fromThem: [K.sai], fromYou: [K.lath], daysLeft: 13 }) }), sp("colin"));
both("S6", () => fpage(FR.colin, COLIN, LIVE_COLIN, WANTS.slice(1), { waits: true, over: sheet({ state: "accepted", fromThem: [K.ghalta], fromYou: [K.doom], daysLeft: 10 }) }), sp("colin"));
both("S7", () => fpage(FR.colin, COLIN, LIVE_COLIN, WANTS.slice(1), { waits: true, over: sheet({ state: "look", fromThem: [K.ghalta, { ...K.sai, gone: true }], fromYou: [K.lath], daysLeft: 11 }) }), sp("colin"));
both("S8", () => fpage(FR.colin, COLIN, LIVE_COLIN, WANTS.slice(1), { waits: true, over: sheet({ state: "counterDraft", fromThem: [{ ...K.miku, change: "added" }, { ...K.sai, change: "removed" }], fromYou: [K.lath, { ...K.dina, change: "added" }], daysLeft: 13, was: { them: 249, you: 1299, day: "Nov 26" }, side: "you", picked: ids(K.lath, K.dina) }) }), sp("colin"));
const LIVE_COLIN2: TradeRowView[] = [
  tr("ls", FR.colin, K.ghalta, K.zim, r.kind.offered, "accent", 1, r.offered(FR.colin.displayName, short(K.ghalta), short(K.zim)), r.waitingLine(FR.colin.displayName, 14), { label: r.open }),
  LIVE_COLIN[1],
];
both("S9", () => fpage(FR.colin, COLIN, LIVE_COLIN2, WANTS.slice(1), { capped: true }), sp("colin"));
// Handoff (2026-11-27): the sheet's remaining states, on the final code.
const st = (x: any) => fpage(FR.colin, COLIN, LIVE_COLIN, WANTS.slice(1), { waits: true, over: sheet(x) });
both("T5", () => st({ state: "theirCounter", fromThem: [{ ...K.miku, change: "added" }, { ...K.sai, change: "removed" }], fromYou: [K.lath, { ...K.dina, change: "added" }], daysLeft: 9, was: { them: 1699, you: 1299, day: "Nov 24" } }), sp("colin"));
both("T6", () => st({ state: "yours", fromThem: [K.ghalta], fromYou: [K.zim], daysLeft: 12 }), sp("colin"));
both("T8", () => st({ state: "themMarked", fromThem: [K.ghalta], fromYou: [K.doom], daysLeft: 8 }), sp("colin"));
both("T8b", () => st({ state: "youMarked", fromThem: [K.ghalta], fromYou: [K.doom], daysLeft: 8 }), sp("colin"));
both("T9", () => st({ state: "traded", fromThem: [K.ghalta], fromYou: [K.doom], tradedDay: "Nov 27" }), sp("colin"));
// Make it a trade, from the receipt: the sheet over Friends.
G.__TAB = "waiting"; G.__RECEIPTS = new Map([["s1", { row: WAIT[0], answer: "yes", index: 0 }]]);
both("A3", () => <>{friendsPage(box(ALL))}<TradeSheet friend={FR.peter.displayName} theirs={PETER} yours={MINE} state="askBack" fromThem={[K.miku]} fromYou={[{ ...K.lath, agreed: true }]} side="them" picked={ids(K.miku)} /></>, "/friends");
G.__TAB = undefined; G.__RECEIPTS = undefined;
// The spare request on Home, unanswered: the days under Yes and No.
both("H1", () => home(FEED[0], [item("ask2", "spare-request", FR.chris, K.giada, 3, { href: null, ask: { id: "s2", spare: 2, copies: 1, deckName: named("Thopter Works"), daysLeft: 13 } }), ...FEED.slice(1)]), "/");

// ── Settings: the whole page, the Trades row in Notifications ───────────────────────────────────────────────────────
const news = ["new-set", "new-precon", "secret-lair", "commander-decklists", "wizards-news", "price-drop", "trade-match", "spare-request", "trade", "combo"]
  .map((kind) => ({ kind, on: ["secret-lair", "commander-decklists", "wizards-news", "spare-request", "trade"].includes(kind) })) as any;
const settings = () => (
  <SettingsView>
    <StoreSection store={"manapool" as any} />
    <NewsSection kinds={news} push={{ publicKey: "x", on: ["spare-request", "trade"] }} />
    <SparesSection spareMin={2} pods={[named("Thursday pod")]} kept={[]} />
    <FriendDecksSection prefs={{ seeDecks: true, seeUnfinished: false } as any} />
  </SettingsView>
);
if (want("ST")) {
  G.__DEVICE = { state: "on", word: "browser", installedIphone: false, oldIos: false };
  app("ST-desk", "desk", settings(), { path: "/settings" });
  G.__DEVICE = { state: "on", word: "phone", installedIphone: false, oldIos: false };
  app("ST-phone", "phone", settings(), { path: "/settings" });
}
done();
