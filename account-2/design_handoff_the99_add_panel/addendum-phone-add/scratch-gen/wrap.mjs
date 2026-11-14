import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { page } from "./page.mjs";
for (const f of readdirSync(".").filter((f) => f.startsWith("qa-") && f.endsWith(".html"))) {
  for (const w of [390, 375]) {
    const body = `<div style="position:fixed;inset:0;background:url(bg.webp) 0 100%/${w}px auto no-repeat var(--bg)"></div><style>[data-dock]{position:fixed!important;left:0;right:0;bottom:74px!important}</style>${readFileSync(f, "utf8")}`;
    writeFileSync(`p${w}-${f}`, page(body, "amonkhet"));
  }
}
