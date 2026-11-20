import { chromium } from "playwright"; import { readFileSync, writeFileSync, mkdirSync } from "node:fs"; import { page } from "./page.mjs";
const frames = JSON.parse(readFileSync("dz/frames.json", "utf8")); mkdirSync("out/shots", { recursive: true });
const only = process.argv[2] ? new RegExp(process.argv[2]) : null; const scale = +(process.env.SCALE ?? 2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
for (const f of frames) {
  if (only && !only.test(f.id)) continue;
  writeFileSync(`out/${f.id}.html`, page((f.bg ? `<div aria-hidden style="position:fixed;inset:0;background:url(art/${f.dev === "phone" ? "p-collection" : "d-collection2"}.webp) top left/${f.dev === "phone" ? 390 : 1300}px auto no-repeat"></div>` : "") + readFileSync(`dz/frames/${f.id}.html`, "utf8"), "kamigawa"));
  const w = f.dev === "phone" ? 390 : 1300;
  const p = await b.newPage({ viewport: { width: w, height: f.vh ?? 844 }, deviceScaleFactor: scale, reducedMotion: "reduce" });
  await p.goto("file://" + process.cwd() + `/out/${f.id}.html`); await p.waitForTimeout(500);
  if (f.scroll) await p.evaluate(({ s, phone }) => {
    const vis = (el) => el && el.getClientRects().length > 0 && getComputedStyle(el).display !== "none";
    const trig = [...document.querySelectorAll("button[aria-expanded], div")].filter((el) => vis(el) && /^Set/.test(el.textContent?.trim() ?? "") && (el.tagName === "BUTTON" || el.children.length <= 3) && el.textContent.length < 120);
    const t = trig.find((el) => el.tagName === "BUTTON") ?? trig[trig.length - 1];
    if (!t) return;
    let sc = t.parentElement; while (sc && !(sc.scrollHeight > sc.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
    if (!sc) return;
    const off = t.getBoundingClientRect().top - sc.getBoundingClientRect().top;
    sc.scrollTop += off - (s === "set" ? (phone ? 260 : 120) : (phone ? 8 : 4));
  }, { s: f.scroll, phone: f.dev === "phone" });
  await p.waitForTimeout(150);
  await p.screenshot({ path: `out/shots/${f.id}.png` }); await p.close(); console.log(f.id);
}
await b.close();
