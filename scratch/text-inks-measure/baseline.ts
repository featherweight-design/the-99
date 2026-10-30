import { readFileSync } from "node:fs";
import { contrast, chroma, hueOk, deltaEOk, oklab } from "./color.ts";
import { parseThemeBlocks } from "./parse-css.ts";
const T = parseThemeBlocks(readFileSync("/home/claude/the-99/src/app/globals.css","utf8"));
const G = ["bg","surface","surface-raised","surface-sunken","surface-rail","elevated"];
for (const [n,t] of T) {
  const row=(k:string)=>G.map(g=>contrast(t.get(k)!,t.get(g)!).toFixed(2)).join(" ");
  console.log(n.padEnd(9), "accent", t.get("accent"), row("accent"));
  console.log(" ".repeat(9),"hover ", t.get("accent-hover"), row("accent-hover"));
  console.log(" ".repeat(9),"faint ", t.get("fg-faint"), row("fg-faint"));
  console.log(" ".repeat(9),"muted ", t.get("fg-muted"), row("fg-muted"));
  console.log(" ".repeat(9),"locked", t.get("fg-locked"), "placeholder", t.get("fg-placeholder"), "inset", t.get("surface-inset"), "elev-hover", t.get("elevated-hover"));
}
