// A5 shots: viewport frames (the dialog as a reader sees it) and full frames (the scroller unrolled), with the press ring drawn
// over the first add's name exactly as PressRing draws it (3px stand-off, 2px accent, 5px halo, label "above").
const { chromium } = require("playwright"); const path = require("path");
const RING = (label) => {
  const btn = [...document.querySelectorAll("[data-testid=demo-upgrade] button")].find((b) => b.textContent === "Brainstorm");
  const host = document.getElementById("panel"); if (!btn || !host) return;
  const at = host.getBoundingClientRect(), to = btn.getBoundingClientRect();
  const r = document.createElement("span");
  r.className = "pointer-events-none absolute z-[6] rounded-[10px] border-2 border-solid border-[color:var(--accent)] shadow-[0_0_0_5px_color-mix(in_oklab,var(--accent)_22%,transparent)]";
  Object.assign(r.style, { left: to.left - at.left - 3 + "px", top: to.top - at.top - 3 + "px", width: to.width + 6 + "px", height: to.height + 6 + "px" });
  const b = document.createElement("b");
  b.className = "absolute whitespace-nowrap left-[calc(100%+8px)] top-1/2 -translate-y-1/2 rounded-[5px] bg-[color:var(--accent)] px-[7px] font-sans text-[10.5px] font-semibold leading-[18px] text-[color:var(--bg)]";
  b.textContent = label; r.appendChild(b); host.appendChild(r);
};
(async () => {
  const jobs = JSON.parse(process.argv[2]); const br = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  for (const j of jobs) {
    const p = await br.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 2 });
    await p.emulateMedia({ reducedMotion: "reduce" });
    await p.goto("file://" + path.resolve(`up/p-${j.k}.html`)); await p.evaluate("document.fonts.ready"); await p.waitForTimeout(500);
    if (j.ring) await p.evaluate(RING, "Select a card");
    if (j.full) {
      // Unroll the scroller: the dialog grows to its content.
      const H = await p.evaluate((w) => { const col = document.getElementById(w >= 1024 ? "app" : "col"); return Math.ceil(col.scrollHeight - col.clientHeight + window.innerHeight); }, j.w);
      await p.setViewportSize({ width: j.w, height: H }); await p.waitForTimeout(300);
      if (j.ring) { await p.evaluate(() => document.querySelectorAll("#panel > span.absolute.z-\\[6\\]").forEach((e) => e.remove())); await p.evaluate(RING, "Select a card"); }
    }
    if (j.scroll) await p.evaluate((y) => { const w = innerWidth; document.getElementById(w >= 1024 ? "app" : "col").scrollTop = y; }, j.scroll);
    await p.waitForTimeout(150);
    const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, h: innerHeight }));
    await p.screenshot({ path: `up/shots/${j.out}.png` }); console.log(j.out, JSON.stringify(m)); await p.close();
  }
  await br.close();
})();
