import { readFileSync, writeFileSync } from "node:fs";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { requireBranch } from "./lib/require-branch.mjs";
import { renderCard } from "../src/lib/labels/prompt";
neonConfig.webSocketConstructor = ws;
const S = process.env.MODEL_TEST_DIR!;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const EX = ["Howling Mine","Rites of Flourishing","Winter, Misanthropic Guide","Innocuous Researcher","Yurlok of Scorch Thrash","Windfall","Syphon Mind","Rhystic Study","Heroes' Reunion","Ghostly Prison","Propaganda","Dense Foliage","Enduring Angel","Empyrial Archangel","Sandwurm Convergence","Promise of Loyalty","Dawnstrider","Spike Weaver","Sunstone","Deft Duelist","Mana Tithe","Nyxbloom Ancient","Mana Reflection","Seedborn Muse","Timeless Lotus","Savage Ventmaw","Avatar Roku","Irencrag Feat","Geosurge","Su-Chi Cave Guard","Overgrowth","Extraplanar Lens","Rude Awakening","Bear Umbra","Karametra's Acolyte","Topiary Lecturer","Harabaz Druid","Heronblade Elite","Mona Lisa","Marwyn","Cradle Clearcutter","Rainveil Rejuvenator","Arbor Adherent","Faeburrow Elder","Bloom Tender","White Lotus Tile","Immortus","Accomplished Alchemist","Redshift","Séance Board","Rotating Fireplace","The Eternity Elevator","Somberwald Sage","Master of Dark Rites","Expropriate","Coercive Portal","Tivit","Combustible Gearhulk","Palantír of Orthanc","Rootweaver Druid","Tenuous Truce","Intuition","Epiphany at the Drownyard","Ecological Appreciation","Realms Uncharted","Forgotten Lore","Choice of Damnations","Truth or Tale","Crown-Hunter Hireling","Champions of Minas Tirith","Knight Rampager"];
async function main() {
await requireBranch(process.env.DATABASE_URL, "mlc3-export");
const rows = (await pool.query(`select c.oracle_id as "oracleId", c.name, c.mana_cost, c.type_line, c.oracle_text, c.layout, j.themes from cards c join judged_labels j on j.oracle_id=c.oracle_id and j.prompt_version='j3'`)).rows
  .filter((r: any) => !EX.some((e) => r.name === e || r.name.startsWith(e + " //")));
console.log("cards", rows.length, "excluded examples");
let seed = 20261121; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const sh = rows.map((r: any, i: number) => ({ r, k: rnd() }));
sh.sort((a: any, b: any) => a.k - b.k);
const key = sh.map((x: any, i: number) => ({ n: i + 1, name: x.r.name, themes: x.r.themes }));
writeFileSync(`${S}/mlc3-key.json`, JSON.stringify(key));
writeFileSync(`${S}/mlc3-sheet.md`, sh.map((x: any, i: number) => `#${i + 1}\n${x.r.name}\n${renderCard({ ...x.r }).replace(/^.*?\n/, "")}`).join("\n\n"));
writeFileSync(`${S}/mlc3-cards.json`, JSON.stringify(sh.map((x: any, i: number) => ({ n: i + 1, ...x.r }))));
console.log("pass1 positives", Object.fromEntries(["groupHug","pillowFort","bigMana","politics"].map(t=>[t,key.filter((k:any)=>k.themes.includes(t)).length])));
await pool.end();
}
main().catch((e) => { console.error(e); process.exit(1); });
