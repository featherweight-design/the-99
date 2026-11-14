import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { page } from "./page.mjs";
// The expander sits in the deck column, under the last rows of the list; the quick-add dock unmounts while it is open.
for (const f of readdirSync(".").filter((f) => f.startsWith("ri-") && f.endsWith(".html"))) {
  for (const w of [390, 375]) {
    const list = `<div style="height:76px;background:url(bg.webp) 0 -454px/${w}px auto no-repeat"></div>`;
    const tab = `<div style="height:74px;background:url(bg.webp) 0 100%/${w}px auto no-repeat var(--bg);z-index:30"></div>`;
    writeFileSync(`p${w}-${f}`, page(`${list}${readFileSync(f, "utf8")}<div style="height:20px"></div>${tab}`, "amonkhet"));
  }
  writeFileSync(`d-${f}`, page(`<div style="max-width:1000px">${readFileSync(f, "utf8")}</div>`, "amonkhet"));
}
