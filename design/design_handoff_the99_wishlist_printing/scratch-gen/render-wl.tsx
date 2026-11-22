// Wishlist printing (account 1, 2026-11-22): the shipped Collection head and Wishlist view, with this round's price line on the tile.
import { renderToString } from "react-dom/server";
import { writeFileSync, readFileSync, mkdirSync } from "node:fs";
import * as React from "react";
import { CollectionPlaceHead } from "../src/components/collection/collection-place-head";
import { WishlistView } from "../src/components/wishlist/wishlist-view";
mkdirSync("dz/frames", { recursive: true });
(globalThis as any).__PATH = "/collection/wishlist";
const t = (oracleId: string, name: string, img: string, d: number, line: any, want = 1, have = 0) =>
  ({ oracleId, name, imageUri: `art/${img}`, want, have, addedAt: new Date(Date.UTC(2026, 10, d)).toISOString(), line });
const tiles = [
  t("o-sw", "Swords to Plowshares", "sw/sld-2125.jpg", 21, { price: "$24.50", set: "SLD", num: "2125" }),
  t("o-mo", "The Wise Mothman", "c-mothman.jpg", 20, { price: null, set: "SLD", num: "2455", soldOut: true }),
  t("o-po", "Polyraptor", "c-polyraptor.jpg", 19, { price: "$3.99" }),
  t("o-la", "Lathliss, Dragon Queen", "c-lathliss.jpg", 18, { price: "$0.89" }, 2, 1),
  t("o-gi", "Ghoulcaller Gisa", "c-gisa.jpg", 17, { price: "$2.49" }),
  t("o-zi", "Zimone, Infinite Analyst", "c-zimone.jpg", 16, { price: "$0.35" }),
];
const body = renderToString(<>
  <CollectionPlaceHead stats={{ totalCards: 4492, uniqueCards: 2926 }} lastUpdatedLabel="Nov 21" editEnabled historyHasEntries preconPick scan wishlistEnabled />
  <WishlistView tiles={tiles} notices={[]} hasFriend />
</>);
writeFileSync("dz/frames/W-body.html", body);
console.log("ok");
