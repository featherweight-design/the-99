import { writeFileSync } from "node:fs";
import { R } from "./render";
import { CommanderRow as Old } from "./proposal/row-shipped";
import { CommanderRow as New } from "./proposal/row-new";
const v = (o: any) => ({ slug: "x", colorIdentity: ["G"], rank: 1, gapSlot: { kind: "unplayed", labels: ["Ramp", "Landfall", "Tokens"] }, measurableTotal: 100, fitPool: 12, fitRoles: 20, fitSynergy: 26, priceOk: true, href: "/commanders/x", ...o });
const ROWS = [
  v({ name: "Zimone, Infinite Analyst", colorIdentity: ["G", "U"], artCropUri: "art/crop-zimone.jpg", prose: "Zimone decks grow +1/+1 counters fast and turn a big hand of lands into card draw.", score: 71, deckCount: 4_812, price: { kind: "priced", cents: 340 } }),
  v({ name: "Ghalta, Primal Hunger", artCropUri: "art/crop-ghalta.jpg", prose: "Ghalta decks drop huge creatures early, then trample over the table.", score: 64, deckCount: 18_204, price: { kind: "priced", cents: 14200 } }),
  v({ name: "Rootha, Mercurial Artist", colorIdentity: ["U", "R"], artCropUri: "art/crop-rootha.jpg", prose: "Rootha decks copy instants and sorceries and fill the board with Elementals.", score: 52, deckCount: 2_390, price: { kind: "notStocked" } }),
  v({ name: "Sai, Master Thopterist", colorIdentity: ["U"], artCropUri: "art/crop-sai.jpg", prose: "Sai decks cast artifacts to make Thopters, then sacrifice them for cards.", score: 48, deckCount: null, price: { kind: "priced", cents: 125 } }),
];
const list = (Row: any, w: number) => <div style={{ width: w, background: "var(--bg)" }}>{ROWS.map((r, i) => <Row key={i} item={r} position={i} onHide={() => {}} />)}</div>;
writeFileSync("hero/r-shipped-p.html", R(list(Old, 390), "/discover"));
writeFileSync("hero/r-shipped-d.html", R(list(Old, 820), "/discover"));
writeFileSync("hero/r-new-p.html", R(list(New, 390), "/discover"));
writeFileSync("hero/r-new-d.html", R(list(New, 820), "/discover"));
(globalThis as any).__MARK = true;
writeFileSync("hero/r-mark-p.html", R(list(New, 390), "/discover"));
writeFileSync("hero/r-mark-d.html", R(list(New, 820), "/discover"));
console.log("rows ok");
