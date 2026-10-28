const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const names = process.argv.slice(2);
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  const V = path.resolve('../vend');
  const map = {'react@18.3.1/umd/react.production.min.js': V+'/react-18.3.1/package/umd/react.production.min.js',
    'react-dom@18.3.1/umd/react-dom.production.min.js': V+'/react-dom-18.3.1/package/umd/react-dom.production.min.js',
    '@babel/standalone@7.29.0/babel.min.js': V+'/babel-standalone-7.29.0/package/babel.min.js'};
  await pg.route('https://unpkg.com/**', r => { const k = Object.keys(map).find(k => r.request().url().endsWith(k));
    return k ? r.fulfill({ path: map[k], contentType: 'application/javascript' }) : r.abort(); });
  const sizes = fs.existsSync('sizes.json') ? JSON.parse(fs.readFileSync('sizes.json')) : {};
  fs.mkdirSync('shots', { recursive: true });
  for (const n of names) {
    await pg.goto('file://' + path.resolve('out', n + '.dc.html'));
    await pg.waitForLoadState('networkidle'); await pg.evaluate(() => document.fonts.ready);
    await pg.waitForTimeout(400);
    const r = await pg.evaluate(() => { const b = document.querySelector('.board'); if (!b) return {err:'no board'}; const r = b.getBoundingClientRect();
      const broken = [...document.images].filter(i => !i.complete || i.naturalWidth === 0).map(i => i.getAttribute('src'));
      const wide = [...b.querySelectorAll('.frames,.bh,.notes,.note')].filter(e => e.getBoundingClientRect().right > r.right + 1).map(e => e.className + ':' + Math.round(e.getBoundingClientRect().right - r.right));
      const clip = [...b.querySelectorAll('.ph .pb,.dk .main,.sht .mb,.mdl .mb')].filter(e => e.scrollHeight > e.clientHeight + 1).map(e => e.className + ':' + (e.scrollHeight - e.clientHeight));
      return { w: Math.ceil(r.width), h: Math.ceil(b.scrollHeight), broken, wide, clip }; });
    if (r.w) { sizes[n] = [r.w, r.h]; await pg.setViewportSize({ width: r.w, height: Math.min(r.h, 16000) });
      await pg.screenshot({ path: 'shots/' + n + '.png', fullPage: true }); }
    console.log(n, JSON.stringify(r));
  }
  fs.writeFileSync('sizes.json', JSON.stringify(sizes));
  await b.close();
})();
