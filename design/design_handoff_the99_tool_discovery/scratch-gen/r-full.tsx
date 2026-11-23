// Finding the tools R6 (account 1, 2026-11-23): Home in full, a fuller account, with R5's search panel in place.
import { writeFileSync } from "node:fs";
import { shell } from "./shell";
import { Dashboard } from "../src/components/home/dashboard";
import { WelcomeStrip } from "../src/components/welcome/welcome-strip";
import { named } from "../src/lib/person-name/mint";
import { HomeSearchPanel, ToolAnswers, ANSWERS, HeadSearch, FirstRunSearchRow } from "./ask";
import { FirstRunChecklist } from "../src/components/home/first-run";
import { FeedSheet } from "./feed-sheet";
const G = globalThis as any;
const NOW = new Date("2026-11-23T15:00:00Z");
const facts: any = { lot: "held", units: 3, left: 3, expiresAtMs: Date.UTC(2026, 10, 30, 12), days: 7, teaser: true, free: 1 };
const ago = (h: number) => new Date(NOW.getTime() - h * 3_600_000);
const deck = (id: string, name: string, cmd: string, art: string, ci: string[], o: any = {}): any => ({ id, name, createdAt: ago(400), commanderName: cmd, commanderColorIdentity: ci, commanderImageUri: `art/c-${art}.jpg`, commanderArtCropUri: `art/a-${art}.jpg`, partnerName: null, partnerColorIdentity: null, folderId: null, folderName: null, built: 99, ownedCount: 93, toBuyCount: 6, unresolvedCount: 0, pendingChanges: 0, versionNumber: 3, lastPlayedAt: null, lastEditedAt: ago(5), inUseElsewhere: 0, proxiedCount: 0, statusPill: "To buy", bracket: { permits: [3], answered: null }, ...o, lastCommittedAt: o.lastEditedAt ?? ago(5) });
const DECKS = [
  deck("d1", "Ashen Banner Parade", "Ashling, the Limitless", "ashling", ["W", "U", "B", "R", "G"]),
  deck("d2", "Giada's Choir", "Giada, Font of Hope", "giada", ["W"], { lastEditedAt: ago(30), built: 96, ownedCount: 88, toBuyCount: 8, statusPill: "Draft", bracket: { permits: [2], answered: null } }),
  deck("d3", "Counting Lands", "Zimone, Mystery Unraveler", "zimone", ["U", "G"], { lastEditedAt: ago(70), ownedCount: 99, toBuyCount: 0, statusPill: "Complete", bracket: { permits: [4], answered: null } }),
  deck("d4", "Crystal Tower", "Y'shtola, Night's Blessed", "yshtola", ["W", "U", "B"], { lastEditedAt: ago(140), built: 84, ownedCount: 80, toBuyCount: 19, statusPill: "To buy" }),
  deck("d5", "Tam's Lost Things", "Tam, Mindful First-Year", "tam", ["G", "U"], { lastEditedAt: ago(300), ownedCount: 97, toBuyCount: 2, statusPill: "To buy" }),
];
const COLIN = { publicId: "p1", displayName: named("Colin") };
const view = (n: number, o: any = {}): any => ({ key: `k${n}`, kind: "new-set", at: ago(n * 6 + 2).toISOString(), unseen: false, card: null, friend: null, href: `/collection/sets/s${n}`, opens: null, outbound: null, name: `Set ${n}`, setSize: null, owned: null, drop: null, combo: null, answer: null, askable: false, ...o });
const card = (id: string, name: string, art: string, ci: string[]) => ({ oracleId: id, name, image: `art/c-${art}.jpg`, art: `art/c-${art}.jpg`, colorIdentity: ci });
const LEAD = view(0, { kind: "trade-match", unseen: true, key: "lead", name: null, href: "/friends/p1", card: card("g", "Ghalta, Primal Hunger", "ghalta", ["G"]), friend: COLIN });
const FEED: any = { chosen: true, on: ["new-set", "new-precon", "price-drop", "trade-match", "combo"], unseen: 2, lead: LEAD, items: [
  view(1, { kind: "price-drop", unseen: true, href: null, outbound: "https://example.com", name: null, card: card("l", "Lathliss, Dragon Queen", "lathliss", ["R"]), drop: { fromCents: 1240, toCents: 890, printing: null } }),
  view(2, { kind: "combo", href: null, opens: "gi", name: null, card: card("gi", "Gisa, the Hellraiser", "gisa", ["B"]), combo: { pieces: ["Gisa, the Hellraiser", "Bloodline Keeper"], added: "Gisa, the Hellraiser", variantId: "v1" } }),
  view(3, { kind: "price-drop", href: null, outbound: "https://example.com", name: null, card: card("sw", "Swords to Plowshares", "swords", ["W"]), drop: { fromCents: 310, toCents: 224, printing: null } }),
  view(4, { kind: "combo", href: null, opens: "ze", name: null, card: card("ze", "Zimone, Mystery Unraveler", "zimone", ["U", "G"]), combo: { pieces: ["Zimone, Mystery Unraveler", "Avenger of Zendikar"], added: "Avenger of Zendikar", variantId: "v2" } }),
  view(5, { kind: "new-set", name: "Avatar: The Last Airbender", setSize: 286 }),
  view(6, { kind: "combo", href: null, opens: "mo", name: null, card: card("mo", "The Mothman", "mothman", ["B", "G"]), combo: { pieces: ["The Mothman", "Cemetery Prowler"], added: "Cemetery Prowler", variantId: "v3" } }),
  view(7, { kind: "price-drop", href: null, outbound: "https://example.com", name: null, card: card("ms", "Mystical Tutor", "mystical-tutor", ["U"]), drop: { fromCents: 1890, toCents: 1525, printing: null } }),
] };
const FRIENDS: any = {
  you: { displayName: "You", commander: null },
  friends: [
    { ...COLIN, commander: { oracleId: "x", name: "Ghalta, Primal Hunger", artCropUri: "art/face-ghalta.jpg" } },
    { publicId: "p2", displayName: named("Maya"), commander: { oracleId: "y", name: "Jace", artCropUri: "art/face-jace.jpg" } },
    { publicId: "p3", displayName: named("Rui"), commander: { oracleId: "z", name: "Sai", artCropUri: "art/face-sai.jpg" } },
    { publicId: "p4", displayName: named("Priya"), commander: { oracleId: "w", name: "Zimone", artCropUri: "art/face-zimone.jpg" } },
    { publicId: "p5", displayName: named("Theo"), commander: null },
  ],
  links: [], invites: null,
};
const face = (n: string, you = false, art: string | null = null) => ({ displayName: you ? n : named(n), you, commander: art ? { oracleId: n, name: n, artCropUri: art } : null });
const TABLE: any = { tableId: "t1", podId: "p1", podName: named("Thursday night"), closesAt: new Date("2026-11-24T02:00:00Z"), setByYou: false, setterName: COLIN.displayName, yourDeck: "Ashen Banner Parade", seats: [face("You", true, "art/a-ashling.jpg"), face("Colin", false, "art/face-ghalta.jpg"), face("Maya", false, "art/face-jace.jpg")] };
const LOG: any = { gameMs: Date.parse("2026-11-20T03:00:00Z"), startedAt: new Date("2026-11-20T03:00:00Z"), deckId: 1, deckName: "Crystal Tower", result: { kind: "won", name: COLIN.displayName },
  seats: [{ name: COLIN.displayName, you: false, place: 1, artCropUri: "art/face-ghalta.jpg" }, { name: named("You"), you: true, place: 2, artCropUri: "art/a-yshtola.jpg" }, { name: named("Maya"), you: false, place: 3, artCropUri: "art/face-jace.jpg" }],
  loggedAt: null, until: new Date("2026-11-27T11:00:00Z"), tableId: "7a0e0000-0000-4000-8000-000000000001", podName: named("Thursday night") };
const ARRIVALS: any = { lines: [{ kind: "set", code: "trc", name: "Star Trek Commander", revealed: 15 }], href: "/decks/precons?sort=newest#announced", keys: ["trc"] };
const ART = ["art/c-killian.jpg", "art/c-lathliss.jpg", "art/c-ghalta.jpg"];
const SHEET: any = { shape: "decks", lead: [], line: null, rows: [] };
function full(name: string, dev: "phone" | "desk", panel: any = {}, alt: "" | "a" | "c" = "", over: any = null, feed: any = null) {
  G.__VW = dev === "desk" ? 1300 : 390; G.__INLINE = true; G.__BADGES = { home: 2, friends: 1 }; G.__FOOT = true; G.__FACE = { name: "You", art: "art/a-tam.jpg", commander: null };
  const ws = <WelcomeStrip facts={facts} sheet={SHEET} place="dashboard" />;
  const strip = alt === "a" ? <div className="order-0 relative z-[5]"><HomeSearchPanel art={ART} {...panel} foot={ws} /></div>
    : alt === "c" ? <><div hidden data-head-holder><HeadSearch /></div>{ws}</>
    : <><div className="order-0 relative z-[5]"><HomeSearchPanel art={ART} {...panel} /></div><WelcomeStrip facts={facts} sheet={null as any} place="dashboard" /></>;
  const html = shell(
    <Dashboard stats={{ totalCards: 4492, uniqueCards: 2926 }} lastUpdated={new Date("2026-11-21T12:00:00Z")} timeZone="UTC" ready={null}
      inUse={new Map()} decks={DECKS} commitments={{ inUse: 488, overCommitted: 2 } as any}
      shopping={{ byDeck: new Map([["d1", { copies: 6, cents: 2140 }], ["d2", { copies: 8, cents: 3120 }], ["d4", { copies: 19, cents: 7480 }], ["d5", { copies: 2, cents: 1520 }]]), total: { copies: 35, cents: 14260, pricedCopies: 35 } } as any} welcome={strip}
      feed={feed ?? FEED} zone="UTC" archive friends={FRIENDS} tables={[TABLE]} logGames={[LOG]} arrivals={ARRIVALS} now={NOW.toISOString()} commandersPlace />,
    "/", over);
  writeFileSync(`dz/frames/${name}.html`, html);
  G.__VW = 0; G.__FOOT = false;
}
full("p-full", "phone");
// R10: twelve items; the rail and the column keep five; Show all opens the sheet.
const MORE = [
  ...FEED.items,
  view(8, { kind: "trade-match", unseen: true, href: "/friends/p2", name: null, card: card("gi2", "Giada, Font of Hope", "giada", ["W"]), friend: { publicId: "p2", displayName: named("Maya") } }),
  view(30, { kind: "price-drop", href: null, outbound: "https://example.com", name: null, card: card("jc", "Jace, the Mind Sculptor", "jace", ["U"]), drop: { fromCents: 2400, toCents: 1980, printing: null } }),
  view(50, { kind: "combo", href: null, opens: "sa", name: null, card: card("sa", "Sai, Master Thopterist", "sai", ["U"]), combo: { pieces: ["Sai, Master Thopterist", "Wizard's Staff"], added: "Sai, Master Thopterist", variantId: "v4" } }),
  view(90, { kind: "new-set", name: "Marvel Super Heroes", setSize: 312 }),
  view(200, { kind: "price-drop", href: null, outbound: "https://example.com", name: null, card: card("pa", "Path to Exile", "path", ["W"]), drop: { fromCents: 420, toCents: 310, printing: null } }),
];
const FEED12: any = { ...FEED, items: MORE, unseen: 3 };
for (const dev of ["phone", "desk"] as const) {
  const d = dev === "desk" ? "d" : "p";
  full(`${d}-r10`, dev, {}, "a", null, FEED12);
  full(`${d}-r10s`, dev, {}, "a", <FeedSheet items={MORE} now={NOW.toISOString()} fresh={3} desk={dev === "desk"} />, FEED12);
  full(`${d}-r10k`, dev, {}, "a", <FeedSheet items={MORE} now={NOW.toISOString()} fresh={3} kind="price-drop" desk={dev === "desk"} />, FEED12);
}
for (const dev of ["phone", "desk"] as const) {
  const d = dev === "desk" ? "d" : "p";
  full(`${d}-ra`, dev, {}, "a");
  full(`${d}-rc`, dev, {}, "c");
  for (const fr of ["fa", "fb"]) {
    G.__VW = dev === "desk" ? 1300 : 390; G.__INLINE = true; G.__BADGES = undefined;
    const html = shell(<FirstRunChecklist welcome={<WelcomeStrip facts={facts} sheet={SHEET} place="first-run" />} friends={{ friends: [], links: [], now: NOW.toISOString(), invites: null } as any} news commandersPlace
      signature={fr === "fb" ? <FirstRunSearchRow /> : null} />, "/", null);
    writeFileSync(`dz/frames/${d}-${fr}.html`, html);
  }
}
full("d-full", "desk");
full("d-full-open", "desk", { query: "where do my spare cards go", open: <ToolAnswers answers={ANSWERS.spares} /> });
console.log("ok");
