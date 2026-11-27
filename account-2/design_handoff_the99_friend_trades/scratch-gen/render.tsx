// Friend trades R1 (account 2, 2026-11-27): every frame is the shipped shell and the shipped page, rendered with the
// shipped CSS, with this round's proposal applied (trade-tab.tsx, trade-rows.tsx, copy/trades.ts, proposal.diff).
import { app, done } from "./shell";
import { FriendHead } from "../src/components/social/friend-head";
import { FriendStrip } from "../src/components/social/friend-strip";
import { FriendsView } from "../src/components/social/friends-view";
import { RequestsBox } from "../src/components/social/requests-box";
import { WaitingOnYou } from "../src/components/social/waiting-on-you";
import { YourRequests } from "../src/components/social/your-requests";
import { TradeTab, type TradeTabProps } from "../src/components/social/trade-tab";
import { TradeRows, type TradeRowView } from "../src/components/social/trade-rows";
import { WhatsNew } from "../src/components/home/whats-new";
import { LeadStory } from "../src/components/home/lead-story";
import { SettingsView } from "../src/components/settings/settings-view";
import { NewsSection } from "../src/components/settings/news-section";
import { SparesSection } from "../src/components/settings/spares-section";
import { tradeCopy as t, cardList } from "../src/lib/copy/trades";
import { named } from "../src/lib/person-name/mint";
import { K, FR, NOW, line } from "./fx";

const G = globalThis as any;
const only = process.env.ONLY;
const want = (id: string) => !only || only.split(",").some((o) => id.startsWith(o));
const both = (id: string, main: () => any, path = "/friends/colin/trade", vh?: { desk?: number; phone?: number }) => {
  if (!want(id)) return;
  app(`${id}-desk`, "desk", main(), { path, vh: vh?.desk }); app(`${id}-phone`, "phone", main(), { path, vh: vh?.phone });
};
const ago = (h: number) => new Date(NOW.getTime() - h * 3600_000);
const short = (c: any) => c.name.split(",")[0];

// ── The Trade tab, a friend page's fourth tab ──────────────────────────────────────────────────────────────────────
const friendPage = (fr: any, tab: Partial<TradeTabProps> & Pick<TradeTabProps, "state">, counts: any = { decks: 6, wishlist: 18, spares: 12 }) => (
  <div className="w-full px-[14px] pt-[18px] pb-[30px] md:px-[34px] md:pt-[28px] md:pb-[34px]">
    <FriendHead friend={fr} nowMs={NOW.getTime()} />
    <FriendStrip publicId={fr.publicId} counts={counts} />
    <TradeTab friend={fr.displayName} fromThem={[]} fromYou={[]} daysLeft={14} {...tab} />
  </div>
);
const SP = (cs: any[]) => cs.map((c) => line(c));
const COLIN = SP([K.ghalta, K.sai, K.miku, K.jace, K.zada, K.quin, K.kil, K.rootha, K.tch, K.ool, K.gisa, K.ash]);
const PETER = SP([K.miku, K.jace, K.quin, K.rootha, K.ash, K.tch, K.kil, K.zada]);
const MINE = SP([K.lath, K.dina, K.zim, K.giada, K.doom, K.zada]);
const ids = (...cs: any[]) => new Set(cs.map((c) => c.oracleId));
const p = (fr: string) => `/friends/${fr}/trade`;

// T1 Propose a trade: Colin's tab, two of his, one of yours, picker on his spares.
both("T1", () => friendPage(FR.colin, { state: "draft", fromThem: [K.ghalta, K.sai], fromYou: [K.lath], picker: { side: "them", theirs: COLIN, yours: MINE, picked: ids(K.ghalta, K.sai) } }), p("colin"), { phone: 1560, desk: 1380 });
// T1b The same, nothing picked on your side yet: Send waits, and the line says why. Picker on your spares.
both("T1b", () => friendPage(FR.colin, { state: "draft", fromThem: [K.ghalta], fromYou: [], picker: { side: "you", theirs: COLIN, yours: MINE, picked: ids(K.ghalta) } }), p("colin"), { phone: 1560, desk: 1380 });
// T2 Ask back: Peter asked for your Lathliss and you said yes; Lathliss sits on your side, already a yes.
both("T2", () => friendPage(FR.peter, { state: "askBack", fromThem: [K.miku], fromYou: [{ ...K.lath, agreed: true }], picker: { side: "them", theirs: PETER, yours: MINE, picked: ids(K.miku) } }, { decks: 4, wishlist: 9, spares: 8 }), p("peter"), { phone: 1560, desk: 1380 });
// T3 Colin's offer to you: Yes, No (the shipped presses, the days beside them), Counter.
both("T3", () => friendPage(FR.colin, { state: "theirs", fromThem: [K.ghalta, K.sai], fromYou: [K.lath], daysLeft: 13 }), p("colin"));
// T4 Your counter, being made: Sai out, Miku in on Colin's side; Dina in on yours. Against his offer of Nov 26.
both("T4", () => friendPage(FR.colin, { state: "counterDraft", fromThem: [K.ghalta, K.miku && { ...K.miku, change: "added" }, { ...K.sai, change: "removed" }], fromYou: [K.lath, { ...K.dina, change: "added" }], daysLeft: 13, was: { them: 1699, you: 1299, day: "Nov 26" }, picker: { side: "you", theirs: COLIN, yours: MINE, picked: ids(K.lath, K.dina) } }), p("colin"), { phone: 1560, desk: 1380 });
// T5 Peter's counter to your offer, as you read it.
both("T5", () => friendPage(FR.peter, { state: "theirCounter", fromThem: [{ ...K.miku, change: "added" }, { ...K.jace, change: "removed" }], fromYou: [K.dina, { ...K.zada, change: "added" }], daysLeft: 9, was: { them: 199, you: 59, day: "Nov 24" } }, { decks: 4, wishlist: 9, spares: 8 }), p("peter"));
// T6 Your offer to Max, waiting.
both("T6", () => friendPage(FR.max, { state: "yours", fromThem: [K.rootha, K.quin], fromYou: [K.zim], daysLeft: 12 }, { decks: 3, wishlist: 22, spares: 15 }), p("max"));
// T7 Chris accepted.
both("T7", () => friendPage(FR.chris, { state: "accepted", fromThem: [K.ghalta], fromYou: [K.doom], daysLeft: 10 }, { decks: 7, wishlist: 4, spares: 9 }), p("chris"));
// T8 Colin marked it traded; you have not. T8b you marked it; Colin has not.
both("T8", () => friendPage(FR.colin, { state: "themMarked", fromThem: [K.ghalta, K.sai], fromYou: [K.lath], daysLeft: 8 }), p("colin"));
both("T8b", () => friendPage(FR.colin, { state: "youMarked", fromThem: [K.ghalta, K.sai], fromYou: [K.lath], daysLeft: 8 }), p("colin"));
// T9 Traded by both.
both("T9", () => friendPage(FR.peter, { state: "traded", fromThem: [K.miku], fromYou: [K.dina, K.zada], tradedDay: "Nov 27" }, { decks: 4, wishlist: 9, spares: 7 }), p("peter"));
// T10 Needs a look: Sai stopped being spare for Colin.
both("T10", () => friendPage(FR.colin, { state: "look", fromThem: [K.ghalta, { ...K.sai, gone: true }], fromYou: [K.lath], daysLeft: 11 }), p("colin"));
// E1 No spares on your side (Max); E2 none on theirs (Chris).
both("E1", () => friendPage(FR.max, { state: "draft", fromThem: [K.rootha], fromYou: [], picker: { side: "you", theirs: SP([K.rootha, K.quin, K.kil]), yours: [], picked: ids(K.rootha) } }, { decks: 3, wishlist: 22, spares: 3 }), p("max"));
both("E2", () => friendPage(FR.chris, { state: "draft", fromThem: [], fromYou: [], picker: { side: "them", theirs: [], yours: MINE, picked: new Set() } }, { decks: 7, wishlist: 4 }), p("chris"));

// ── The Trades tab of the Requests box, every state ───────────────────────────────────────────────────────────────
const tr = (key: string, fr: any, theirs: any, yours: any, kind: any, ink: TradeRowView["ink"], h: number, title: any, line: any, action: any = null, extra: any = {}): TradeRowView => ({
  key, friend: { displayName: fr.displayName, commander: fr.commander }, theirCard: theirs?.imageUri ?? null, yourCard: yours?.imageUri ?? null,
  kind, ink, age: h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`, title, line, action, ...extra,
});
const r = t.row;
const ROWS: TradeRowView[] = [
  tr("o", FR.colin, K.ghalta, K.lath, r.kind.offer, "accent", 2, r.offer(FR.colin.displayName, cardList([short(K.ghalta), short(K.sai)]), short(K.lath)), t.daysLeft(13), { label: r.answer }, { unseen: true }),
  tr("c", FR.peter, K.miku, K.dina, r.kind.countered, "accent", 5, r.countered(FR.peter.displayName), r.counteredLine(short(K.miku), cardList([short(K.dina), short(K.zada)]), 9), { label: r.seeCounter }, { unseen: true }),
  tr("l", FR.max, K.rootha, K.giada, r.kind.look, "warning", 20, r.look(short(K.giada)), t.row.lookLine(FR.max.displayName, 6), { label: r.look2 }),
  tr("a", FR.chris, K.ghalta, K.doom, r.kind.accepted, "success", 26, r.accepted(FR.chris.displayName), r.acceptedLine, { label: t.markTraded, filled: true }),
  tr("m", FR.colin, K.jace, K.zim, r.kind.themMarked(FR.colin.displayName), "success", 30, r.themMarked(FR.colin.displayName), r.themMarkedLine, { label: t.markTraded, filled: true }),
  tr("y", FR.peter, K.quin, K.doom, r.kind.youMarked, "success", 40, r.youMarked(FR.peter.displayName), r.youMarkedLine(FR.peter.displayName), { label: r.open }),
  tr("s", FR.max, K.rootha, K.zim, r.kind.offered, "accent", 50, r.offered(FR.max.displayName, cardList([short(K.rootha), short(K.quin)]), short(K.zim)), r.waitingLine(FR.max.displayName, 12), { label: r.open }),
  tr("t", FR.peter, K.miku, K.dina, r.kind.traded, "success", 70, r.traded(FR.peter.displayName), r.tradedLine(short(K.miku), cardList([short(K.dina), short(K.zada)]), "Nov 24"), null, { clear: true }),
  tr("d", FR.max, K.kil, K.giada, r.kind.declined, "faint", 96, r.declined(FR.max.displayName), r.nothingElse, null, { clear: true }),
  tr("w", FR.chris, K.ash, K.lath, r.kind.withdrawn, "faint", 120, r.withdrawn(FR.chris.displayName), r.nothingElse, null, { clear: true }),
  tr("x", FR.colin, K.tch, K.giada, r.kind.expired, "faint", 340, r.expired(FR.colin.displayName), r.expiredLine(14), null, { clear: true }),
];
const ME: any = { publicId: "me", displayName: "Hugh", commander: { oracleId: "w", name: "Lathliss", artCropUri: "art/crop-lathliss.jpg" } };
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
    invites={null} decksSeen={{ seeDecks: true, seeUnfinished: false } as any} friendLinks waiting={box} />
);
const box = (rows: TradeRowView[], waitingCount = WAIT.length) => (
  <RequestsBox history waitingCount={waitingCount} mineCount={MINEQ.length} unseenAnswer={false}
    waiting={<WaitingOnYou rows={WAIT} now={NOW} bare />} mine={<YourRequests rows={MINEQ} now={NOW} bare />}
    trades={<TradeRows rows={rows} />} tradesCount={rows.length} tradeWaits={rows.some((x) => x.unseen)} />
);
G.__TAB = "trades";
both("L1", () => friendsPage(box(ROWS)), "/friends", { desk: 1500, phone: 2100 });
both("E3", () => friendsPage(box([])), "/friends", { desk: 900, phone: 1100 });
G.__TAB = undefined;

// ── Ask back, on the holder's Yes receipt ─────────────────────────────────────────────────────────────────────────
G.__RECEIPTS = new Map([["s1", { row: WAIT[0], answer: "yes", index: 0 }]]);
G.__TAB = "waiting";
both("A1", () => friendsPage(box(ROWS.slice(0, 3), 1)), "/friends", { desk: 900, phone: 1200 });
G.__RECEIPTS = undefined; G.__TAB = undefined;
const fc = (c: any) => ({ oracleId: c.oracleId, name: c.name, image: c.imageUri, art: c.imageUri.replace("art/", "art/crop-"), colorIdentity: null });
const fr = (x: any) => ({ publicId: x.publicId, displayName: x.displayName });
const item = (key: string, kind: string, x: any, c: any, h: number, extra: any = {}) => ({
  key, kind, at: ago(h).toISOString(), unseen: true, card: fc(c), friend: fr(x), href: `/friends/${x.publicId}/trade`, opens: null, outbound: null,
  name: null, setSize: null, owned: null, drop: null, combo: null, answer: null, askable: false, ...extra,
});
const faces = new Map<string, any>([["colin", FR.colin.commander], ["peter", FR.peter.commander], ["max", FR.max.commander], ["chris", FR.chris.commander]]);
const leadAsk = item("ask", "spare-request", FR.peter, K.lath, 1, { href: null, ask: { id: "s1", spare: 2, copies: 1, deckName: named("Thopter Works"), daysLeft: 13 } });
const homeWrap = (x: any) => <div className="w-full max-w-[860px] px-[14px] pt-[18px] pb-[30px] md:px-[34px] md:pt-[28px]">{x}</div>;
G.__ANSWERED = "yes";
both("A2", () => homeWrap(<LeadStory item={leadAsk as any} now={NOW.toISOString()} face={FR.peter.commander} />), "/", { desk: 330, phone: 420 });
G.__ANSWERED = undefined;

// ── What's new: one row per push kind, and an offer leading Home ──────────────────────────────────────────────────
const TR = (push: string, theirs: any[], yours: any[]) => ({ push, theirs: theirs.map(short), yours: yours.map(short), yourImage: yours[0]?.imageUri ?? null });
const FEED = [
  item("t-o", "trade", FR.colin, K.ghalta, 1, { trade: TR("offer", [K.ghalta, K.sai], [K.lath]) }),
  item("t-c", "trade", FR.peter, K.miku, 3, { trade: TR("counter", [K.miku], [K.dina, K.zada]) }),
  item("t-a", "trade", FR.chris, K.ghalta, 5, { trade: TR("accept", [K.ghalta], [K.doom]) }),
  item("t-d", "trade", FR.max, K.kil, 7, { trade: TR("decline", [K.kil], [K.giada]) }),
];
const feed = (items: any[]) => ({ chosen: true, on: ["trade", "spare-request"], items, unseen: items.length, lead: null });
both("N1", () => homeWrap(<WhatsNew feed={feed(FEED) as any} now={NOW.toISOString()} faces={faces} wide />), "/", { desk: 560, phone: 760 });
both("N2", () => homeWrap(<LeadStory item={FEED[0] as any} now={NOW.toISOString()} face={FR.colin.commander} />), "/", { desk: 330, phone: 420 });

// ── Settings › News: the Trades row ───────────────────────────────────────────────────────────────────────────────
const news = ["new-set", "new-precon", "secret-lair", "commander-decklists", "wizards-news", "price-drop", "trade-match", "spare-request", "trade", "combo"]
  .map((kind) => ({ kind, on: ["secret-lair", "commander-decklists", "wizards-news", "spare-request", "trade"].includes(kind) })) as any;
const settings = () => (
  <SettingsView>
    <NewsSection kinds={news} push={{ publicKey: "x", on: ["spare-request", "trade"] }} />
    <SparesSection spareMin={2} pods={[named("Thursday pod")]} kept={[]} />
  </SettingsView>
);
if (want("S1")) {
  G.__DEVICE = { state: "on", word: "browser", installedIphone: false, oldIos: false };
  app("S1-desk", "desk", settings(), { path: "/settings", vh: 1300 });
  G.__DEVICE = { state: "on", word: "phone", installedIphone: false, oldIos: false };
  app("S1-phone", "phone", settings(), { path: "/settings", vh: 1900 });
}
done();
