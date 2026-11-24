import { chromium } from "playwright"; import { readFileSync } from "node:fs";
const specs = JSON.parse(readFileSync("specs.json", "utf8")).filter((s) => !s.click);
import { existsSync, readFileSync as rf } from "node:fs";
const MIME = { html: "text/html", js: "text/javascript", css: "text/css", svg: "image/svg+xml", jpg: "image/jpeg", webp: "image/webp", png: "image/png", woff2: "font/woff2" };
const serveLocal = (p) => p.route("http://app.local/**", (r) => { const path = "/home/user/work/out" + decodeURIComponent(new URL(r.request().url()).pathname); if (!existsSync(path)) return r.fulfill({ status: 404, body: "" }); r.fulfill({ status: 200, contentType: MIME[path.split(".").pop()] ?? "application/octet-stream", body: rf(path) }); });
const b = await chromium.launch(); const out = {};
for (const tree of ["base", "prop"]) for (const s of specs) {
  const p = await b.newPage({ viewport: { width: s.w, height: s.h } });
  await serveLocal(p); await p.goto(`http://app.local/${tree}-${s.id}.html`); await p.waitForTimeout(700);
  await p.evaluate(() => document.querySelector("[data-testid=first-roll] > button")?.click()); await p.waitForTimeout(400);
  out[tree + "-" + s.id] = await p.evaluate(() => { const row = document.querySelector('[data-testid=tracker-panel][data-seat="0"] [data-testid=panel-badges]'); const R = row.getBoundingClientRect();
    const kids = [...row.querySelectorAll(":scope > [data-testid=panel-badge]")]; const whole = kids.filter((e) => { const r = e.getBoundingClientRect(); return r.right <= R.right + 2 && r.bottom <= R.bottom + 2; });
    const name = document.querySelector('[data-testid=tracker-panel][data-seat="0"] [data-testid=panel-name]'); return { all: kids.length, whole: whole.length, more: row.querySelector(":scope > [data-testid=panel-badge-more]")?.textContent ?? null, nameClipped: name.scrollWidth > name.clientWidth }; });
  await p.close();
}
console.log(JSON.stringify(out)); await b.close();
