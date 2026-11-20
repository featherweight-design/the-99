import { writeFileSync, mkdirSync } from "node:fs";
import { R } from "./base";
import { CreatePreFilled } from "../src/components/decks/create-pre-filled";
import { CommanderDetail } from "../src/components/commanders/detail";
mkdirSync("out",{recursive:true});
writeFileSync("out/np.html", R(<CreatePreFilled oracleId="g" name="Ghalta, Primal Hunger" typeLine="Legendary Creature — Elder Dinosaur" colorIdentity={["G"]} imageUri="art/c-ghalta.jpg" />));
const c: any = { oracleId: "g", roleBasis: "classifier", roleTargets: { of: "flat", targets: { ramp: 10, draw: 10, removal: 8, wipes: 3 } }, name: "Ghalta, Primal Hunger", colorIdentity: ["G"], imageUri: "art/c-ghalta.jpg", artCropUri: "art/a-ghalta.jpg", typeLine: "Legendary Creature — Elder Dinosaur", oracleText: "This spell costs {X} less to cast, where X is the total power of creatures you control.\nTrample", manaCost: "{10}{G}{G}", colorPoolSize: 412, edhrecOwnedCount: 38, edhrecTotal: 100, roleCounts: { ramp: 9, draw: 6, removal: 5, wipes: 1 }, roleGaps: [], roleCards: { ramp: [], draw: [], removal: [], wipes: [] }, overlapOwned: [], overlapOwnedIds: [], fitPool: 30, fitRoles: 24, fitSynergy: 33, score: 87, measurableTotal: 100, rankScore: 87, slug: "ghalta-primal-hunger", synergyState: "ok", committedSupport: { count: 0, topDeck: null } };
writeFileSync("out/cp.html", R(<CommanderDetail hidden={false} commander={c} rank={3} isBestFit={false} synergyCards={[]} newestAsOf={null} avail="all" prose="Ghalta decks flood the board with big creatures, so Ghalta herself costs two mana by turn four and tramples over for twelve." />, "/commanders/ghalta-primal-hunger"));
console.log("ok");
