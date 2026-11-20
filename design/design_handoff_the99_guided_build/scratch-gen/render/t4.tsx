import { writeFileSync } from "node:fs";
import { R } from "./base";
import { CommanderDetail } from "../src/components/commanders/detail";
import { CreatePreFilled } from "../src/components/decks/create-pre-filled";
const A = (n: string) => `art/c-${n}.jpg`;
const c: any = { oracleId: "g", roleBasis: "classifier", roleTargets: { of: "flat", targets: { ramp: 10, draw: 10, removal: 8, wipes: 3 } }, name: "Ghalta, Primal Hunger", colorIdentity: ["G"], imageUri: A("ghalta"), artCropUri: "art/a-ghalta.jpg", typeLine: "Legendary Creature — Elder Dinosaur", oracleText: "", manaCost: "{10}{G}{G}", colorPoolSize: 412, edhrecOwnedCount: 38, edhrecTotal: 100, roleCounts: { ramp: 9, draw: 6, removal: 5, wipes: 1 }, roleGaps: [], roleCards: { ramp: [], draw: [], removal: [], wipes: [] }, overlapOwned: [], overlapOwnedIds: [], fitPool: 30, fitRoles: 24, fitSynergy: 33, score: 87, measurableTotal: 100, rankScore: 87, slug: "ghalta-primal-hunger", synergyState: "ok", committedSupport: { count: 0, topDeck: null } };
const prose = "Ghalta decks flood the board with big creatures, so Ghalta herself costs two mana by turn four and tramples over for twelve.";
const now = new Date("2026-11-20");
const card = (id: string, name: string, typeLine: string, pts: number, pct: number, owned: boolean, img: string, cents: number | null = null): any =>
  ({ oracleId: id, name, typeLine, facet: "creature", inclusionPct: pct, synergyPts: pts, imageUri: A(img), owned, committedTo: null, availability: null, manaCost: null,
     price: cents == null ? null : { cents, foilCents: null, etchedCents: null, asOf: now } });
const syn = [
  card("av", "Avenger of Zendikar", "Creature — Elemental", 41, 52, false, "avenger-of-zendikar", 410),
  card("po", "Polyraptor", "Creature — Dinosaur", 38, 44, true, "polyraptor"),
  card("be", "Beorn the Fierce", "Legendary Creature — Human Bear", 22, 18, true, "beorn"),
  card("cp", "Cemetery Prowler", "Creature — Wolf", 12, 21, true, "cemetery-prowler"),
];
(globalThis as any).__picks = ["av", "po", "be"];
writeFileSync("out/cpk-g.html", R(<CommanderDetail hidden={false} commander={c} rank={3} isBestFit={false} synergyCards={syn} newestAsOf={now} avail="all" prose={prose} guided />, "/commanders/x"));
const picks = [{ name: "Avenger of Zendikar", img: A("avenger-of-zendikar"), owned: false }, { name: "Polyraptor", img: A("polyraptor"), owned: true }, { name: "Beorn the Fierce", img: A("beorn"), owned: true }];
const np = (kind: string) => R(<CreatePreFilled oracleId="g" name="Ghalta, Primal Hunger" typeLine="Legendary Creature — Elder Dinosaur" colorIdentity={["G"]} imageUri={A("ghalta")} typedName="Ghalta Stomps" selectedOracleIds={["av", "po", "be"]} build={{ kind, picks } as any} />);
for (const k of ["free", "guided", "empty"]) writeFileSync(`out/nk-${k}.html`, np(k));
console.log("ok");
