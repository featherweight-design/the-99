import { chromium } from "playwright"; import { writeFileSync, mkdirSync } from "node:fs"; import { page } from "./page.mjs"; import { SEATS, LOG } from "./fix.mjs";
// node motion.mjs <prefix> <v> <kind coin|d20|d6> <times csv> [reduce]
const [pre, v, kind, times, motion = "no-preference", W = "1180", H = "820"] = process.argv.slice(2);
const G = process.cwd(); mkdirSync(G + "/out/" + (process.env.OUTD ?? "motion"), { recursive: true });
const fix = { seats: [SEATS.you, SEATS.colin, SEATS.peter, SEATS.max], log: LOG, layout: +W < 600 ? "phone-4-sides" : "tablet-4" };
writeFileSync(`${G}/out/m-${pre}.html`, page({ fix, css: v === "1" ? "app.css" : "app2.css", js: v === "1" ? "app.js" : "app2.js" }));
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--allow-file-access-from-files", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const label = { coin: "Flip a coin", d20: /d20|20/i, d6: /d6|six/i }[kind];
for (const t of times.split(",").map(Number)) {
  const p = await b.newPage({ viewport: { width: +W, height: +H }, screen: { width: +W, height: +H }, deviceScaleFactor: 2, reducedMotion: motion, hasTouch: true });
  await p.addInitScript((r) => { crypto.getRandomValues = (a) => { a[0] = r; return a; }; }, +(process.env.RES ?? 1));
  p.on("pageerror", (e) => console.log("ERR", e.message));
  await p.goto(`file://${G}/out/m-${pre}.html`); await p.waitForTimeout(700);
  await p.locator('[data-testid="strip-dice"]').click(); await p.waitForTimeout(kind === "coin" ? 300 : 2500);
  const item = p.locator('[data-testid="dice-menu"] button').filter({ hasText: kind === "coin" ? "Coin" : kind === "d20" ? "20" : "6" }).first();
  if (kind === "coin" && t >= 0) {
    await item.click();
    await p.evaluate((t) => { for (const a of document.getAnimations()) { a.pause(); a.currentTime = t; } }, t);
    await p.waitForTimeout(60);
  } else {
    await item.click(); await p.waitForTimeout(Math.abs(t));
  }
  const full = process.env.FULL === "1";
  const cx = +W / 2, cy = +H * 0.38;
  await p.screenshot({ path: `${G}/out/${process.env.OUTD ?? "motion"}/${pre}-${String(Math.abs(t)).padStart(4, "0")}.png`, clip: full ? undefined : { x: cx - 170, y: cy - 190, width: 340, height: 340 } });
  await p.close(); console.log(pre, t);
}
await b.close();
