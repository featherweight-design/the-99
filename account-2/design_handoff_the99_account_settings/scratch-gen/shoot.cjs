// node shoot.cjs [theme] [names...]: wrap each gen/out html in the shipped page, then shoot phone 390 and desktop 1300.
const { chromium } = require("/opt/node22/lib/node_modules/playwright"); const fs = require("fs"); const path = require("path");
const O = path.join(__dirname, "out"); const theme = process.argv[2] || "amonkhet"; const only = process.argv.slice(3);
const F = "../../src/app/fonts/";
const faces = [["Cinzel","cinzel-variable","600 900"],["Chakra","chakra-petch-500","500"],["Chakra","chakra-petch-600","600"],["Chakra","chakra-petch-700","700"],["Trirong","trirong-600","600"],["Trirong","trirong-700","700"],["Syncopate","syncopate-400","400"],["Syncopate","syncopate-700","700"],["Cormorant","cormorant-garamond-variable","600 700"],["Metamorphous","metamorphous-400","400"],["PlexSans","ibm-plex-sans-variable","400 600"],["PlexMono","ibm-plex-mono-400","400"],["PlexMono","ibm-plex-mono-500","500"],["PlexMono","ibm-plex-mono-600","600"]]
 .map(([f,file,w])=>`@font-face{font-family:${f};src:url(${F}${file}.woff2) format("woff2");font-weight:${w};font-style:normal}`).join("");
const vars = `html{--font-cinzel:Cinzel;--font-chakra-petch:Chakra;--font-trirong:Trirong;--font-syncopate:Syncopate;--font-cormorant-garamond:Cormorant;--font-metamorphous:Metamorphous;--font-plex-sans:PlexSans;--font-plex-mono:PlexMono}`;
const wrap = (body) => `<!doctype html><html data-theme="${theme}" class="h-full antialiased"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="app.css"><style>${faces}${vars}</style></head><body class="flex min-h-full flex-col bg-[color:var(--bg)] text-[color:var(--fg)]">${body}</body></html>`;
(async () => {
  const b = await chromium.launch(); fs.mkdirSync(path.join(O, "shots"), { recursive: true });
  for (const f of fs.readdirSync(O).filter((f) => /^[pd]-.*\.html$/.test(f) && !f.includes("__"))) {
    const k = f.slice(2, -5); if (only.length && !only.includes(k)) continue;
    const desk = f.startsWith("d-"); const w = desk ? 1300 : 390; let h = desk ? 900 : 844;
    const tmp = path.join(O, `__${theme}-${f}`); fs.writeFileSync(tmp, wrap(fs.readFileSync(path.join(O, f), "utf8")));
    const p = await b.newPage(desk ? { viewport: { width: w, height: h }, deviceScaleFactor: 2 } : { viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    await p.goto("file://" + tmp); await p.evaluate("document.fonts.ready"); await p.waitForTimeout(200);
    const need = await p.evaluate((desk) => { const d = document.querySelector('[role=dialog]'); if (!d) return 0; const r = d.getBoundingClientRect(); return Math.ceil(r.height + (desk ? 0.1 * innerHeight + 40 : 40)); }, desk);
    if (need > h) { h = need; await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(100); }
    const y = (k.startsWith("m-") || k.startsWith("x-")) ? 0 : await p.evaluate(() => { const s = document.getElementById("settings-account"); const t = s.getBoundingClientRect().top + scrollY; window.scrollTo(0, Math.max(0, t - (innerWidth < 700 ? 92 : 300))); return scrollY; });
    await p.waitForTimeout(100);
    const out = path.join(O, "shots", `${theme}-${f.replace(".html", ".png")}`);
    await p.screenshot({ path: out }); console.log(out.split("/").pop(), w, h, y); await p.close(); fs.unlinkSync(tmp);
  }
  await b.close();
})();
