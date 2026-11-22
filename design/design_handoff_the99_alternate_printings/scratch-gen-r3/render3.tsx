// Alternate printings R2 (account 2, 2026-11-22): shipped CardModal SSR with the printings strip patched in.
import { renderToString } from "react-dom/server";
import { writeFileSync, mkdirSync } from "node:fs";
import * as React from "react";
import { CardModal } from "../src/components/cards/card-modal";
import { SW } from "./fixtures";
mkdirSync("dz/frames", { recursive: true });
const G = globalThis as any;
const P = (set: string, setName: string, n: string, rel: string, img: string, q = 0) => ({
  setCode: set.toUpperCase(), setName, collectorNumber: n, releasedAt: rel, quantity: q, scryfallId: `id-${set}-${n}`,
  finishes: q ? { nonfoil: q } : {}, imageUri: `art/${img}`, flavorName: null,
});
const ALL = SW.map(([s, n, c, r, i]) => P(s, n, c, r, i));
const AS_OF = new Date("2026-11-22T08:00:00Z");
const C = [149, 1899, 2450, 189, 165, 129, 1250, 1675, 2299, 349, 299, 449, 1599, 3899, 2899, 279, 1450, 1199, 4599, 899, 675, 145000];
const PRICES: any = { byScryfallId: {}, byPrintingKey: Object.fromEntries(ALL.map((p, i) => [`${p.setCode}|${p.collectorNumber}`,
  { cents: C[i] ?? 250, foilCents: null, etchedCents: null, asOf: AS_OF }])),
  ambiguousKeys: [], catalogIds: [], catalogKeys: ALL.map((p) => `${p.setCode}|${p.collectorNumber}`), newestAsOf: AS_OF };
const base: any = {
  oracleId: "o-swords", name: "Swords to Plowshares", typeLine: "Instant", manaCost: "{W}", cmc: 1,
  oracleText: "Exile target creature. Its controller gains life equal to its power.", keywords: [],
  rarity: "uncommon", colorIdentity: ["W"], printedName: null, setCodes: [], preferredPrinting: null, prices: PRICES,
};
const unowned: any = { ...base, quantity: 0, imageUri: ALL[0].imageUri, printings: ALL, primarySetCode: ALL[0].setCode,
  availability: { owned: 0, hard: 0, soft: 0, free: 0, claims: [] } };
const key = (p: any) => `${p.setCode}|${p.collectorNumber}`;
const at = (k: string) => ALL.find((p) => key(p) === k)!;
const OWN = [{ ...at("BLC|109"), quantity: 1, finishes: { nonfoil: 1 } }, { ...at("STA|10"), quantity: 2, finishes: { nonfoil: 2 } }, { ...at("EOC|45"), quantity: 1, finishes: { nonfoil: 1 } }];
const owned: any = { ...base, quantity: 4, imageUri: OWN[1].imageUri, printings: OWN, otherPrintings: ALL.filter((p) => !OWN.some((o) => key(o) === key(p))),
  primarySetCode: OWN[1].setCode, preferredPrinting: { setCode: "STA", collectorNumber: "10" },
  availability: { owned: 2, hard: 1, soft: 0, free: 1, claims: [{ id: "dg", name: "Giada's Angels", quantity: 1, mature: true, pending: false, commander: false, senior: true }] } };
const MUD = P("soc", "Secrets of Strixhaven Commander", "5", "2026-04-24", "c-muddle.jpg");
const single: any = { oracleId: "o-muddle", name: "Muddle, the Ever-Changing", typeLine: "Legendary Creature — Elemental Otter Shapeshifter",
  manaCost: "{2}{U}{R}", cmc: 4, oracleText: "Whenever you cast an instant or sorcery spell, Muddle becomes a copy of up to one target nonlegendary creature you control until end of turn, except it has myriad.",
  keywords: [], rarity: "mythic", colorIdentity: ["U", "R"], printedName: null, setCodes: [], preferredPrinting: null,
  quantity: 0, imageUri: MUD.imageUri, printings: [MUD], primarySetCode: "SOC", availability: { owned: 0, hard: 0, soft: 0, free: 0, claims: [] }, prices: PRICES };
const frames: any[] = [];
function emit(id: string, dev: "phone" | "desk", card: any, o: any = {}) {
  Object.assign(G, { __PREVIEW: o.preview ?? null, __STRIPH: o.h, __BUTTON: o.button ?? false, __PANEL: o.panel ?? false, __QUERY: o.query ?? "", __TILE: o.tile ?? false, __RESERVE: o.reserve ?? false });
  writeFileSync(`dz/frames/${id}.html`, renderToString(<CardModal card={card} browsePrintings position={1} total={13} onClose={() => {}} onPrev={() => {}} onNext={() => {}} onEditCopies={() => {}} />));
  frames.push({ id, dev, bg: dev === "desk", vh: dev === "phone" ? 844 : 760 });
}
const A = { button: true, h: 0 };
emit("A1-phone", "phone", owned, A);
emit("A2-phone", "phone", single, A);
emit("A3-phone", "phone", owned, { ...A, panel: true, h: 120 });
emit("A4-phone", "phone", owned, { ...A, panel: true, h: 120, query: "secret" });
emit("A5-phone", "phone", owned, { ...A, panel: true, h: 120, query: "secret", preview: "id-sld-2125" });
const B = { tile: true, reserve: true, h: 98 };
emit("B1-phone", "phone", owned, B);
emit("B2-phone", "phone", single, B);
emit("D1-desk", "desk", owned, { tile: true });
emit("D2-desk", "desk", owned, { tile: true, panel: true, query: "secret", preview: "id-sld-2125" });
writeFileSync("dz/frames.json", JSON.stringify(frames)); console.log("ok", frames.length);
