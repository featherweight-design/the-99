// The foil film (foil handoff R1, `design/design_handoff_the99_foil_treatment/`), proved against the BUILT
// stylesheet in a real browser: run `pnpm build` first. jsdom computes no styles, so the component tests
// can only say the ring span carries `data-foil`; this says what that attribute draws, state by state.
// It loads the app's own compiled CSS into a static page holding five tiles in the shipped markup (the
// art's img, then the ring span) and reads computed styles. No server, no database, no sign-in.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";

const chunks = path.join(process.cwd(), ".next/static/chunks");
const css = fs.existsSync(chunks)
  ? fs.readdirSync(chunks).filter((f) => f.endsWith(".css")).find((f) => fs.readFileSync(path.join(chunks, f), "utf8").includes("data-foil"))
  : undefined;
if (!css) throw new Error("No built stylesheet carries the foil rules: run `pnpm build` first.");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "probe-foil-"));
fs.copyFileSync(path.join(chunks, css), path.join(dir, "app.css"));

const img = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="488" height="680"><rect width="488" height="680" fill="#3a4a6a"/></svg>');
const tile = (id, attrs, foil = "foil") =>
  `<button id="${id}" style="display:block;width:180px;padding:0;border:0;background:none"><div class="relative overflow-hidden" style="position:relative;overflow:hidden;aspect-ratio:63/88;border-radius:10px;background:#222">` +
  `<img alt="" ${attrs} style="position:absolute;inset:0;width:100%;height:100%">` +
  `<span aria-hidden="true" data-foil="${foil}" style="pointer-events:none;position:absolute;inset:0;border-radius:inherit"></span></div></button>`;
const html = `<!doctype html><html><head><link rel="stylesheet" href="app.css"></head><body style="display:flex;gap:12px;padding:20px;background:#111">
${tile("nosrc", "")}${tile("pending", `src="${img}" data-arrival="pending"`)}${tile("failed", `src="${img}" data-arrival="failed"`)}
${tile("done", `src="${img}" data-arrival="done"`)}${tile("etched", `src="${img}"`, "etched")}</body></html>`;
fs.writeFileSync(path.join(dir, "page.html"), html);
const url = "file://" + path.join(dir, "page.html");
const browser = await chromium.launch();
let fails = 0;
const check = (name, ok, got) => { console.log(`${ok ? "ok  " : "FAIL"} ${name}${ok ? "" : ` (got ${got})`}`); if (!ok) fails++; };
const op = (page, id) => page.$eval(`#${id} [data-foil]`, (e) => getComputedStyle(e).opacity);
const pseudo = (page, id, which, prop) => page.$eval(`#${id} [data-foil]`, (e, [w, p]) => getComputedStyle(e, w)[p], [which, prop]);

for (const motion of ["no-preference", "reduce"]) {
  const ctx = await browser.newContext({ reducedMotion: motion });
  const page = await ctx.newPage();
  await page.goto(url);
  check(`${motion}: no src holds the film`, (await op(page, "nosrc")) === "0", await op(page, "nosrc"));
  const pend = await op(page, "pending");
  check(`${motion}: pending ${motion === "reduce" ? "draws" : "holds"} the film`, motion === "reduce" ? pend === "1" : pend === "0", pend);
  check(`${motion}: failed holds the film`, (await op(page, "failed")) === "0", await op(page, "failed"));
  check(`${motion}: done draws the film`, (await op(page, "done")) === "1", await op(page, "done"));
  const bg = await pseudo(page, "done", "::before", "backgroundImage");
  check(`${motion}: foil ::before is a gradient`, bg.startsWith("linear-gradient(115deg"), bg);
  const eb = await pseudo(page, "etched", "::before", "backgroundImage");
  check(`${motion}: etched differs from foil`, eb.startsWith("linear-gradient") && eb !== bg, eb);
  await page.hover("#done");
  const anim = await pseudo(page, "done", "::after", "animationName");
  check(`${motion}: hover sweep`, motion === "reduce" ? anim === "none" : anim === "foil-sweep", anim);
  if (motion === "no-preference") {
    const rest = await pseudo(page, "etched", "::after", "animationName");
    check("only the hovered tile sweeps", rest === "none", rest);
    await page.screenshot({ path: path.join(dir, "desktop.png") });
    console.log(`screenshot: ${path.join(dir, "desktop.png")}`);
  }
  await ctx.close();
}
{ // a phone: coarse pointer, no hover: no ::after at all
  const ctx = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(url);
  const c = await pseudo(page, "done", "::after", "content");
  check("phone never creates ::after", c === "none" || c === "normal", c);
  check("phone still draws the film", (await pseudo(page, "done", "::before", "backgroundImage")).startsWith("linear-gradient"), "");
  await ctx.close();
}
for (const [feature, expectShadow] of [["prefers-reduced-transparency", true], ["forced-colors", false]]) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: feature, value: feature === "forced-colors" ? "active" : "reduce" }] });
  await page.goto(url);
  const d = await pseudo(page, "done", "::before", "display");
  check(`${feature}: no gradient`, d === "none", d);
  if (expectShadow) {
    const sh = await page.$eval("#done [data-foil]", (e) => getComputedStyle(e).boxShadow);
    check(`${feature}: 2px inset ring instead`, sh.includes("inset") && sh.includes("2px"), sh);
  }
  await ctx.close();
}
await browser.close();
console.log(fails ? `${fails} failed` : "all passed");
process.exit(fails ? 1 : 0);
