# Renders each .dc.html board headless (fonts and art local) and checks frames, notice placement and images.
import asyncio, glob, json, os, re
from playwright.async_api import async_playwright

S = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.join(S, "canvas", "project")
PRE = os.path.join(S, "preview")
os.makedirs(PRE, exist_ok=True)
FS = os.path.join(S, "fonts", "node_modules", "@fontsource")
FAM = {"IBM Plex Sans": "ibm-plex-sans", "IBM Plex Mono": "ibm-plex-mono", "Cinzel": "cinzel",
       "Chakra Petch": "chakra-petch", "Trirong": "trirong", "Syncopate": "syncopate",
       "Cormorant Garamond": "cormorant-garamond", "Metamorphous": "metamorphous"}
ARTMAP = {}
for line in open(os.path.join(S, "build.py")):
    m = re.search(r'"(\w+)": \("([0-9a-f]{32})"', line)
    if m:
        ARTMAP[m.group(2)] = os.path.join(S, "canvas", "art", m.group(1) + ".jpg")
ARTMAP["d6fed115feb9bb6e78abb610047db1b9"] = os.path.join(S, "canvas", "art", "ghalta-art.jpg")


def faces():
    out = []
    for fam, pkg in FAM.items():
        for f in glob.glob(os.path.join(FS, pkg, "files", f"{pkg}-latin-*-*.woff2")):
            m = re.search(r"-latin-(\d+)-(normal|italic)\.woff2$", f)
            if m:
                out.append(f"@font-face{{font-family:'{fam}';font-weight:{m.group(1)};font-style:{m.group(2)};src:url(file://{f})}}")
    return "\n".join(out)


FACES = faces()


def preview(src):
    h = open(src).read()
    h = h.replace('<script src="./support.js"></script>', "")
    h = re.sub(r'<script type="text/x-dc".*?</script>', "", h, flags=re.S)
    h = re.sub(r'<link href="https://fonts.googleapis.com[^>]*>', f"<style>{FACES}</style>", h)
    h = re.sub(r"/_blob/([0-9a-f]{32})", lambda m: "file://" + ARTMAP[m.group(1)], h)
    out = os.path.join(PRE, os.path.basename(src).replace(".dc.html", ".html"))
    open(out, "w").write(h)
    return out


JS = r"""() => {
const b = document.querySelector('.board'); const r = b.getBoundingClientRect();
const issues = [];
document.querySelectorAll('img').forEach(i => { if (!i.complete || i.naturalWidth === 0) issues.push('broken img ' + i.src.slice(-30)); });
const frames = [...document.querySelectorAll('.ph,.dk')];
frames.forEach((f, idx) => {
  const fr = f.getBoundingClientRect();
  const label = (f.closest('.fr')?.querySelector('.k')?.textContent || 'frame ' + idx).slice(0, 60);
  const n = f.querySelector('footer.fcn');
  const tb = f.querySelector('.tbar');
  if (n) {
    const nr = n.getBoundingClientRect();
    const limit = tb ? tb.getBoundingClientRect().top : fr.bottom;
    const lastP = n.querySelector('p:last-child').getBoundingClientRect();
    if (lastP.bottom > limit + 0.5) issues.push(label + ': notice text under tab bar / cut by ' + Math.round(lastP.bottom - limit));
    if (nr.top < fr.top) issues.push(label + ': notice above frame top');
    const main = f.querySelector('.main, .pg');
    if (main && main.scrollHeight > main.clientHeight + 1 && !f.classList.contains('auto')) issues.push(label + ': main overflows ' + (main.scrollHeight - main.clientHeight));
    const lines = [...n.querySelectorAll('p')].map(p => Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight)));
    f.dataset.lines = lines.join('+');
  }
  // content must not overlap the notice
  const m = f.querySelector('.main, .pg');
  if (m && n) { const mr = m.getBoundingClientRect(); const nr = n.getBoundingClientRect(); if (mr.bottom > nr.top + 1 && !f.querySelector('.col.end,.dcol.end')) issues.push(label + ': page content runs into notice by ' + Math.round(mr.bottom - nr.top)); }
  if (n && !tb) { const nr = n.getBoundingClientRect(); if (nr.bottom > fr.bottom + 1) issues.push(label + ': notice cut by frame ' + Math.round(nr.bottom - fr.bottom)); }
});
const lines = frames.map(f => ((f.closest('.fr')?.querySelector('.k')?.textContent || '').slice(0, 40)) + ' => ' + (f.dataset.lines || '-'));
// gaps between page content end and notice top on short pages
const gaps = frames.map(f => { const n = f.querySelector('footer.fcn'); const m = f.querySelector('.main > *:last-child, .pg > *:last-child'); if (!n || !m) return null; return ((f.closest('.fr')?.querySelector('.k')?.textContent || '').slice(0, 30)) + ' gap ' + Math.round(n.getBoundingClientRect().top - m.getBoundingClientRect().bottom); }).filter(Boolean);
return {w: Math.ceil(r.width), h: Math.ceil(b.scrollHeight), issues, lines, gaps, fonts: document.fonts.check("12px 'IBM Plex Sans'")};
}"""


async def run():
    res = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path="/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
                                    args=["--allow-file-access-from-files"])
        pg = await b.new_page(viewport={"width": 1400, "height": 900})
        for src in sorted(glob.glob(os.path.join(PROJ, "*.dc.html"))):
            out = preview(src)
            await pg.goto("file://" + out)
            await pg.wait_for_load_state("networkidle")
            await pg.evaluate("document.fonts.ready")
            await pg.wait_for_timeout(400)
            r = await pg.evaluate(JS)
            name = os.path.basename(src)
            res[name] = {"w": r["w"], "h": r["h"]}
            print(f"== {name} {r['w']}x{r['h']} fonts={r['fonts']}")
            for i in r["issues"]:
                print("  ISSUE", i)
            for l in r["lines"]:
                print("  lines", l)
            for g in r["gaps"]:
                print("  ", g)
            await pg.set_viewport_size({"width": r["w"], "height": 900})
            await pg.screenshot(path=os.path.join(PRE, name.replace(".dc.html", ".png")), full_page=True)
        await b.close()
    json.dump(res, open(os.path.join(S, "sizes.json"), "w"), indent=1)


asyncio.run(run())
