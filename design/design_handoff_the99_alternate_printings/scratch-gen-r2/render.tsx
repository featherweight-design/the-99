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
const OWN = [{ ...at("BLC|109"), quantity: 1, finishes: { nonfoil: 1 } }, { ...at("STA|10"), quantity: 1, finishes: { nonfoil: 1 } }];
const owned: any = { ...base, quantity: 2, imageUri: OWN[1].imageUri, printings: OWN, otherPrintings: ALL.filter((p) => !OWN.some((o) => key(o) === key(p))),
  primarySetCode: OWN[1].setCode, preferredPrinting: { setCode: "STA", collectorNumber: "10" },
  availability: { owned: 2, hard: 1, soft: 0, free: 1, claims: [{ id: "dg", name: "Giada's Angels", quantity: 1, mature: true, pending: false, commander: false, senior: true }] } };
const MUD = P("soc", "Secrets of Strixhaven Commander", "5", "2026-04-24", "c-muddle.jpg");
const single: any = { oracleId: "o-muddle", name: "Muddle, the Ever-Changing", typeLine: "Legendary Creature — Elemental Otter Shapeshifter",
  manaCost: "{2}{U}{R}", cmc: 4, oracleText: "Whenever you cast an instant or sorcery spell, Muddle becomes a copy of up to one target nonlegendary creature you control until end of turn, except it has myriad.",
  keywords: [], rarity: "mythic", colorIdentity: ["U", "R"], printedName: null, setCodes: [], preferredPrinting: null,
  quantity: 0, imageUri: MUD.imageUri, printings: [MUD], primarySetCode: "SOC", availability: { owned: 0, hard: 0, soft: 0, free: 0, claims: [] }, prices: PRICES };
const frames: any[] = [];
function emit(id: string, dev: "phone" | "desk", card: any, o: { preview?: string; full?: boolean; expanded?: boolean; strip?: boolean; scroll?: string } = {}) {
  G.__EXPANDED = o.expanded ?? false; G.__PREVIEW = o.preview ?? null; G.__FULL = o.full ?? false; G.__STRIPH = o.strip === false ? 0 : 98;
  writeFileSync(`dz/frames/${id}.html`, renderToString(<CardModal card={card} browsePrintings position={1} total={4} onClose={() => {}} onPrev={() => {}} onNext={() => {}} onEditCopies={() => {}} />));
  frames.push({ id, dev, bg: dev === "desk", scroll: o.scroll, vh: dev === "phone" ? 844 : 760 });
}
emit("A1-phone", "phone", unowned);
emit("A2-phone", "phone", unowned, { preview: "id-sld-2125" });
emit("A3-phone", "phone", owned);
emit("A4-phone", "phone", owned, { preview: "id-sld-2804" });
emit("A5-phone", "phone", unowned, { preview: "id-sld-2125", full: true, scroll: "set" });
emit("A6-phone", "phone", owned, { full: true, expanded: true, scroll: "set" });
emit("X1-phone", "phone", single, { strip: false });
emit("A1-desk", "desk", unowned);
emit("A2-desk", "desk", unowned, { preview: "id-sld-2125" });
emit("A4-desk", "desk", owned, { preview: "id-sld-2804" });
writeFileSync("dz/frames.json", JSON.stringify(frames)); console.log("ok", frames.length);
