// Deck details refresh R4 (sweep, account 2, 2026-11-26): shipped components SSR'd with shipped CSS; the proposal is applied in src.
import { renderToString } from "react-dom/server";
import { writeFileSync, mkdirSync } from "node:fs";
import type { ReactNode } from "react";
import { NavRail, TabBar, MobileHeader } from "../src/components/shell/nav";
import { CardDetailProvider } from "../src/components/cards/card-detail-provider";
import { PreconListView } from "../src/components/decks/precons/precon-list-view";
import { OpenPreconView } from "../src/components/decks/precons/open-precon-view";
import { CartView } from "../src/components/decks/cart/cart-view";
import { ExportDialog } from "../src/components/decks/export-dialog";
import { FriendsView } from "../src/components/social/friends-view";
import { PodsPane } from "../src/components/social/pods-pane";
import { named } from "../src/lib/person-name/mint";
import { HomeDecksZero } from "../src/components/home/home-decks-zero";
import { ReadyToBuild } from "../src/components/home/ready-to-build";
import { AnalysisEmpty } from "../src/components/decks/analysis-empty";
import { ChooseResults } from "../src/components/intake/choose-results";
import { ReadScope } from "../src/components/intake/read-panel";
import { emptyParams } from "../src/lib/intake/params";
import { SettingsView } from "../src/components/settings/settings-view";
import { NewsSection } from "../src/components/settings/news-section";
import { SparesSection } from "../src/components/settings/spares-section";
import { FriendDecksSection } from "../src/components/settings/friend-decks-section";
import { PreconPickView } from "../src/components/decks/precons/precon-pick-view";

mkdirSync("dz/frames", { recursive: true });
const G = globalThis as any; G.__EAGER = true;
const frames: any[] = [];
const ONLY = process.argv[2];
export function app(id: string, dev: "phone" | "desk", path: string, main: () => ReactNode, opts: { vh?: number } = {}) {
  if (ONLY && !id.includes(ONLY)) return;
  G.__PATH = path; G.__AV = { initials: "WC", art: null };
  const badges = { friends: 0, friendsWaiting: 0, friendsAt: new Date().toISOString() } as any;
  const door: any = { adminDoor: false, adminEnv: null, credits: null };
  writeFileSync(`dz/frames/${id}.html`, renderToString(
    <CardDetailProvider fetchCard={async () => null}>
      <div className="flex min-h-dvh flex-1">
        <NavRail locked={false} openLock={null as any} theme="amonkhet" {...door} friendsMoment={false} badges={badges} />
        <div className="flex min-w-0 flex-1 flex-col pb-[var(--tabbar-h)] md:pb-0">
          <MobileHeader theme="amonkhet" {...door} />
          <main className="relative flex min-w-0 flex-1 flex-col">{main()}</main>
        </div>
        <TabBar locked={false} openLock={null as any} friendsMoment={false} badges={badges} />
      </div>
    </CardDetailProvider>,
  ));
  frames.push({ id, dev, vh: opts.vh });
}
const ART = ["brudiclad", "cayth", "alibou", "avenger-of-zendikar", "bloodline-keeper", "beorn", "heartless-act", "fire-lord-zuko", "arlinn", "ajani-unrelenting", "atreus", "cemetery-prowler", "moonmist", "gleaming-splendor"];
const img = (i: number) => `art/c-${ART[i % ART.length]}.jpg`;

// ---------- Precons ----------
const prow = (i: number, name: string, setCode: string, releaseDate: string, cmd: string, ci: string[], owned: number, built: any[] = []): any => ({
  fileName: name.replace(/\W/g, ""), name, setCode, releaseDate, twinName: null,
  commanders: [{ oracleId: `o-p${i}`, name: cmd, imageUri: img(i), imageUriSmall: img(i), colorIdentity: ci }], identity: ci, owned, of: 100, unmapped: 0, built });
const PROWS = [
  prow(0, "Calling All Angels", "ECC", "2026-10-02", "Giada's Angels", ["W"], 41),
  prow(1, "Lorwyn Eclipsed Kithkin", "ECC", "2026-10-02", "Brigid, Kithkin Champion", ["G", "W"], 33),
  prow(2, "Avatar: Fire Nation", "TLC", "2026-08-14", "Fire Lord Zuko", ["B", "R"], 52, [{ deckId: "d1", deckName: "Ashen Banner Parade", shared: 61, sameCommanders: false, linked: false }]),
  prow(3, "Edge of Eternities: World Shaper", "EOC", "2026-05-01", "Hearthhull, the Worldseed", ["B", "R", "G"], 28),
  prow(4, "Tarkir Dragonstorm: Jeskai Striker", "TDC", "2025-04-11", "Shiko and Narset", ["U", "R", "W"], 37),
  prow(5, "Aetherdrift: Living Energy", "DRC", "2025-02-14", "Saheeli, Radiant Creator", ["U", "R", "G"], 44),
];
const set = (code: string, name: string, releasesOn: string) => ({ code, name, releasesOn, cardCount: 40, parentName: null, arrivedAt: null, seen: false });
const rc = (n: number, name: string, ci: string[]) => ({ oracleId: `o${n}`, name, colorIdentity: ci, imageUriSmall: img(n), imageUri: img(n), collectorNumber: String(n), backImageUri: null, scryfallId: `s${n}` });
const ANN: any = {
  sets: [set("trc", "Star Trek Commander", "2026-12-04"), set("mdc", "Darkhold Destiny Commander", "2027-04-09")],
  commanders: { trc: [rc(6, "Christine Chapel, Combat Medic", ["W"]), rc(7, "Jean-Luc Picard", ["U", "W"]), rc(8, "Kathryn Janeway", ["U", "R"]), rc(9, "Benjamin Sisko", ["W", "B"])], mdc: [rc(10, "Gargantos, the Endbringer", ["B", "G"])] },
  today: "2026-11-26", newCodes: ["trc"], opensByItself: true,
};
const precons = () => <PreconListView rows={PROWS} hasCollection fromNew={false} initial={{ q: "", colours: [], order: null, view: "rows" }} query="" announced={ANN} />;
app("P-desk", "desk", "/decks/precons", precons, { vh: 1500 });
app("P-phone", "phone", "/decks/precons", precons, { vh: 2150 });
const precons2 = () => <PreconListView rows={PROWS.slice(0, 2)} hasCollection fromNew={false} initial={{ q: "", colours: [], order: null, view: "rows" }} query="" announced={{ ...ANN, newCodes: [], opensByItself: false }} storedAnnounced="closed" />;
app("PC-phone", "phone", "/decks/precons", precons2, { vh: 900 });
app("PK-desk", "desk", "/decks/new/precon", () => <PreconPickView rows={PROWS} entry="home" initial={{ q: "", colours: [] }} hasCollection />, { vh: 1100 });
app("PK-phone", "phone", "/decks/new/precon", () => <PreconPickView rows={PROWS} entry="home" initial={{ q: "", colours: [] }} hasCollection />, { vh: 1300 });
const pcard = (i: number, name: string, typeLine: string, over: any = {}): any => ({ oracleId: "oc" + i, name, typeLine, manaCost: null, layout: "normal", imageUri: img(i), quantity: 1, foil: 0,
  isCommander: false, basic: false, owned: i % 3 !== 0, legal: true, printing: { scryfallId: `p${i}`, setCode: "tlc", collectorNumber: String(i), label: `TLC ${i}`, imageUri: img(i), backImageUri: null }, ...over });
const PCARDS = [pcard(7, "Fire Lord Zuko", "Legendary Creature — Human Noble", { isCommander: true }), pcard(6, "Heartless Act", "Instant"), pcard(1, "Firebending Lesson", "Instant"),
  pcard(0, "Brudiclad, Telchor Engineer", "Legendary Artifact Creature"), pcard(4, "Bloodline Keeper", "Creature — Vampire"), pcard(11, "Cemetery Prowler", "Creature — Wolf"),
  pcard(12, "Moonmist", "Instant"), pcard(13, "Gleaming Splendor", "Enchantment"), pcard(20, "Mountain", "Basic Land", { basic: true, quantity: 14 }), pcard(21, "Swamp", "Basic Land", { basic: true, quantity: 13 })];
const OPEN: any = { kind: "precon", setName: "Avatar: The Last Airbender Commander", hasCollection: true, cards: PCARDS, decks: [], addedOn: null, collector: null,
  row: { ...PROWS[2], built: [{ deckId: "d1", deckName: "Ashen Banner Parade", shared: 61, sameCommanders: false, linked: false }] } };
const OV: any = { content: { verdicts: (["overview", "primer", "keyCards", "weaknesses"] as const).map((section) => ({ section, status: "ok", failed: 0, total: 1 })),
  overview: "Fire Lord Zuko turns every spell you cast from exile into a body on the board. Lean on [[Firebending Lesson]] and [[Heartless Act]] to keep the table clear while the Nation grows.",
  primer: { strategy: ["Go wide."], mulligan: { keep: ["Two lands."], sendBack: ["No lands."] }, tips: [] }, keyCards: [], weaknesses: ["Soft to a board wipe."],
  cards: { "firebending lesson": { oracleId: "oc1", name: "Firebending Lesson" }, "heartless act": { oracleId: "oc6", name: "Heartless Act" } } }, art: {}, evidenceNames: {}, contractVersion: 9, listFingerprint: "list" };
app("PO-desk", "desk", "/decks/precons/x", () => <OpenPreconView precon={OPEN} fromNew={false} overview={OV} />, { vh: 1300 });
app("PO-phone", "phone", "/decks/precons/x", () => <OpenPreconView precon={OPEN} fromNew={false} overview={OV} />, { vh: 1500 });

// ---------- Shopping for all decks ----------
const NOWD = new Date("2026-11-26T08:00:00Z");
const line = (id: string, name: string, rows: [string, number][], owned = 0): any => ({ oracleId: id, name, commander: false, owned, heldElsewhere: 0, heldBy: [],
  rows: rows.map(([deckId, cents]) => ({ deckId, quantity: 1, cents, state: "priced", commander: false, held: 0, finish: null })) });
const CART: any = { totalDecks: 5, priced: true, newestAsOf: NOWD, holders: [],
  decks: [{ id: "salt", name: "Saltmarsh Reclamation", brew: false, copies: 15, cents: 23331, pricedCopies: 15 }, { id: "hollow", name: "Hollow Oak Hours", brew: false, copies: 14, cents: 24517, pricedCopies: 14 },
    { id: "lantern", name: "Lanternlight Tinkers", brew: true, copies: 14, cents: 24945, pricedCopies: 14 }, { id: "ashen", name: "Ashen Banner Parade", brew: false, copies: 2, cents: 3870, pricedCopies: 2 }],
  lines: [line("bc", "Basilisk Collar", [["salt", 824], ["hollow", 824]]), line("ec", "Everflowing Chalice", [["hollow", 30], ["lantern", 30]]), line("ha", "Hedron Archive", [["salt", 30]]),
    line("hh", "Helm of the Host", [["hollow", 1074]]), line("hhorn", "Herald's Horn", [["salt", 444]]), line("ms", "Mind Stone", [["salt", 40], ["lantern", 40]]), line("jw", "Jeska's Will", [["ashen", 3855]]),
    line("sf", "Soulbright Flamekin", [["ashen", 15]])] };
const cart = () => <CartView cart={CART} provenance={{ behind: true, when: "September 6" }} hasFriends={false} />;
app("C-desk", "desk", "/decks/shopping", cart, { vh: 900 });
app("C-phone", "phone", "/decks/shopping", cart, { vh: 1100 });

// ---------- Export ----------
const DL: any[] = [["Burnished Hart", "Creature"], ["Flamekin Harbinger", "Creature"], ["Foundry Inspector", "Creature"], ["Abrade", "Instant"], ["Big Score", "Instant"], ["Chaos Warp", "Instant"], ["Jeska's Will", "Sorcery"], ["Gamble", "Sorcery"], ["Sol Ring", "Artifact"], ["Command Tower", "Land"]]
  .map(([name, g], i) => ({ name, quantity: 1, setCode: "TLC", collectorNumber: String(10 + i), group: g }));
const SHOP = [{ name: "Soulbright Flamekin", role: "Ramp", quantity: 1, owned: false }, { name: "Jeska's Will", role: "Ramp", quantity: 1, owned: false }, { name: "Gamble", role: "Tutor", quantity: 1, owned: true }];
const exp = (tab: "decklist" | "shopping") => () => <ExportDialog deckName="Ashen Banner Parade" commanderName="Ashling, the Limitless" partnerName={null} decklistCards={DL} shoppingCards={SHOP} open inert onClose={() => {}} initialTab={tab} />;
app("E-desk-shop", "desk", "/decks/d1", exp("shopping"), { vh: 860 });
app("E-phone-shop", "phone", "/decks/d1", exp("shopping"), { vh: 844 });
app("E-desk-list", "desk", "/decks/d1", exp("decklist"), { vh: 860 });

// ---------- Friends (Colin, Peter, Max, Chris) ----------
const FNOW = new Date("2026-11-26T08:00:00Z");
const fc = (i: number, name: string) => ({ oracleId: "of" + i, name, artCropUri: img(i), colorIdentity: ["R"] });
const fr = (n: string, i: number, c: any = null): any => ({ publicId: "p-" + n, displayName: named(n), since: new Date(2026, 9, 2 + i), commander: c });
const FR = [fr("Colin", 0, fc(0, "Brudiclad")), fr("Peter", 1, fc(5, "Beorn")), fr("Max", 2), fr("Chris", 3, fc(7, "Fire Lord Zuko"))];
const mem = (n: string, o: any = {}): any => ({ publicId: "p-" + n, joinedAt: new Date("2026-10-01"), isOwner: false, isYou: false, isFriend: true, commander: null, displayName: named(n), ...o });
const PODS: any = [{ id: "pod1", name: named("Thursday night"), isOwner: true, members: [mem("Wren", { isYou: true, isOwner: true, isFriend: false, commander: fc(1, "Cayth") }), mem("Colin", { commander: fc(0, "Brudiclad") }), mem("Peter")], nextOwner: null }];
const friends = () => <FriendsView profile={{ publicId: "p-me", displayName: "Wren Calloway", commander: null } as any} friends={FR} links={[]} accepted={null} origin="https://the-99.dev" nowMs={FNOW.getTime()} maxLinks={10}
  pods={<PodsPane pods={PODS} sharedIds={[]} friends={FR} ruleZero={{ tables: [], now: FNOW } as any} />} />;
app("F-desk", "desk", "/friends", friends, { vh: 900 });
app("F-phone", "phone", "/friends", friends, { vh: 1400 });

// ---------- Home: zero decks, Ready to build ----------
const hero = (i: number, name: string, ci: string[], score: number, pool: number): any => ({ oracleId: "oh" + i, slug: name.toLowerCase().replace(/\W+/g, "-"), name, colorIdentity: ci, imageUri: img(i), artCropUri: img(i), score, measurableTotal: 100, colorPoolSize: pool, typeLine: "Legendary Creature" });
const READY: any = { shown: [hero(0, "Brudiclad, Telchor Engineer", ["U", "R"], 74, 92), hero(5, "Beorn, the Fierce", ["G"], 71, 88)], moreCount: 7, floor: 70 };
const home = () => <div className="flex flex-col" style={{ gap: 34, padding: "24px 16px 40px", maxWidth: 1000, width: "100%", margin: "0 auto", boxSizing: "border-box" }}><HomeDecksZero /><ReadyToBuild ready={READY} inUse={new Map()} /></div>;
app("H-desk", "desk", "/", home, { vh: 900 });
app("H-phone", "phone", "/", home, { vh: 1300 });

// ---- Analysis before a read
const wrap = (n: ReactNode) => <div style={{ padding: "24px 16px 40px", maxWidth: 1000, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>{n}</div>;
const ae = () => wrap(<AnalysisEmpty phase="idle" onRequest={() => {}} />);
app("AE-desk", "desk", "/decks/d1", ae, { vh: 700 });
app("AE-phone", "phone", "/decks/d1", ae, { vh: 844 });

// ---- Help me choose results
const NAMES: [string, string[]][] = [["Brudiclad, Telchor Engineer", ["U", "R"]], ["Cayth, Famed Mechanist", ["W", "U"]], ["Alibou, Ancient Witness", ["R", "W"]], ["Avenger of Zendikar", ["G"]], ["Bloodline Keeper", ["B"]], ["Beorn, the Fierce", ["G"]], ["Heartless Act", ["B"]], ["Fire Lord Zuko", ["R"]], ["Arlinn, the Pack's Hope", ["R", "G"]], ["Ajani, Unrelenting", ["W"]]];
const hrow = (i: number): any => ({ oracleId: `0000aaaa-0000-4000-8000-${String(i).padStart(12, "0")}`, name: NAMES[i % NAMES.length][0], colorIdentity: NAMES[i % NAMES.length][1],
  imageUri: img(i), artCropUri: img(i), mark: { kind: "free" }, themeFits: [{ slug: "artifacts", share: 0.5 - i * 0.03 }], cardFit: null, ownedSupport: 40 - i * 3, supportTotal: 60 });
const hpage = (rows: any[], order = "fit"): any => ({ order, tooNarrow: null, card: null, rows, hasMore: false, total: rows.length, gone: [], hiddenPicks: 0 });
const DECK = "0000bbbb-0000-4000-8000-000000000001";
const hm = (pg: any, read: any) => () => wrap(<ReadScope initial={read}><ChooseResults page={pg} params={{ ...emptyParams(), results: true, themes: ["artifacts"] } as any} themeLabels={{ artifacts: "Artifacts" }} cardName={null} queryString="t=artifacts&v=results" changeHref="/decks/new/choose?t=artifacts" deckNames={{ [DECK]: "Ashen Banner Parade" }} /></ReadScope>);
const FIT = hpage([0, 1, 2, 3, 4, 5].map(hrow));
const READ = hpage([0, 1, 2, 3, 4, 5].map((i) => (i < 2 ? { ...hrow(i), reason: i === 0 ? [{ text: "Unlike " }, { deck: DECK }, { text: ", it wins with artifacts you already own." }] : [{ text: "It builds what you wrote." }] } : hrow(i))), "owned");
app("HM-desk", "desk", "/decks/new/choose", hm(FIT, null), { vh: 1100 });
app("HM-phone", "phone", "/decks/new/choose", hm(FIT, null), { vh: 2000 });
app("HR-desk", "desk", "/decks/new/choose", hm(READ, "done"), { vh: 1100 });
app("HR-phone", "phone", "/decks/new/choose", hm(READ, "done"), { vh: 1700 });

// ---- Settings
const KINDS: any = [{ kind: "new-set", on: true }, { kind: "new-precon", on: true }, { kind: "price-drop", on: true }, { kind: "trade-match", on: false }, { kind: "combo", on: true }];
const settings = () => <SettingsView><NewsSection kinds={KINDS} push={null} /><SparesSection spareMin={2} pods={[named("Thursday night"), named("Cube night")]} kept={[]} /><FriendDecksSection prefs={{ seeDecks: true, seeUnfinished: false }} /></SettingsView>;
app("S-desk", "desk", "/settings", settings, { vh: 1500 });
app("S-phone", "phone", "/settings", settings, { vh: 2000 });

writeFileSync("dz/frames.json", JSON.stringify(frames));
