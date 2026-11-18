const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  for (const n of process.argv.slice(2)) {
    await pg.goto(`file://${process.cwd()}/out/${n}.prev.html`); await pg.waitForLoadState('networkidle');
    await pg.evaluate(() => document.fonts.ready); await pg.waitForTimeout(800);
    const r = await pg.evaluate(() => { const b = document.querySelector('.board'); if (!b) return null; const r = b.getBoundingClientRect();
      const broken = [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.getAttribute('src'));
      const wide = [...b.querySelectorAll('.frames,.bh,.cmp,table')].filter(e => e.getBoundingClientRect().right > r.right + 1).map(e => e.className + ':' + Math.round(e.getBoundingClientRect().right - r.right));
      const clip = [...b.querySelectorAll('.ph .pb,.dk .main')].filter(e => e.scrollHeight > e.clientHeight + 1).map(e => e.className + ':' + (e.scrollHeight - e.clientHeight));
      return { w: Math.ceil(r.width), h: Math.ceil(b.scrollHeight), broken, wide, clip }; });
    console.log(n, JSON.stringify(r));
    if (r) { await pg.setViewportSize({ width: r.w, height: Math.min(r.h, 16000) }); await pg.screenshot({ path: `shots/${n}.png`, fullPage: true }); }
  }
  await b.close();
})();
