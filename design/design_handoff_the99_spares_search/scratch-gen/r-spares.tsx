// Spares search + friends' spares on the Wishlist (account 1, 2026-11-22): every frame's HTML.
import { writeFileSync, mkdirSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { shell, W } from "./shell";
import { FriendHead } from "../src/components/social/friend-head";
import { FriendStrip } from "../src/components/social/friend-strip";
import { FriendSparesTab } from "../src/components/social/friend-spares-tab";
import { CollectionPlaceHead } from "../src/components/collection/collection-place-head";
import { WishlistView } from "../src/components/wishlist/wishlist-view";
import { CardDetailProvider } from "../src/components/cards/card-detail-provider";
import { SparesSheet } from "../src/components/social/spare-markers";
import { SpareRequestsContext } from "../src/components/social/friend-spares";
import { named } from "../src/lib/person-name/mint";
import { PersonText } from "../src/lib/person-name";
import { socialCopy } from "../src/lib/copy/social";
import { SparesChassisWide, SparesChassisCompact, SparesFilterSheet, SparesGrid, SparesNoResults, type BrowseState, type SpareTile } from "./spares-browse";
import { WishlistSparePress, WishlistSpareKey, wishlistSpareCopy } from "./wishlist-spares";
mkdirSync("dz/frames", { recursive: true });
const G = globalThis as any;

const COLIN = "7b0c1f40-3a55-4e1a-9d0e-2c6d5a8b9e01";
const face = (img: string, name: string) => ({ oracleId: "o-" + img, name, artCropUri: `art/face-${img}.jpg` });
const colin = { publicId: COLIN, displayName: named("Colin"), since: new Date(Date.UTC(2026, 8, 14)), commander: face("ghalta", "Ghalta, Primal Hunger") };
const pods = [named("Thursday pod")];
const NOW = Date.UTC(2026, 10, 22, 20);

// Colin's spares: name, crop, spares, on your wishlist, decks that need it, type, colours.
type F = [string, string, number, boolean, number, string, string];
const ALL: F[] = [
  ["Zimone, Infinite Analyst", "zimone", 1, true, 0, "Legendary Creature — Human Wizard", "GU"],
  ["Lathliss, Dragon Queen", "lathliss", 2, true, 1, "Legendary Creature — Dragon", "R"],
  ["Jace, Multiverse Architect", "jace", 1, true, 0, "Legendary Planeswalker — Jace", "U"],
  ["Ghalta, Primal Hunger", "ghalta", 1, false, 1, "Legendary Creature — Elder Dinosaur", "G"],
  ["Tam, the Possibility", "tam", 1, false, 2, "Legendary Creature — Gorgon Wizard", "GU"],
  ["Rootha, Mastering the Moment", "rootha", 3, false, 1, "Legendary Creature — Orc Sorcerer", "UR"],
  ["Ashling, the Limitless", "ashling", 1, false, 0, "Legendary Creature — Elemental Sorcerer", "R"],
  ["Auntie Ool, Cursewretch", "auntie-ool", 2, false, 0, "Legendary Creature — Goblin Warlock", "BR"],
  ["Captain America, Team Leader", "captain-america", 1, false, 0, "Legendary Creature — Human Soldier Hero", "W"],
  ["Dina, Essence Brewer", "dina", 1, false, 0, "Legendary Creature — Dryad Druid", "BG"],
  ["Doctor Doom, King of Latveria", "doctor-doom", 1, false, 0, "Legendary Creature — Human Noble Villain", "UB"],
  ["Ghoulcaller Gisa", "gisa", 2, false, 0, "Legendary Creature — Human Wizard", "B"],
  ["Giada, Font of Hope", "giada", 1, false, 0, "Legendary Creature — Angel", "W"],
  ["Heroes in a Half Shell", "heroes", 1, false, 0, "Legendary Creature — Mutant Ninja Turtle", "WUG"],
  ["Invisible Woman", "invisible-woman", 1, false, 0, "Legendary Creature — Human Hero", "WU"],
  ["Killian, Decisive Mentor", "killian", 1, false, 0, "Legendary Creature — Human Warlock", "WB"],
  ["Miku, Song of the People", "miku", 4, false, 0, "Legendary Creature — Dryad", "GW"],
  ["Muddle, the Ever-Changing", "muddle", 1, false, 0, "Legendary Creature — Elemental Otter Shapeshifter", "UR"],
  ["Polyraptor", "polyraptor", 2, false, 0, "Creature — Dinosaur", "G"],
  ["Quintorius, History Chaser", "quintorius", 1, false, 0, "Legendary Planeswalker — Quintorius", "RW"],
  ["Sai, Master Thopterist", "sai", 1, false, 0, "Legendary Creature — Human Artificer", "U"],
  ["T'Challa, the Black Panther", "tchalla", 1, false, 0, "Legendary Creature — Human Noble Hero", "WG"],
  ["The Wise Mothman", "mothman", 1, false, 0, "Legendary Creature — Insect Mutant", "UBG"],
  ["Y'shtola, Night's Blessed", "yshtola", 1, false, 0, "Legendary Creature — Cat Warlock", "WUB"],
  ["Zada, Hedron Grinder", "zada", 1, false, 0, "Legendary Creature — Goblin Ally", "R"],
];
const tile = (f: F): SpareTile => ({ oracleId: "o-" + f[1], name: f[0], img: `art/c-${f[1]}.jpg`, spare: f[2], wish: f[3], decks: f[4] });
// "Wanted first": on your wishlist, then needed by a deck, then by name.
const wantedFirst = (a: F, b: F) => Number(b[3]) - Number(a[3]) || Number(b[4] > 0) - Number(a[4] > 0) || a[0].localeCompare(b[0]);
const TOTAL = ALL.length;
const typeCounts = (fs: F[]) => {
  const out: Record<string, number> = {};
  for (const f of fs) for (const t of ["Creature", "Planeswalker"]) if (f[5].includes(t)) out[t] = (out[t] ?? 0) + 1;
  return out;
};
const matches = (f: F, q: string) => q.split(/\s+/).filter(Boolean).every((w) => f[0].toLowerCase().includes(w) || f[5].toLowerCase().split(/[\s—]+/).some((x) => x.startsWith(w)));
const state = (o: Partial<BrowseState> & { fs: F[] }): BrowseState => ({
  friend: "Colin", query: "", shown: o.fs.length, total: TOTAL, typeCounts: typeCounts(o.fs.length ? o.fs : ALL),
  wish: ALL.filter((f) => f[3]).length, deck: ALL.filter((f) => f[4] > 0).length, ...o,
});

function page(body: any, path = `/friends/${COLIN}/spares`) {
  return (
    <div className="w-full px-[14px] pt-[18px] pb-[30px] md:px-[34px] md:pt-[28px] md:pb-[34px]">
      <FriendHead friend={colin as any} nowMs={NOW} />
      <FriendStrip publicId={COLIN} counts={{ decks: 4, spares: TOTAL, wishlist: 6 }} />
      {body}
    </div>
  );
}
const line = (
  <p className="m-0 mt-[12px] font-mono text-[11px] text-[color:var(--fg-faint)]">
    <PersonText text={socialCopy.friendPage.spares.line(pods, false)} />{socialCopy.friendPage.spares.pressToAsk}
  </p>
);
const PATH = `/friends/${COLIN}/spares`;
function spares(name: string, s: BrowseState, fs: F[], overlay: any = null, dev: "phone" | "desk" = "phone") {
  G.__VW = dev === "desk" ? 1300 : 390;
  const chassis = dev === "desk" ? <SparesChassisWide s={s} /> : <SparesChassisCompact s={s} />;
  const body = fs.length ? <>{chassis}{line}<SparesGrid tiles={fs.map(tile)} /></> : <>{chassis}<SparesNoResults s={s} /></>;
  writeFileSync(`dz/frames/${name}.html`, shell(page(body), PATH, overlay));
  G.__VW = 0; G.__OPEN_PANEL = undefined;
}

const rest = [...ALL].sort(wantedFirst);
for (const dev of ["phone", "desk"] as const) {
  const d = dev === "desk" ? "d" : "p";
  // S1 · rest
  spares(`${d}-s1`, state({ fs: rest }), rest, null, dev);
  // S2 · search "wizard" (a type word: no name holds it)
  const wiz = rest.filter((f) => matches(f, "wizard"));
  spares(`${d}-s2`, state({ fs: wiz, query: "wizard" }), wiz, null, dev);
  // S3 · Wanted: A deck needs it
  const need = rest.filter((f) => f[4] > 0);
  const s3 = state({ fs: need, wanted: ["deck"] });
  if (dev === "desk") { G.__OPEN_PANEL = "Wanted"; spares(`d-s3`, s3, need, null, dev); }
  else spares(`p-s3`, s3, need, W(<SparesFilterSheet s={s3} />, PATH), dev);
  // S4 · no results
  spares(`${d}-s4`, state({ fs: [], query: "saga", wanted: ["wishlist"] }), [], null, dev);
  // S5 · empty (shipped tab, no chassis)
  G.__VW = dev === "desk" ? 1300 : 390;
  writeFileSync(`dz/frames/${d}-s5.html`, shell(page(<FriendSparesTab name={named("Colin")} spares={{ pods, friend: { ...colin, pods } as any, lines: [], wishlist: true }} />), PATH));
  // S6 · type panel (desk) / sort (phone not drawn)
  if (dev === "desk") { G.__OPEN_PANEL = "Type"; spares(`d-s6`, state({ fs: wiz, query: "wizard" }), wiz, null, dev); }
  G.__VW = 0;
}

// ---- Wishlist ----
const wl = (oracleId: string, name: string, img: string, d: number, line: any, friends: number, want = 1, have = 0) =>
  ({ oracleId, name, imageUri: `art/c-${img}.jpg`, want, have, addedAt: new Date(Date.UTC(2026, 10, d)).toISOString(), line, friends });
const WL = [
  wl("o-lathliss", "Lathliss, Dragon Queen", "lathliss", 21, { price: "$0.89", printing: null }, 2, 2, 1),
  wl("o-polyraptor", "Polyraptor", "polyraptor", 20, { price: "$3.99", printing: null }, 0),
  wl("o-zimone", "Zimone, Infinite Analyst", "zimone", 19, { price: "$0.35", printing: null }, 1),
  wl("o-giada", "Giada, Font of Hope", "giada", 18, { price: "$24.50", printing: { setCode: "FDC", collectorNumber: "4" } }, 3),
  wl("o-gisa", "Ghoulcaller Gisa", "gisa", 17, { price: "$2.49", printing: null }, 0),
  wl("o-jace", "Jace, Multiverse Architect", "jace", 16, { price: "$1.19", printing: null }, 1),
  wl("o-mothman", "The Wise Mothman", "mothman", 15, { price: "sold out", printing: { setCode: "SLD", collectorNumber: "2455" } }, 0),
  wl("o-killian", "Killian, Decisive Mentor", "killian", 14, { price: "$0.49", printing: null }, 0),
  wl("o-tam", "Tam, the Possibility", "tam", 13, { price: "$1.79", printing: null }, 1),
];
const marks: Record<string, any> = { "o-zimone": "requested" };
function wishlist(name: string, o: { loaded: boolean; sort?: "friends"; open?: string; dev: "phone" | "desk" }) {
  G.__VW = o.dev === "desk" ? 1300 : 390; G.__PATH = "/collection/wishlist";
  G.__SPARE = o.loaded ? (t: any) => <WishlistSparePress friends={t.friends} mark={marks[t.oracleId] ?? null} name={t.name} open={o.open === t.oracleId} /> : undefined;
  G.__META = o.loaded ? () => <span className="inline-flex"><span aria-hidden className="mr-[12px]">·</span><WishlistSpareKey requested /></span> : undefined;
  G.__SORT = o.sort ? wishlistSpareCopy.sort : undefined;
  let tiles = [...WL];
  if (o.sort) tiles = tiles.map((t, i) => ({ ...t, addedAt: new Date(Date.UTC(2026, 10, 1) + (t.friends * 100 + (50 - i)) * 3600e3).toISOString() }));
  const opened = WL.find((t) => t.oracleId === o.open);
  const overlay = opened ? W(
    <CardDetailProvider>
      <SpareRequestsContext.Provider value={{ asksFor: () => [], ask: async () => true }}>
        <SparesSheet
          card={{ oracleId: opened.oracleId, name: opened.name, printedName: null, layout: null, imageUri: opened.imageUri, price: { cents: 89, asOf: new Date(Date.UTC(2026, 10, 22)) } as any, quantity: 1 }}
          spares={[
            { oracleId: opened.oracleId, friend: { publicId: COLIN, displayName: named("Colin"), commander: face("ghalta", "Ghalta"), pods }, spare: 2 },
            { oracleId: opened.oracleId, friend: { publicId: "m", displayName: named("Max"), commander: face("sai", "Sai"), pods }, spare: 1 },
          ]}
          newestAsOf={new Date(Date.UTC(2026, 10, 22))}
          onClose={() => {}}
          kicker={socialCopy.friendPage.spares.onWishlist}
        />
      </SpareRequestsContext.Provider>
    </CardDetailProvider>, "/collection/wishlist") : null;
  writeFileSync(`dz/frames/${name}.html`, shell(<>
    <style>{`li:has([data-dz=wl-spare]) [data-testid=wishlist-tile-printing],li:has([data-dz=wl-spare]) [data-testid=wishlist-tile-caption]{padding-right:38px}@media(min-width:768px){li:has([data-dz=wl-spare]) [data-testid=wishlist-tile-printing],li:has([data-dz=wl-spare]) [data-testid=wishlist-tile-caption]{padding-right:44px}}`}</style>
    <CollectionPlaceHead stats={{ totalCards: 4492, uniqueCards: 2926 } as any} lastUpdatedLabel="Nov 21" editEnabled historyHasEntries preconPick scan wishlistEnabled {...({} as any)} />
    <WishlistView tiles={tiles as any} notices={[]} hasFriend />
  </>, "/collection/wishlist", overlay));
  G.__SPARE = G.__META = G.__SORT = undefined; G.__VW = 0;
}
for (const dev of ["phone", "desk"] as const) {
  const d = dev === "desk" ? "d" : "p";
  wishlist(`${d}-w1`, { loaded: true, dev });
  wishlist(`${d}-w0`, { loaded: false, dev });
  wishlist(`${d}-w2`, { loaded: true, dev, open: "o-lathliss" });
}
wishlist("d-w3", { loaded: true, dev: "desk", sort: "friends" });
console.log("ok");
