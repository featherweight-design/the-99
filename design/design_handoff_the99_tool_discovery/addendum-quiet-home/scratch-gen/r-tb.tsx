import { writeFileSync } from "node:fs";
import { home } from "./fix";
const G = globalThis as any;
G.__ANY = true;
for (const vw of [1300, 1180]) writeFileSync(`dz/frames/tb-prop-${vw}.html`, home({ vw, busy: false, table: true }));
console.log("ok");
