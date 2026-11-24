import { chromium } from "playwright"; import { readFileSync } from "node:fs";
const specs = JSON.parse(readFileSync("specs.json", "utf8")).filter((s) => !s.click);
const b = await chromium.launch(); const out = {};
for (const tree of ["base", "prop"]) for (const s of specs) {
  const p = await b.newPage({ viewport: { width: s.w, height: s.h } });
  await p.goto(`http://localhost:8765/${tree}-${s.id}.html`); await p.waitForTimeout(700);
  await p.evaluate(() => document.querySelector("[data-testid=first-roll] > button")?.click()); await p.waitForTimeout(400);
  out[tree + "-" + s.id] = await p.evaluate(() => { const row = document.querySelector('[data-testid=tracker-panel][data-seat="0"] [data-testid=panel-badges]'); const R = row.getBoundingClientRect();
    const kids = [...row.querySelectorAll(":scope > [data-testid=panel-badge]")]; const whole = kids.filter((e) => { const r = e.getBoundingClientRect(); return r.right <= R.right + 2 && r.bottom <= R.bottom + 2; });
    const name = document.querySelector('[data-testid=tracker-panel][data-seat="0"] [data-testid=panel-name]'); return { all: kids.length, whole: whole.length, more: row.querySelector(":scope > [data-testid=panel-badge-more]")?.textContent ?? null, nameClipped: name.scrollWidth > name.clientWidth }; });
  await p.close();
}
console.log(JSON.stringify(out)); await b.close();
