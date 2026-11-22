// Wishlist printing (account 1, 2026-11-22): the shipped CardModal (R3 patched in, per alternate printings scratch-gen-r3)
// opened from the Wishlist, with this round's Printing line and panel foot.
import { renderToString } from "react-dom/server";
import { writeFileSync, mkdirSync } from "node:fs";
import * as React from "react";
import { CardModal } from "../src/components/cards/card-modal";
import { SW } from "./fixtures";
mkdirSync("dz/frames", { recursive: true });
const G = globalThis as any;
const P = (set: string, setName: string, n: string, rel: string, img: string) => ({
  setCode: set.toUpperCase(), setName, collectorNumber: n, releasedAt: rel, quantity: 0, scryfallId: `id-${set}-${n}`,
  finishes: {}, imageUri: `art/${img}`, flavorName: null,
});
const ALL = SW.map(([s, n, c, r, i]) => P(s, n, c, r, i));
const AS_OF = new Date("2026-11-22T08:00:00Z");
const C = [149, 1899, 2450, 189, 165, 129, 1250, 1675, 2299, 349, 299, 449, 1599, 3899, 2899, 279, 1450, 1199, 4599, 899, 675, 145000];
const prices = (soldOut: boolean): any => ({ byScryfallId: {}, byPrintingKey: Object.fromEntries(ALL.map((p, i) => [`${p.setCode}|${p.collectorNumber}`,
  { cents: C[i] ?? 250, foilCents: null, etchedCents: null, asOf: soldOut && p.setCode === "SLD" && p.collectorNumber === "2125" ? new Date("2026-10-02T08:00:00Z") : AS_OF }])),
  ambiguousKeys: [], catalogIds: [], catalogKeys: ALL.map((p) => `${p.setCode}|${p.collectorNumber}`), newestAsOf: AS_OF });
const card = (soldOut = false): any => ({
  oracleId: "o-swords", name: "Swords to Plowshares", typeLine: "Instant", manaCost: "{W}", cmc: 1,
  oracleText: "Exile target creature. Its controller gains life equal to its power.", keywords: [],
  rarity: "uncommon", colorIdentity: ["W"], printedName: null, setCodes: [], preferredPrinting: null, prices: prices(soldOut),
  quantity: 0, imageUri: ALL[0].imageUri, printings: ALL, primarySetCode: ALL[0].setCode,
  availability: { owned: 0, hard: 0, soft: 0, free: 0, claims: [] }, wishlist: { want: 1 },
});
const SLD = { set: "SLD", num: "2125", setName: "Secret Lair Drop", price: "$24.50", img: "art/sw/sld-2125.jpg" };
const frames: any[] = [];
function emit(id: string, dev: "phone" | "desk", o: any = {}) {
  Object.assign(G, { __PREVIEW: o.preview ?? null, __STRIPH: o.panel && dev === "phone" ? 120 : 0, __BUTTON: dev === "phone", __PANEL: o.panel ?? false, __QUERY: o.query ?? "",
    __TILE: dev === "desk", __RESERVE: false, __FULL: o.full ?? false, __W: o.w ?? null, __SHOWN: o.shown ?? null, __ONLIST: true });
  writeFileSync(`dz/frames/${id}.html`, renderToString(<CardModal card={card(o.soldOut)} browsePrintings position={4} total={9} onClose={() => {}} onPrev={() => {}} onNext={() => {}} onEditCopies={() => {}} />));
  frames.push({ id, dev, vh: dev === "phone" ? 844 : 900, bg: true, scrollTo: o.scrollTo ?? null });
}
const SH = { set: "SLD", num: "2125" };
// Phone: opened from the tile, the card lands on the wanted printing.
emit("C0-phone", "phone", { preview: "id-sld-2125", shown: SH, w: SLD });
// Phone: the panel (R3) is where you browse; its foot is where you want one.
emit("C1-phone", "phone", { panel: true, preview: "id-sld-2125", shown: SH });
emit("C2-phone", "phone", { panel: true, preview: "id-sld-2125", shown: SH, w: SLD });
// Phone: the full sheet's Wishlist box.
emit("C3-phone", "phone", { full: true, scrollTo: "card-wishlist" });
emit("C4-phone", "phone", { full: true, preview: "id-sld-2125", shown: SH, w: SLD, scrollTo: "card-wishlist" });
emit("C5-phone", "phone", { full: true, preview: "id-sld-2125", shown: SH, w: { ...SLD, soldOut: true }, soldOut: true, scrollTo: "card-wishlist" });
// Desktop: the strip (R2) and the Wishlist box in the details column.
emit("D1-desk", "desk", { preview: "id-sld-2125", shown: SH, scrollTo: "card-wishlist" });
emit("D2-desk", "desk", { preview: "id-sld-2125", shown: SH, w: SLD, scrollTo: "card-wishlist" });
emit("D3-desk", "desk", { preview: "id-sld-2125", shown: SH, w: { ...SLD, soldOut: true }, soldOut: true, scrollTo: "card-wishlist" });
emit("D4-desk", "desk", { panel: true, query: "secret", preview: "id-sld-2125", shown: SH, w: SLD });
writeFileSync("dz/frames4.json", JSON.stringify(frames)); console.log("ok", frames.length);
