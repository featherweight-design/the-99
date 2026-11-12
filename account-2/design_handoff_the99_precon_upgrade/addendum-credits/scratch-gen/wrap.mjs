import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { page } from "./page.mjs";
for (const f of readdirSync(".").filter((f) => f.startsWith("up-") && f.endsWith(".html"))) {
  for (const [dev, bg, w, h] of [["phone", "bg-phone.png", 390, 844], ["desk", "bg-desk.png", 1300, 860]]) {
    const body = `<div style="position:fixed;inset:0;background:url(${bg}) 0 0/${w}px ${h}px no-repeat"></div>${readFileSync(f, "utf8")}`;
    writeFileSync(`p-${dev}-${f}`, page(body, "amonkhet"));
  }
}
