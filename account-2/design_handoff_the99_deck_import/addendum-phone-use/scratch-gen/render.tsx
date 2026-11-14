import { renderToString } from "react-dom/server";
import { writeFileSync } from "node:fs";
import { UnresolvedGroup } from "../src/components/decks/unresolved-group";
import { deckImportCopy } from "../src/lib/copy/deck-import";
const r = (id: string, name: string, typeLine: string, manaCost: string, cmc: number, img: string, ownedQty = 0) => ({
  oracleId: id, name, typeLine, owned: ownedQty > 0, ownedQty, cardTypeGroup: "Creatures", role: null, imageUri: img, manaCost, cmc,
  availability: null, flavorName: null, facts: null });
const AANG = [
  r("aang", "Aang, Swift Savior", "Legendary Creature — Human Avatar Ally", "{1}{W}{U}", 3, "c-aang-swift-savior.jpg", 1),
  r("avatar", "Avatar Aang", "Legendary Creature — Human Avatar Ally", "{R}{G}{W}{U}", 4, "c-avatar-aang.jpg", 0),
  r("appa", "Appa, Loyal Sky Bison", "Legendary Creature — Bison Ally", "{4}{W}{W}", 6, "c-appa-loyal.jpg", 1),
];
const AV = [
  r("ava", "Avabruck Caretaker // Hollowhenge Huntmaster", "Creature — Human Werewolf", "{4}{G}{G}", 6, "c-avabruck-caretaker.jpg", 1),
  r("aaang", "Avatar Aang", "Legendary Creature — Human Avatar Ally", "{R}{G}{W}{U}", 4, "c-avatar-aang.jpg", 0),
  r("aven", "Avenger of Zendikar", "Creature — Elemental", "{5}{G}{G}", 7, "c-avenger-of-zendikar.jpg", 3),
  r("aang2", "Aang, Swift Savior", "Legendary Creature — Human Avatar Ally", "{1}{W}{U}", 3, "c-aang-swift-savior.jpg", 1),
];
const ROWS = [
  { id: "l1", rawName: "Aang, Swift Saviour", quantity: 1, sourceLine: 34 },
  { id: "l2", rawName: "Sol Rnig", quantity: 1, sourceLine: 57 },
];
const ROWS_AV = [
  { id: "l3", rawName: "Avabruck Caretaker / Hollowhenge Huntmaster", quantity: 1, sourceLine: 12 },
];
const mix = { cells: {} } as any;
const jobs: [string, any[], any, any][] = [
  ["shipped", ROWS, { results: AANG, query: "aang", v: "shipped" }, "l1"],
  ["p1", ROWS, { results: AANG, query: "aang", v: "p1" }, "l1"],
  ["p1-press0", ROWS, { results: AANG, query: "aang", v: "p1", press: 0 }, "l1"],
  ["p1-press2", ROWS, { results: AANG, query: "aang", v: "p1", press: 2 }, "l1"],
  ["p1-after", [ROWS[1]], { results: AANG, query: "aang", v: "p1" }, null],
  ["shipped-av", ROWS_AV, { results: AV, query: "av", v: "shipped" }, "l3"],
  ["p1-av", ROWS_AV, { results: AV, query: "av", v: "p1" }, "l3"],
  ["p1-none", ROWS, { results: [], query: "aang swift saviour", v: "p1" }, "l1"],
];
for (const [k, rows, fx, exp] of jobs) {
  (globalThis as any).__fx = fx; (globalThis as any).__expand = exp ?? undefined;
  (globalThis as any).__note = k === "p1-after" ? { kind: "resolve", text: deckImportCopy.resolve.resolvedMobile("Aang, Swift Savior", "97") } : undefined;
  const html = renderToString(
    <div className="px-[16px] md:px-[30px] pt-[14px]">
      <UnresolvedGroup mix={mix} deckId="d" bodySize={99} rows={rows} cards={[]} deckOracleIds={[]} commanderOracleId="ghalta" />
    </div>);
  writeFileSync(`gen/ri-${k}.html`, html);
}
