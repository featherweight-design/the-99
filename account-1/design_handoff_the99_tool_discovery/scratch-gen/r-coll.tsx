// Finding the tools (account 1, 2026-11-23): /collection with the Find a deck call-out, filter and tile presses.
import { writeFileSync } from "node:fs";
import { shell, W } from "./shell";
import { CollectionPlaceHead } from "../src/components/collection/collection-place-head";
import { FilterBar } from "../src/components/collection/filter-bar";
import { GridView } from "../src/components/collection/grid-view";
import { RowsView } from "../src/components/collection/rows-view";
import { CardDetailContext } from "../src/components/cards/card-detail-context";
import { collectionChips } from "../src/lib/collection/chips";
import { collectionChassisCopy } from "../src/lib/copy/collection";
import { availabilityLabel } from "../src/lib/collection/availability-filter";
import { projected } from "../src/lib/demo/projected";
import { FindCallout, FindFilter, FitPress, FitButton, FitRowButton, FitsSheet } from "./find";
const G = globalThis as any;
const CTX: any = new Proxy({}, { get: (_t, k) => (k === "then" ? undefined : () => undefined) });
const P: any = projected();
const base = P.collection.cards.find((c: any) => c.availability?.free > 0 && c.availability.hard === 0);
const FREE = { owned: 1, hard: 0, soft: 0, free: 1, claims: [] };
const inUse = (deck: string) => ({ owned: 1, hard: 1, soft: 0, free: 0, claims: [{ ...P.collection.cards[0].availability.claims[0], name: deck, pending: false }] });
// [slug, name, colors, typeLine, free?]
const ROWS: [string, string, string[], string, boolean][] = ([
  ["killian", "Killian, Decisive Mentor", ["W", "B"], "Legendary Creature — Human Warlock", true],
  ["lathliss", "Lathliss, Dragon Queen", ["R"], "Legendary Creature — Dragon", true],
  ["zimone", "Zimone, Infinite Analyst", ["G", "U"], "Legendary Creature — Human Wizard", false],
  ["polyraptor", "Polyraptor", ["G"], "Creature — Dinosaur", true],
  ["jace", "Jace, Multiverse Architect", ["U"], "Legendary Planeswalker — Jace", true],
  ["gisa", "Ghoulcaller Gisa", ["B"], "Legendary Creature — Human Wizard", true],
  ["mothman", "The Wise Mothman", ["B", "G", "U"], "Legendary Creature — Insect Mutant", false],
  ["tam", "Tam, the Possibility", ["G", "U"], "Legendary Creature — Gorgon Wizard", true],
  ["muddle", "Muddle, the Ever-Changing", ["G", "U"], "Legendary Creature — Elemental Shapeshifter", true],
  ["invisible-woman", "Invisible Woman", ["W", "U"], "Legendary Creature — Human Hero", true],
  ["heroes", "Heroes in a Half Shell", ["G", "U", "W"], "Legendary Creature — Mutant Ninja Turtle", true],
  ["captain-america", "Captain America, Team Leader", ["R", "W"], "Legendary Creature — Human Soldier Hero", false],
  ["quintorius", "Quintorius, History Chaser", ["R", "W"], "Legendary Planeswalker — Quintorius", true],
  ["auntie-ool", "Auntie Ool, Cursewretch", ["B", "R", "G"], "Legendary Creature — Goblin Warlock", true],
  ["miku", "Miku, Song of the People", ["G", "W"], "Legendary Creature — Dryad", true],
  ["zada", "Zada, Hedron Grinder", ["R"], "Legendary Creature — Goblin Ally", false],
  ["card-sai", "Sai, Master Thopterist", ["U"], "Legendary Creature — Human Artificer", true],
  ["tchalla", "T’Challa, the Black Panther", ["G", "W"], "Legendary Creature — Human Noble Hero", true],
] as [string, string, string[], string, boolean][]).sort((x, y) => x[1].localeCompare(y[1]));
const card = ([slug, name, ci, type, free]: (typeof ROWS)[number]) => ({
  ...base, oracleId: "o-" + slug, name, printedName: null, colorIdentity: ci, typeLine: type, imageUri: `art/c-${slug}.jpg`,
  quantity: 1, foil: null, facts: [], comboPartner: null, price: null,
  availability: free ? FREE : inUse(slug === "zimone" ? "Lanternlight Tinkers" : "Ashen Banner Parade"),
});
const ALL = ROWS.map(card);
const FREEONLY = ROWS.filter((r) => r[4]).map(card);
const TOTAL = 2926, NFREE = 212;
const filters0 = { search: "", colors: [], types: [], setCodes: [], availability: [] as string[] };
const availOpts = (["free", "soft", "hard", "over"] as const).map((code) => ({ code, label: availabilityLabel(code as any), count: code === "free" ? NFREE : code === "hard" ? 2701 : code === "soft" ? 13 : 0, disabled: code === "over" }));
function bar(on: boolean, rows = false) {
  const f: any = { ...filters0, availability: on ? ["free"] : [] };
  const chips = collectionChips(f, { types: [], sets: [], availability: availOpts.map((o) => ({ code: o.code, label: o.label })) as any }) as any;
  const shown = on ? NFREE : TOTAL;
  return (
    <FilterBar filters={f} sort={"name" as any} sortDirection={"asc" as any} view={(rows ? "rows" : "grid") as any} setOptions={[]} typeOptions={[]} availabilityOptions={availOpts as any}
      colorOptions={["W", "U", "B", "R", "G"].map((code) => ({ code, label: code, count: 400, disabled: false }))} shown={shown} total={TOTAL} availabilityOk
      chips={chips.map((c: any) => ({ ...c, onRemove: () => {} }))} onClearAll={() => {}} announcement="" onAnnounce={() => {}} onFiltersChange={() => {}} onSortChange={() => {}} onViewChange={() => {}}
      resultLine={G.__VW >= 1000 ? collectionChassisCopy.result(shown, TOTAL, 4492, on) : collectionChassisCopy.resultCompact(shown)} />
  );
}
export function collection(name: string, o: { dev: "phone" | "desk"; on?: boolean; callout?: boolean; open?: string; sheet?: any; r2?: boolean; rows?: boolean }) {
  G.__VW = o.dev === "desk" ? 1300 : 390;
  G.__FITROW = o.on && o.rows ? (c: any) => <FitRowButton name={c.name} open={o.open === c.oracleId} /> : undefined;
  G.__FIT = o.on ? (c: any) => (o.r2 ? <FitButton name={c.name} open={o.open === c.oracleId} /> : <FitPress name={c.name} open={o.open === c.oracleId} />) : undefined;
  const html = shell(
    <CardDetailContext.Provider value={CTX}>
      <CollectionPlaceHead stats={{ totalCards: 4492, uniqueCards: TOTAL } as any} lastUpdatedLabel="Nov 21" editEnabled historyHasEntries preconPick scan wishlistEnabled {...({} as any)} />
      {bar(!!o.on, !!o.rows)}
      {o.callout !== false ? <div className="px-[14px] md:px-[34px]">{o.r2 ? <div className="mb-[4px]"><FindCallout n={NFREE} on={!!o.on} rows={!!o.rows} /></div> : <><FindCallout n={NFREE} on="r1" /><FindFilter all={TOTAL} n={NFREE} on={!!o.on} /></>}</div> : null}
      {o.rows ? <RowsView cards={(o.on ? FREEONLY : ALL) as any} totalCards={o.on ? NFREE : TOTAL} onShowMore={() => {}} onOpen={() => {}} /> : <GridView cards={(o.on ? FREEONLY : ALL) as any} totalCards={o.on ? NFREE : TOTAL} onOpen={() => {}} />}
    </CardDetailContext.Provider>, "/collection", o.sheet ? W(<CardDetailContext.Provider value={CTX}>{o.sheet}</CardDetailContext.Provider>, "/collection") : null);
  const css = o.r2 ? "" : `<style>div.relative:has(>[class*=bottom-] [data-dz=fit]) [data-collection-tile] .min-w-0.truncate{padding-right:32px}@media(min-width:768px){div.relative:has(>[class*=bottom-] [data-dz=fit]) [data-collection-tile] .min-w-0.truncate{padding-right:40px}}</style>`;
  writeFileSync(`dz/frames/${name}.html`, css + html);
  G.__FIT = undefined; G.__FITROW = undefined; G.__VW = 0;
}
// Find a deck's fixture (the landing demo's), on Killian: one deck fits, four are outside its colors. No read yet.
const f0 = P.fits, r0 = f0.list.read;
const kcard = { ...r0.card, oracleId: "o-killian", name: "Killian, Decisive Mentor", colorIdentity: ["W", "B"], role: "draw" };
const ashen = { ...r0.fits.find((d: any) => d.name === "Ashen Banner Parade"), need: { role: "draw", have: 7, target: 10 } };
const salt = r0.fits.find((d: any) => d.name === "Saltmarsh Reclamation");
const excluded = [{ id: salt.id, name: salt.name, commanders: salt.commanders, outside: ["B"] }, ...r0.excluded.map((e: any) => ({ ...e, outside: ["W", "B"] }))];
const kread = { ...r0, card: kcard, fits: [ashen], holds: [], excluded };
const KCARD: any = { oracleId: "o-killian", name: "Killian, Decisive Mentor", typeLine: "Legendary Creature — Human Warlock", manaCost: "{W}{B}", cmc: 2,
  oracleText: "Whenever an enchantment you control enters, tap up to one target creature and goad it.\nWhenever one or more creatures that are enchanted by an Aura you control attack, draw a card.", keywords: [], rarity: "uncommon",
  colorIdentity: ["W", "B"], imageUri: "art/c-killian.jpg", printedName: null, quantity: 1,
  printings: [{ setCode: "DSC", scryfallId: "k", setName: "Duskmourn Commander", collectorNumber: "4", releasedAt: "2024-09-27", quantity: 1, finishes: { nonfoil: 1 }, imageUri: "art/c-killian.jpg", artCropUri: "art/c-killian.jpg", backImageUri: null, hasOwnBack: false, hasOwnArt: true, flavorName: null }],
  setCodes: ["DSC"], primarySetCode: "DSC", preferredPrinting: null, proxiedBy: [], availability: { owned: 1, hard: 0, soft: 0, free: 1, claims: [] } };
const KILLIAN = { ...f0, cardFull: KCARD, card: { oracleId: "o-killian", colorIdentity: ["W", "B"] }, name: kcard.name, list: { ...f0.list, read: kread },
  panel: { ...f0.panel, fits: kread, candidates: 1, view: { pending: null, stored: null, failed: null }, names: {}, images: {}, commanderIds: {} } };
for (const dev of ["phone", "desk"] as const) {
  const d = dev === "desk" ? "d" : "p";
  collection(`${d}-c0`, { dev });
  collection(`${d}-c1`, { dev, on: true });
  collection(`${d}-c2`, { dev, on: true, open: "o-killian", sheet: <FitsSheet fits={KILLIAN} dev={dev} /> });
  collection(`${d}-r1`, { dev, on: true, r2: true, rows: true });
  collection(`${d}-f0`, { dev, r2: true });
  collection(`${d}-f1`, { dev, on: true, r2: true });
  collection(`${d}-f2`, { dev, on: true, r2: true, open: "o-killian", sheet: <FitsSheet fits={KILLIAN} dev={dev} /> });
}
console.log("ok");
