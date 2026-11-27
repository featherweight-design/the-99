// Cart on your wishlist R1 (account 2, 2026-11-27): every frame is the shipped shell and the shipped page, rendered with
// the shipped CSS, with this round's proposal applied (wishlist-groups.tsx, wishlist-section.tsx, the rolled trade match).
import { app, done, frames } from "./shell";
import { CollectionPlaceHead } from "../src/components/collection/collection-place-head";
import { WishlistView } from "../src/components/wishlist/wishlist-view";
import { SettingsView } from "../src/components/settings/settings-view";
import { NewsSection } from "../src/components/settings/news-section";
import { SparesSection } from "../src/components/settings/spares-section";
import { FriendDecksSection } from "../src/components/settings/friend-decks-section";
import { WishlistSection } from "../src/components/settings/wishlist-section";
import { FriendHead } from "../src/components/social/friend-head";
import { FriendStrip } from "../src/components/social/friend-strip";
import { FriendWishlist } from "../src/components/social/friend-wishlist";
import { WhatsNew } from "../src/components/home/whats-new";
import { named } from "../src/lib/person-name/mint";
import { DeckCardOverflow } from "../src/components/decks/deck-card-overflow";
import { renderToString } from "react-dom/server";
import { writeFileSync } from "node:fs";

const NOW = new Date("2026-11-27T03:00:00Z");
let seq = 0;
const T = (name: string, f: string, want: number, have: number, cents: number) => ({
  oracleId: `00000000-0000-4000-8000-${String(++seq).padStart(12, "0")}`, name, imageUri: `art/${f}.jpg`, want, have,
  addedAt: new Date(NOW.getTime() - seq * 3600_000).toISOString(),
  line: { price: `$${(cents / 100).toFixed(2)}`, printing: null }, price: null,
});
const C = {
  lath: T("Lathliss, Dragon Queen", "lathliss", 1, 0, 1299), zim: T("Zimone, Infinite Analyst", "zimone", 1, 0, 499),
  giada: T("Giada, Font of Hope", "giada", 2, 1, 350), doom: T("Doctor Doom, King of Latveria", "doom", 1, 0, 1899),
  sai: T("Sai, Master Thopterist", "sai", 2, 0, 249), quin: T("Quintorius, History Chaser", "quintorius", 1, 0, 189),
  kil: T("Killian, Decisive Mentor", "killian", 1, 0, 129), zada: T("Zada, Hedron Grinder", "zada", 1, 0, 99),
  ghalta: T("Ghalta, Primal Hunger", "ghalta", 1, 0, 1450), miku: T("Miku, Song of the People", "miku", 1, 0, 349),
  rootha: T("Rootha, Mastering the Moment", "rootha", 1, 0, 79), gisa: T("Ghoulcaller Gisa", "gisa", 1, 0, 299),
  dina: T("Dina, Essence Brewer", "dina", 1, 0, 59), ash: T("Ashling, the Limitless", "ashling", 1, 0, 649),
  cap: T("Captain America, Team Leader", "captain-america", 1, 0, 399), inv: T("Invisible Woman", "invisible-woman", 1, 0, 219),
};
const YOU = [C.lath, C.zim, C.giada, C.doom];
const DECKS = [
  { key: "d1", name: "Saltmarsh Reclamation", tiles: [C.gisa, C.dina, C.ash, C.sai] },
  { key: "d2", name: "Lanternlight Tinkers", tiles: [C.sai, C.quin, C.kil, C.zada] },
  { key: "d3", name: "Hollow Oak Hours", tiles: [C.ghalta, C.miku, C.rootha] },
  { key: "d4", name: "Ashen Banner Parade", tiles: [C.cap, C.inv] },
];
const ALL = [...YOU, ...[...new Set(DECKS.flatMap((d) => d.tiles))]];
const GROUPS = [
  { key: "you", kind: "you" as const, name: "", tiles: YOU },
  ...DECKS.map((d) => ({ key: d.key, kind: "deck" as const, name: d.name, deckHref: `/decks/${d.key}`, tiles: d.tiles })),
];
const head = <CollectionPlaceHead stats={{ totalCards: 4004, uniqueCards: 3003 }} lastUpdatedLabel="Nov 26" editEnabled historyHasEntries wishlistEnabled />;
const wish = (p: any) => (<>{head}<WishlistView notices={[]} hasFriend {...p} /></>);

// W0: shipped. W1: switch off, the one-time offer. W2: switch on, the groups.
app("W0-desk", "desk", wish({ tiles: YOU }));
app("W0-phone", "phone", wish({ tiles: YOU }));
app("W1-desk", "desk", wish({ tiles: YOU, offer: 12 }));
app("W1-phone", "phone", wish({ tiles: YOU, offer: 12 }));
app("W2-desk", "desk", wish({ tiles: ALL, groups: GROUPS }));
app("W2-phone", "phone", wish({ tiles: ALL, groups: GROUPS }));

// Settings: the new Wishlist section between Spares and Your decks; News with the trade-match line.
const news = ["new-set", "new-precon", "secret-lair", "commander-decklists", "wizards-news", "price-drop", "trade-match", "spare-request", "combo"]
  .map((kind) => ({ kind, on: ["secret-lair", "commander-decklists", "wizards-news", "trade-match", "spare-request"].includes(kind) })) as any;
const settings = (on: boolean) => (
  <SettingsView>
    <NewsSection kinds={news} />
    <SparesSection spareMin={2} pods={[named("The Bros")]} kept={[]} />
    <WishlistSection on={on} leftOut={["Ashen Banner Parade"]} />
    <FriendDecksSection prefs={{ seeDecks: true, seeUnfinished: false }} />
  </SettingsView>
);
app("S1-desk", "desk", settings(true), { path: "/settings" });
app("S1-phone", "phone", settings(true), { path: "/settings" });

// F1: a friend's Wishlist tab of the reader (Colin reading Wren): the one shipped list, no groups, no deck names.
const wren = { publicId: "wren", displayName: named("Wren"), since: new Date("2026-08-02"), commander: { oracleId: "c", name: "Sai", artCropUri: "art/face-sai.jpg" } } as any;
const lines = ALL.map((t) => ({ oracleId: t.oracleId, quantity: t.want, name: t.name, imageUri: t.imageUri, layout: "normal", backImageUri: null }));
const friendPage = (
  <div className="w-full px-[14px] pt-[18px] pb-[30px] md:px-[34px] md:pt-[28px] md:pb-[34px]">
    <FriendHead friend={wren} nowMs={NOW.getTime()} />
    <FriendStrip publicId="wren" counts={{ spares: 41, wishlist: lines.length, decks: 5 }} />
    <FriendWishlist name={wren.displayName} friendPublicId="wren" lines={lines as any} haves={[]} />
  </div>
);
app("F1-desk", "desk", friendPage, { path: "/friends/wren/wishlist" });
app("F1-phone", "phone", friendPage, { path: "/friends/wren/wishlist" });

// N: What's new. N0 shipped, one row per card per friend. N1 proposal, one row per friend per day.
const fc = (t: any) => ({ oracleId: t.oracleId, name: t.name, image: t.imageUri, art: null, colorIdentity: null });
const fr = (k: string) => ({ publicId: k, displayName: named(k[0].toUpperCase() + k.slice(1)) });
const item = (key: string, f: string, card: any, h: number, extra: any = {}) => ({
  key, kind: "trade-match", at: new Date(NOW.getTime() - h * 3600_000).toISOString(), unseen: true, card: fc(card), friend: fr(f),
  href: `/friends/${f}/spares`, opens: null, outbound: null, name: null, setSize: null, owned: null, drop: null, combo: null, answer: null, askable: false, ...extra,
});
const old = [
  item("a", "colin", C.sai, 1), item("b", "colin", C.ghalta, 1), item("c", "colin", C.dina, 1), item("d", "colin", C.quin, 1),
  item("e", "peter", C.miku, 2), item("f", "peter", C.cap, 2), item("g", "max", C.zada, 3),
];
const rolled = [
  item("r1", "colin", C.sai, 1, { rolled: { cards: [C.sai, C.ghalta, C.dina, C.quin].map(fc) } }),
  item("r2", "peter", C.miku, 2, { rolled: { cards: [C.miku, C.cap].map(fc) } }),
  item("r3", "max", C.zada, 3),
];
const feed = (items: any[]) => ({ chosen: true, on: ["trade-match"], items, unseen: items.length, lead: null });
const faces = new Map<string, any>([["colin", { artCropUri: "art/face-giada.jpg" }], ["peter", { artCropUri: "art/face-sai.jpg" }], ["max", { artCropUri: "art/face-rootha.jpg" }]]);
const home = (items: any[]) => (
  <div className="w-full max-w-[860px] px-[14px] pt-[18px] pb-[30px] md:px-[34px] md:pt-[28px]">
    <WhatsNew feed={feed(items) as any} now={NOW.toISOString()} faces={faces} wide />
  </div>
);
app("N0-desk", "desk", home(old), { path: "/" });
app("N0-phone", "phone", home(old), { path: "/" });
app("N1-desk", "desk", home(rolled), { path: "/" });
app("N1-phone", "phone", home(rolled), { path: "/" });
// M: the Decks list's ⋯ menu on Ashen Banner Parade, open, over the shipped Decks capture (About pages, amonkhet).
(globalThis as any).__OPEN = true;
const menu = (
  <DeckCardOverflow deckId="d4" deckName="Ashen Banner Parade" built={99} placement="tile"
    move={{ folders: [], folderId: null, folderName: null, onCreateFolder: () => {}, onMove: () => {}, keepsFocus: true, closeAfterCreate: null }}
    onAmong={() => {}}
    friends={{ hidden: false, statusPill: "To buy", prefs: { seeDecks: true, seeUnfinished: false }, built: 99, size: 99, canCommit: false }}
    wishlist={{ kept: true }} />
);
const over = (bg: string, w: number, h: number, right: number, top: number, shift = 0, fh = h) => `<div style="position:relative;width:${w}px;height:${fh}px;overflow:hidden;background:url(${bg}) 0 ${-shift}px/${w}px ${h}px no-repeat"><div style="position:absolute;left:${right - 23}px;top:${top}px;width:23px">${renderToString(menu)}</div></div>`;
writeFileSync("dz/frames/M1-desk.html", over("art/d-decks2.webp", 1300, 900, 472, 354));
writeFileSync("dz/frames/M1-phone.html", over("art/p-decks.webp", 390, 844, 372, 465 - 330, 330, 514));
frames.push({ id: "M1-desk", dev: "desk", vh: 900 }, { id: "M1-phone", dev: "phone", vh: 514 });
(globalThis as any).__OPEN = false;
done();
