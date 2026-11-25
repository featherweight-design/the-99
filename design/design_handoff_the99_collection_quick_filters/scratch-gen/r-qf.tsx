import { writeFileSync, mkdirSync } from "node:fs";
import { shell } from "./shell";
import { CollectionPlaceHead } from "../src/components/collection/collection-place-head";
import { CollectionBrowser } from "../src/components/collection/browser";
import { CardDetailProvider } from "../src/components/cards/card-detail-provider";
import { ZoneProvider } from "../src/components/zone-context";
mkdirSync("dz/frames", { recursive: true });
const G = globalThis as any;
const c = (oracleId: string, name: string, img: string, ci: string[], typeLine: string, rarity: any, over: any = {}) => ({
  oracleId, name, quantity: 1, colorIdentity: ci, typeLine, setCodes: ["CMM"], setCounts: [["CMM", 1]], primarySetCode: "CMM",
  rarity, cmc: 3, manaCost: null, oracleText: null, keywords: [], imageUri: `art/c-${img}.jpg`, printedName: null, layout: "normal", ...over,
});
const CARDS: any[] = [
  c("o21", "Sai, Master Thopterist", "sai", ["U"], "Legendary Creature — Human Artificer", "rare"),
  c("o22", "Dina, Essence Brewer", "dina", ["B","G"], "Legendary Creature — Dryad Druid", "mythic"),
  c("o23", "Doctor Doom, King of Latveria", "doom", ["U","B","R"], "Legendary Creature — Human Noble Villain", "mythic"),
  c("o24", "Ghalta, Primal Hunger", "ghalta", ["G"], "Legendary Creature — Elder Dinosaur", "rare"),
  c("o25", "Zimone, Infinite Analyst", "zimone", ["G","U"], "Legendary Creature — Human Wizard", "mythic"),
  c("o1", "Mystical Tutor", "mystical-tutor", ["U"], "Instant", "uncommon", { facts: ["gameChanger", "tutor"] }),
  c("o2", "Avenger of Zendikar", "avenger-of-zendikar", ["G"], "Creature — Elemental", "mythic"),
  c("o3", "Bloodline Keeper", "bloodline-keeper", ["B"], "Creature — Vampire", "rare"),
  c("o5", "All Is Dust", "all-is-dust", [], "Tribal Sorcery — Eldrazi", "mythic"),
  c("o7", "Heartless Act", "heartless-act", ["B"], "Instant", "uncommon"),
  c("o9", "Cemetery Prowler", "cemetery-prowler", ["G"], "Creature — Wolf", "mythic"),
  c("o19", "Avatar Aang", "avatar-aang", ["W","U","B","R","G"], "Legendary Creature — Human Avatar", "mythic", { comboPartner: { oracleId: "o16", name: "Searing Touch" } }),
  c("o20", "Polyraptor", "polyraptor", ["G"], "Creature — Dinosaur", "mythic"),
  c("o13", "Brudiclad, Telchor Engineer", "brudiclad", ["U","R"], "Legendary Artifact Creature", "mythic"),
  c("o16", "Searing Touch", "searing-touch", ["R"], "Instant", "common", { comboPartner: { oracleId: "o19", name: "Avatar Aang" } }),
  c("o17", "Assimilation Aegis", "assimilation-aegis", ["W","U"], "Artifact — Equipment", "mythic"),
  c("o18", "All Will Be One", "all-will-be-one", ["R"], "Enchantment", "mythic"),
];
const fad = { hasDeck: true, closed: false, illegal: [] } as any;
function page(search: string, closed = false) {
  return (
    <ZoneProvider zone="America/Denver">
      <CollectionPlaceHead stats={{ totalCards: 1842, uniqueCards: 1203 }} lastUpdatedLabel="Updated 2 days ago" editEnabled historyHasEntries wishlistEnabled />
      <CardDetailProvider fetchCard={async () => null}>
        <CollectionBrowser cards={CARDS} ownedSets={[{ code: "CMM", name: "Commander Masters", releasedAt: "2023-08-04" } as any]} availabilityOk findADeck={{ ...fad, closed }} viewHint={{ stored: null, wide: G.__VW >= 768 }} />
      </CardDetailProvider>
    </ZoneProvider>
  );
}
for (const dev of ["p", "d"] as const) {
  G.__VW = dev === "d" ? 1300 : 390;
  for (const [id, q, closed] of [["all", "", false], ["closed", "", true], ["free", "avail=free", false], ["combo", "", true]] as const) {
    G.__SEARCH = q;
    writeFileSync(`dz/frames/${dev}-${id}.html`, shell(page(q, closed), "/collection"));
  }
}
console.log("ok");
