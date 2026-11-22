import { writeFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { W, shell } from "./r-settings";
import { CartCheckout } from "../src/components/decks/cart/cart-checkout";
import { FeedItemRow } from "../src/components/feed/feed-item";
import { WorthBody } from "../src/components/decks/lineup/worth-card";
import { CollectionPlaceHead } from "../src/components/collection/collection-place-head";
import { WishlistView } from "../src/components/wishlist/wishlist-view";
const G = globalThis as any;
const prov = { behind: false, when: "Sunday" };
const STORES = ["manapool", "tcgplayer", "cardkingdom"];
const F: Record<string, number> = { manapool: 1, tcgplayer: 0.91, cardkingdom: 1.18 };
const box = (x: any, w = 360) => `<div style="width:${w}px;padding:16px;box-sizing:border-box">${renderToString(W(x, "/decks"))}</div>`;
for (const s of STORES) {
  G.__STORE = s;
  writeFileSync(`dz/frames/k-${s}.html`, box(<CartCheckout total={{ copies: 41, cents: Math.round(61287 * F[s]), pricedCopies: 41 }} deckCount={3} priced provenance={prov}
    links={[{ href: "https://manapool.com/add-deck?deck=x", lineCount: 38 }]} />));
  const item = (k: string, name: string, art: string, from: number, to: number, printing: string | null): any => ({ key: k, kind: "price-drop", at: "2026-11-22T14:00:00Z", unseen: true,
    card: { oracleId: k, name, image: art, art, colorIdentity: ["W"] }, friend: null, href: null, opens: null, outbound: "https://example.com", name: null, setSize: null, owned: null,
    drop: { fromCents: Math.round(from * F[s]), toCents: Math.round(to * F[s]), printing }, combo: null });
  writeFileSync(`dz/frames/f-${s}.html`, box(<ul className="m-0 list-none p-0 flex flex-col">
    <FeedItemRow item={item("a", "Giada, Font of Hope", "art/c-giada.jpg", 2450, 1990, "FDC 4")} now="2026-11-22T19:00:00Z" />
    <FeedItemRow item={item("b", "Ghoulcaller Gisa", "art/c-gisa.jpg", 349, 249, null)} now="2026-11-22T19:00:00Z" />
  </ul>, 560));
  const deck = (id: string, name: string, id2: string[], c: number): any => ({ id, name, identity: id2, brew: false, bracket: null, games: [], basis: name, build: { valueCents: Math.round(c * F[s]) } });
  writeFileSync(`dz/frames/w-${s}.html`, box(<div className="flex flex-col gap-[12px]"><WorthBody decks={[deck("1", "Lanternlight Tinkers", ["U", "R"], 58210), deck("2", "Saltmarsh Reclamation", ["U", "B"], 41077), deck("3", "Ashen Banner Parade", ["R", "W"], 22950)]} chosenId="1" pricesAsOf="2026-11-22T17:00:00Z" now="2026-11-22T19:00:00Z" /></div>, 560));
}
// Wishlist tab with TCGplayer: same tiles, TCGplayer figures; Mothman has no TCGplayer price, so no line (silence).
G.__STORE = "tcgplayer"; G.__PATH = "/collection/wishlist";
const t = (oracleId: string, name: string, img: string, d: number, line: any, want = 1, have = 0) => ({ oracleId, name, imageUri: `art/${img}`, want, have, addedAt: new Date(Date.UTC(2026, 10, d)).toISOString(), line });
const tiles = [
  t("o-gi2", "Giada, Font of Hope", "c-giada.jpg", 21, { price: "$22.30", printing: { setCode: "FDC", collectorNumber: "4" } }),
  t("o-mo", "The Wise Mothman", "c-mothman.jpg", 20, null),
  t("o-po", "Polyraptor", "c-polyraptor.jpg", 19, { price: "$3.63", printing: null }),
  t("o-la", "Lathliss, Dragon Queen", "c-lathliss.jpg", 18, { price: "$0.81", printing: null }, 2, 1),
  t("o-gi", "Ghoulcaller Gisa", "c-gisa.jpg", 17, { price: "$2.27", printing: null }),
  t("o-gh", "Ghalta, Primal Hunger", "c-ghalta.jpg", 16, { price: "$2.37", printing: null }),
];
writeFileSync("dz/frames/wl-tcg.html", shell(<>
  <CollectionPlaceHead stats={{ totalCards: 4492, uniqueCards: 2926 } as any} lastUpdatedLabel="Nov 21" editEnabled historyHasEntries preconPick scan wishlistEnabled {...({} as any)} />
  <WishlistView tiles={tiles as any} notices={[]} hasFriend />
</>, "/collection/wishlist"));
console.log("ok");
