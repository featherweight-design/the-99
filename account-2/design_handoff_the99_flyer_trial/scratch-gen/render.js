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
      const lone = [];
      for (const el of b.querySelectorAll('*')) {
        if (el.closest('svg,.mini,.tabs')) continue;
        const kids = [...el.children];
        if (kids.some(k => !['inline','inline-block'].includes(getComputedStyle(k).display) && k.tagName !== 'BR')) continue;
        const d = getComputedStyle(el).display; if (d.startsWith('inline')) continue;
        if (!el.textContent.trim()) continue;
        const tops = [];
        const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let n; while ((n = tw.nextNode())) { const re = /\S+/g; let m; while ((m = re.exec(n.data))) { const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length); const rc = rg.getClientRects()[0]; if (rc) tops.push(Math.round(rc.top)); } }
        if (tops.length < 3) continue;
        const lines = []; for (const t of tops) { if (!lines.length || Math.abs(t - lines[lines.length-1].t) > 4) lines.push({ t, n: 1 }); else lines[lines.length-1].n++; }
        if (lines.length > 1 && lines[lines.length-1].n === 1) lone.push(el.textContent.trim().slice(-50));
      }
      return { w: Math.ceil(r.width), h: Math.ceil(b.scrollHeight), broken, wide, clip, lone }; });
    res[n] = r; await pg.setViewportSize({ width: r.w, height: Math.min(Math.max(r.h, 200), 16000) });
    await pg.screenshot({ path: `${out}/shots/${n}.png`, fullPage: true }); console.log(n, JSON.stringify(r));
  }
  fs.writeFileSync(`${out}/shots/sizes.json`, JSON.stringify(res)); await b.close();
})();
