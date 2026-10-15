// The foil film (foil handoff R1, `design/design_handoff_the99_foil_treatment/`), proved against the BUILT
// stylesheet in a real browser: run `pnpm build` first. jsdom computes no styles, so the component tests
// can only say the ring span carries `data-foil`; this says what that attribute draws, state by state.
// It loads the app's own compiled CSS into a static page holding five tiles in the shipped markup (the
// art's img, then the ring span) and reads computed styles. No server, no database, no sign-in.
//
// R2 (large views, PR 1) adds the BACKGROUND faces of card details and the zoom (audit G17): a face drawn as a CSS
// background with its film span inside it, the film alone carrying the arrival mark (`FoilFilm`). The face's own
// computed opacity must read 1 whatever the film's mark says, under both motion preferences. And the peek's markup:
// an ArtLayer div carrying the mark, then the film span that reads it as a sibling.
//
// R2 PR 2 adds the TILT HOST (G17): `[data-turning]` pins the centre only without inline values, which beat it (G4), and
// the drop shadow, seam included, draws under reduced motion too (G3).
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
  `<span aria-hidden="true" data-foil="${foil}" class="shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]" style="pointer-events:none;position:absolute;inset:0;border-radius:inherit"></span></div></button>`;
const html = `<!doctype html><html><head><link rel="stylesheet" href="app.css"></head><body style="display:flex;gap:12px;padding:20px;background:#111">
${tile("nosrc", "")}${tile("pending", `src="${img}" data-arrival="pending"`)}${tile("failed", `src="${img}" data-arrival="failed"`)}
${tile("done", `src="${img}" data-arrival="done"`)}${tile("unarmed", `src="${img}"`)}${tile("etched", `src="${img}" data-arrival="done"`, "etched")}</body></html>`;
// R2: a details face (`CardFaces` / the one-faced art box), its film inside it, marked or not.
const face = (id, mark) =>
  `<div id="${id}" class="face" style="position:relative;width:264px;aspect-ratio:63/88;border-radius:12px;background:url('${img}') center/cover">` +
  `<span aria-hidden="true" data-foil="foil" data-foil-size="large" ${mark === null ? "" : `data-arrival="${mark}"`} style="pointer-events:none;position:absolute;inset:0;border-radius:inherit"></span></div>`;
// R2: a phone peek / neighbor plate: the ArtLayer (marked by the modal's queue), then the still tile film.
const peek = (id, mark) =>
  `<button id="${id}" style="position:relative;overflow:hidden;display:block;width:120px;aspect-ratio:63/88;padding:0;border:0;border-radius:11px;background:#222">` +
  `<div data-arrival="${mark}" style="pointer-events:none;position:absolute;inset:0;border-radius:inherit;background:url('${img}') center/cover"></div>` +
  `<span aria-hidden="true" data-foil="foil" data-foil-still="" style="pointer-events:none;position:absolute;inset:0;border-radius:inherit"></span></button>`;
// R2 PR 2: tilt hosts in the shipped markup (`data-tilt` round the art; a seam on a one-faced host).
const tiltHost = (id, attrs = "", style = "") =>
  `<div id="${id}" data-tilt="" ${attrs} style="position:relative;width:180px;aspect-ratio:63/88;border-radius:12px;${style}">` +
  `<div style="position:absolute;inset:0;border-radius:inherit;background:url('${img}') center/cover"></div>` +
  `<span aria-hidden="true" data-glare="" style="pointer-events:none;position:absolute;inset:0;border-radius:inherit"></span></div>`;
const TILTS = tiltHost("tilt-rest", 'data-tilt-seam=""') +
  // Inside a box carrying off-centre values, which it inherits unless the turning rule pins its own.
  `<div style="--tilt-x:.9;--tilt-y:.1;--tilt-lift:1">${tiltHost("tilt-turning", 'data-turning=""')}</div>` +
  tiltHost("tilt-turning-inline", 'data-turning="" data-tilting=""', "--tilt-x:.9;--tilt-y:.1;--tilt-lift:1") +
  tiltHost("tilt-zoom", "").replace('data-tilt=""', 'data-tilt="zoom"');
const FACE_MARKS = [["face-pending", "pending"], ["face-in", "in"], ["face-done", "done"], ["face-failed", "failed"], ["face-unmarked", null]];
// Its own row, wrapped under R1's: in R1's flex row the tiles would shrink to nothing.
const r2 = `<div style="flex-basis:100%;display:flex;flex-wrap:wrap;gap:12px;padding:20px;background:#111">${FACE_MARKS.map(([id, m]) => face(id, m)).join("")}` +
  `${peek("peek-pending", "pending")}${peek("peek-failed", "failed")}${peek("peek-done", "done")}${TILTS}</div>`;
fs.writeFileSync(path.join(dir, "page.html"), html.replace("display:flex;gap:12px", "display:flex;flex-wrap:wrap;gap:12px").replace("</body>", `${r2}</body>`));
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
  check(`${motion}: pending holds the film`, pend === "0", pend);
  check(`${motion}: art the server drew, not yet armed, holds the film`, (await op(page, "unarmed")) === "0", await op(page, "unarmed"));
  check(`${motion}: failed holds the film`, (await op(page, "failed")) === "0", await op(page, "failed"));
  check(`${motion}: done draws the film`, (await op(page, "done")) === "1", await op(page, "done"));
  const bg = await pseudo(page, "done", "::before", "backgroundImage");
  check(`${motion}: foil ::before is a gradient`, bg.startsWith("linear-gradient(115deg"), bg);
  const eb = await pseudo(page, "etched", "::before", "backgroundImage");
  check(`${motion}: etched differs from foil`, eb.startsWith("linear-gradient") && eb !== bg, eb);
  await page.hover("#done");
  const anim = await pseudo(page, "done", "::after", "animationName");
  check(`${motion}: hover sweep`, motion === "reduce" ? anim === "none" : anim === "foil-sweep", anim);
  // R2: the face is never held, only its film (the lock: "the face never waits for the film").
  // The `in` film's one 300ms fade has played out by the time its opacity is read.
  await page.waitForTimeout(500);
  for (const [id, mark] of FACE_MARKS) {
    const faceOp = await page.$eval(`#${id}`, (e) => getComputedStyle(e).opacity);
    check(`${motion}: face with its film ${mark ?? "unmarked"} draws at opacity 1`, faceOp === "1", faceOp);
    const filmOp = await op(page, id);
    const held = mark === "pending" || mark === "failed";
    check(`${motion}: large film ${mark ?? "unmarked"} ${held ? "held" : "drawn"}`, held ? filmOp === "0" : filmOp === "1", filmOp);
  }
  const fadeIn = await page.$eval("#face-in [data-foil]", (e) => getComputedStyle(e).animationName);
  check(`${motion}: a landing face's film ${motion === "reduce" ? "appears unfaded" : "fades in"}`, motion === "reduce" ? fadeIn === "none" : fadeIn === "art-in", fadeIn);
  const large = await page.$eval("#face-done [data-foil]", (e) => {
    const b = getComputedStyle(e, "::before");
    return { opacity: b.opacity, left: b.left, width: e.getBoundingClientRect().width };
  });
  check(`${motion}: large film at 80%`, large.opacity === "0.8", large.opacity);
  check(`${motion}: large film spread 1.5x (25% out each side)`, large.left === `${-0.25 * large.width}px`, large.left);
  check(`${motion}: tile film stays at full strength`, (await pseudo(page, "done", "::before", "opacity")) === "1", "");
  // R2: the peek's film reads its ArtLayer's mark.
  check(`${motion}: peek film held while its layer is pending`, (await op(page, "peek-pending")) === "0", await op(page, "peek-pending"));
  check(`${motion}: peek film held over a failed layer`, (await op(page, "peek-failed")) === "0", await op(page, "peek-failed"));
  check(`${motion}: peek film drawn once its layer is done`, (await op(page, "peek-done")) === "1", await op(page, "peek-done"));
  await page.hover("#peek-done");
  const still = await pseudo(page, "peek-done", "::after", "animationName");
  check(`${motion}: a hovered peek's film stays still`, still === "none", still);
  // R2 PR 2: the tilt host.
  const tiltOf = (id) => page.$eval(`#${id}`, (e) => {
    const c = getComputedStyle(e);
    return { x: c.getPropertyValue("--tilt-x").trim(), lift: c.getPropertyValue("--tilt-lift").trim(), transform: c.transform, shadow: c.boxShadow };
  });
  const atRest = await tiltOf("tilt-rest");
  // G3: the drop shadow and the one-faced seam, whatever the motion preference.
  check(`${motion}: a tilt host draws the card's drop shadow`, atRest.shadow.includes("0px 24px 50px"), atRest.shadow);
  check(`${motion}: a one-faced host keeps its seam in that shadow`, atRest.shadow.includes("0px 0px 0px 1px inset"), atRest.shadow);
  const zoomShadow = (await tiltOf("tilt-zoom")).shadow;
  check(`${motion}: the zoom host draws the zoom's own shadow`, zoomShadow.includes("0px 24px 60px"), zoomShadow);
  if (motion === "reduce") {
    check("reduce: no tilt transform", atRest.transform === "none", atRest.transform);
  } else {
    check("no-preference: a tilt host carries the tilt's perspective transform", atRest.transform.startsWith("matrix3d"), atRest.transform);
    // G4: the turn's rule pins the host to the centre, but only with no inline values on it.
    const turning = await tiltOf("tilt-turning");
    check("no-preference: [data-turning] pins a host with no inline values to the centre, over inherited ones", turning.x === "0.5" && turning.lift === "0", JSON.stringify(turning));
    const inline = await tiltOf("tilt-turning-inline");
    check("no-preference: an inline value beats [data-turning], so a turn must take them off", inline.x === "0.9", JSON.stringify(inline));
    const glare = await page.$eval("#tilt-turning-inline [data-glare]", (e) => getComputedStyle(e).backgroundImage);
    check("no-preference: the light is a radial gradient", glare.startsWith("radial-gradient"), glare);
  }
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
  // R2: a large film on a phone plays one band as it lands, after the card's own entry.
  const band = await page.$eval("#face-done [data-foil]", (e) => {
    const a = getComputedStyle(e, "::after");
    return { name: a.animationName, delay: a.animationDelay, count: a.animationIterationCount };
  });
  check("phone: a large film plays one band on landing", band.name === "foil-sweep" && band.count === "1" && band.delay !== "0s", JSON.stringify(band));
  // The band waits for the art: a film still held (pending) or broken (failed) plays none, so it is never spent unseen.
  for (const id of ["face-pending", "face-failed"]) {
    const held = await page.$eval(`#${id} [data-foil]`, (e) => getComputedStyle(e, "::after").animationName);
    check(`phone: a ${id.slice(5)} film plays no band yet`, held === "none", held);
  }
  const peekBand = await pseudo(page, "peek-done", "::after", "content");
  check("phone: a peek's tile film plays no band", peekBand === "none" || peekBand === "normal", peekBand);
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
  const ld = await pseudo(page, "face-done", "::before", "display");
  check(`${feature}: no large film either`, ld === "none", ld);
  const faceOp = await page.$eval("#face-done", (e) => getComputedStyle(e).opacity);
  check(`${feature}: the face still draws`, faceOp === "1", faceOp);
  const glare = await page.$eval("#tilt-turning-inline [data-glare]", (e) => getComputedStyle(e).display);
  check(`${feature}: no light`, glare === "none", glare);
  if (expectShadow) {
    const sh = await page.$eval("#done [data-foil]", (e) => getComputedStyle(e).boxShadow);
    check(`${feature}: 2px inset ring instead`, sh.includes("inset") && sh.includes("2px"), sh);
  }
  await ctx.close();
}
await browser.close();
console.log(fails ? `${fails} failed` : "all passed");
process.exit(fails ? 1 : 0);
