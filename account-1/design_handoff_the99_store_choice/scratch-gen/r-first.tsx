import { writeFileSync } from "node:fs";
import { shell } from "./r-settings";
import { FirstRunChecklist } from "../src/components/home/first-run";
const page = (store: any) => shell(
  <FirstRunChecklist store={store} news friends={{ friends: [], links: [], now: "2026-11-22T19:00:00Z" } as any} commandersPlace />, "/");
writeFileSync("dz/frames/o-mp.html", page("manapool"));
writeFileSync("dz/frames/o-tcg.html", page("tcgplayer"));
console.log("ok");
