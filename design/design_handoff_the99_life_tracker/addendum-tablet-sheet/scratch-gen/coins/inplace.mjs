// node coins/inplace.mjs (from gen/): each option thrown on the tablet table (1180x820), at 450 ms and landed (1150 ms).
import { chromium } from "playwright"; import { writeFileSync } from "node:fs"; import { page } from "../page.mjs"; import { SEATS, LOG } from "../fix.mjs"; import { face, OPTIONS } from "./faces.mjs";
const G = process.cwd(), O = G + "/coins/out";
const PH = process.env.PHONE === "1", VW = PH ? 390 : 1180, VH = PH ? 844 : 820;
const fix = { seats: [SEATS.you, SEATS.colin, SEATS.peter, SEATS.max], log: LOG, layout: PH ? "phone-4-sides" : "tablet-4" };
writeFileSync(`${G}/out/m-coins.html`, page({ fix, css: "app2.css", js: "app2.js" }));
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--allow-file-access-from-files"] });
for (const opt of (process.env.OPT ? [process.env.OPT] : Object.keys(OPTIONS))) for (const [res, t, tag] of [[0, 450, "mid"], [0, 1150, "heads"], [1, 1150, "tails"]]) {
  const p = await b.newPage({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, hasTouch: true });
  await p.addInitScript((r) => { crypto.getRandomValues = (a) => { a[0] = r; return a; }; }, res);
  await p.goto(`file://${G}/out/m-coins.html`); await p.waitForTimeout(700);
  await p.locator('[data-testid="strip-dice"]').click(); await p.waitForTimeout(300);
  await p.locator('[data-testid="dice-menu"] button').filter({ hasText: "Coin" }).first().click();
  await p.evaluate(([h, tl, t]) => {
    document.querySelector(".coin-face-front").innerHTML = h; document.querySelector(".coin-face-back").innerHTML = tl;
    for (const a of document.getAnimations()) { a.pause(); a.currentTime = t; }
  }, [face(opt, "heads"), face(opt, "tails"), t]);
  await p.waitForTimeout(t >= 1150 ? 1300 : 120);
  if (t >= 1150) await p.evaluate(() => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = 1150; } });
  await p.waitForTimeout(100);
  await p.screenshot({ path: `${O}/${PH ? "phone" : "place"}-${opt}-${tag}.png`, clip: PH ? { x: 45, y: 171, width: 300, height: 300 } : tag === "mid" ? { x: 420, y: 70, width: 340, height: 340 } : { x: 290, y: 60, width: 600, height: 520 } });
  console.log(opt, tag); await p.close();
}
await b.close();
