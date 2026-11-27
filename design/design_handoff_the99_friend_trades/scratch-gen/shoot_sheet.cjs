// Sheet frames drawn whole: a tall viewport, cropped 40px under the dialog's foot (min the normal viewport).
const { chromium } = require("playwright"); const fs = require("fs"); const path = require("path");
(async () => {
  const { page } = await import(path.resolve("dz/page.mjs"));
  const ids = process.argv[2].split(",");
  const frames = JSON.parse(fs.readFileSync("dz/frames.json", "utf8")).filter((f) => ids.some((i) => f.id === i + "-desk" || f.id === i + "-phone"));
  fs.mkdirSync("out/sheet", { recursive: true });
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  for (const f of frames) {
    fs.writeFileSync(`out/p-${f.id}.html`, page(fs.readFileSync(`dz/frames/${f.id}.html`, "utf8"), "amonkhet"));
    const w = f.dev === "phone" ? 390 : 1300, h = f.dev === "phone" ? 1900 : 1700;
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    await p.emulateMedia({ reducedMotion: "reduce" });
    await p.goto("file://" + path.resolve(`out/p-${f.id}.html`)); await p.evaluate("document.fonts.ready"); await p.waitForTimeout(300);
    const need = await p.evaluate(() => { const d = document.querySelector('[role="dialog"]'); if (!d) return null; const extra = [d, ...d.querySelectorAll("*")].reduce((m, e) => Math.max(m, e.scrollHeight - e.clientHeight > 1 && getComputedStyle(e).overflowY.match(/auto|scroll|hidden/) ? e.scrollHeight - e.clientHeight : 0), 0); return d.getBoundingClientRect().height + extra; });
    // Phone: the sheet rises from the foot and stops 52px under the top; desktop: it caps at 85dvh, centred.
    const vh = need == null ? h : f.dev === "phone" ? Math.ceil(need + 52) : Math.ceil((need + 60) / 0.85);
    await p.setViewportSize({ width: w, height: Math.max(f.dev === "phone" ? 844 : 860, vh) }); await p.waitForTimeout(250);
    const foot = await p.evaluate(() => { const d = document.querySelector('[role="dialog"]'); return d ? d.getBoundingClientRect().bottom : null; });
    const full = Math.max(f.dev === "phone" ? 844 : 860, vh);
    // A phone sheet can be taller than its content (it fills to 52px under the top): cut 24px under the content.
    const last = await p.evaluate(() => { const d = document.querySelector('[role="dialog"]'); return d ? [...d.querySelectorAll("img, button, p, h1, h2, h3, li, a")].reduce((m, e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.width > 0 ? Math.max(m, r.bottom) : m; }, 0) : null; });
    const ch = f.dev === "phone" ? Math.min(full, Math.max(844, Math.ceil((last ?? full) + 24))) : Math.min(full, Math.max(860, Math.ceil((foot ?? 0) + 40)));
    await p.screenshot({ path: `out/sheet/${f.id}.png`, clip: { x: 0, y: 0, width: w, height: ch } });
    console.log(f.id, Math.round(need), ch); await p.close();
  }
  await b.close();
})();
