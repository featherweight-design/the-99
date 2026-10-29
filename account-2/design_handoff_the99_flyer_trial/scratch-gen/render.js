// node render.js OUTDIR name... : local render; reports size, broken images, overflow.
const { chromium } = require('playwright'); const fs = require('fs');
const [out, ...names] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  fs.mkdirSync(`${out}/shots`, { recursive: true }); const res = {};
  for (const n of names) {
    let src = fs.readFileSync(`${out}/${n}.dc.html`, 'utf8');
    src = src.replace('<script src="./support.js"></script>', '').replace(/<script type="text\/x-dc"[\s\S]*?<\/script>/, '')
      .replace('<x-dc>', '<div>').replace('</x-dc>', '</div>').replace('<helmet>', '').replace('</helmet>', '');
    fs.writeFileSync(`${out}/_${n}.html`, src);
    await pg.goto(`file://${out}/_${n}.html`); await pg.waitForLoadState('networkidle'); await pg.evaluate('document.fonts.ready');
    const r = await pg.evaluate(() => { const b = document.querySelector('.board'); const r = b.getBoundingClientRect();
      const broken = [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.getAttribute('src'));
      const wide = [...b.querySelectorAll('.frames,.bh,.note,.fr')].filter(e => e.getBoundingClientRect().right > r.right + 1).map(e => e.className + ':' + Math.round(e.getBoundingClientRect().right - r.right));
      const clip = [...b.querySelectorAll('.ph .pb,.dk .main,[data-check]')].filter(e => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1).map(e => e.className + ':' + (e.scrollHeight - e.clientHeight) + '/' + (e.scrollWidth - e.clientWidth));
      return { w: Math.ceil(r.width), h: Math.ceil(b.scrollHeight), broken, wide, clip }; });
    res[n] = r; await pg.setViewportSize({ width: r.w, height: Math.min(Math.max(r.h, 200), 16000) });
    await pg.screenshot({ path: `${out}/shots/${n}.png`, fullPage: true }); console.log(n, JSON.stringify(r));
  }
  fs.writeFileSync(`${out}/shots/sizes.json`, JSON.stringify(res)); await b.close();
})();
