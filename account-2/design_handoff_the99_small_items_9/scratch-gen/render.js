// node render.js OUTDIR name... : render each board, set its preview size, report broken images, overflow, lone words.
const { chromium } = require('playwright'); const fs = require('fs');
const [out, ...names] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  fs.mkdirSync(`${out}/shots`, { recursive: true });
  for (const n of names) {
    const f = `${out}/${n}.dc.html`; const orig = fs.readFileSync(f, 'utf8');
    let src = orig.replace('<script src="./support.js"></script>', '').replace(/<script type="text\/x-dc"[\s\S]*?<\/script>/, '')
      .replace('<x-dc>', '<div>').replace('</x-dc>', '</div>').replace('<helmet>', '').replace('</helmet>', '');
    fs.writeFileSync(`${out}/_${n}.html`, src);
    await pg.goto(`file://${out}/_${n}.html`); await pg.waitForLoadState('networkidle'); await pg.evaluate('document.fonts.ready');
    const r = await pg.evaluate(() => { const b = document.querySelector('.board'); const r = b.getBoundingClientRect();
      const broken = [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.getAttribute('src'));
      const wide = [...b.querySelectorAll('.frames,.bh,.note,.fr,.rule8')].filter(e => e.getBoundingClientRect().right > r.right + 1).map(e => e.className + ':' + Math.round(e.getBoundingClientRect().right - r.right));
      const clip = [...b.querySelectorAll('.ph .pb, .ph .scr9, .dk .main, .ph .sc9')].filter(e => e.scrollHeight > e.clientHeight + 2).map(e => (e.closest('.fr9')?.querySelector('.lab9')?.textContent||'?').slice(0,40) + ':' + (e.scrollHeight - e.clientHeight));
      return { w: Math.ceil(r.width), h: Math.ceil(b.scrollHeight), broken, wide, clip }; });
    fs.writeFileSync(f, orig.replace(/"\$preview":\{"width":\d+,"height":\d+\}/, `"$preview":{"width":${r.w},"height":${r.h}}`));
    await pg.setViewportSize({ width: r.w, height: Math.min(Math.max(r.h, 200), 16000) });
    await pg.screenshot({ path: `${out}/shots/${n}.png`, fullPage: true }); console.log(n, JSON.stringify(r));
    fs.unlinkSync(`${out}/_${n}.html`);
  }
  await b.close();
})();
