const { chromium } = require('playwright');
const fs = require('fs'); const path=require('path');
(async () => {
  const names = process.argv.slice(2);
  fs.mkdirSync('shots', {recursive:true});
  const sizes = fs.existsSync('sizes.json') ? JSON.parse(fs.readFileSync('sizes.json')) : {};
  const b = await chromium.launch();
  const pg = await b.newPage({viewport:{width:1600,height:1000}});
  const V='/tmp/claude-0/-home-user/68db4f4e-a77b-575f-8d14-69ee80231487/scratchpad/vend/node_modules/';
  await pg.route('https://unpkg.com/**', r => { const u=r.request().url().replace('https://unpkg.com/',''); const m=u.match(/^(@?[^@]+(?:\/[^@]+)?)@[^/]+\/(.*)$/); r.fulfill({path:V+m[1]+'/'+m[2], contentType:'application/javascript'}); });
  for (const n of names) {
    await pg.goto('file://'+path.resolve('out/'+n+'.dc.html'));
    await pg.waitForLoadState('networkidle');
    await pg.evaluate(() => document.fonts.ready);
    const r = await pg.evaluate(() => { const b=document.querySelector('.board'); const r=b.getBoundingClientRect();
      const broken=[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.getAttribute('src'));
      const wide=[...b.querySelectorAll('.frames,.bh,.notes,.note,.sec')].filter(e=>e.getBoundingClientRect().right>r.right+1).map(e=>e.className+':'+Math.round(e.getBoundingClientRect().right-r.right));
      const over=[...b.querySelectorAll('.ph,.dk,.ph .pb,.dk .main')].filter(e=>e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1).map(e=>e.className+':'+(e.scrollHeight-e.clientHeight)+'/'+(e.scrollWidth-e.clientWidth));
      return {w:Math.ceil(r.width), h:Math.ceil(b.scrollHeight), broken, wide, over}; });
    sizes[n]=[r.w,r.h];
    await pg.setViewportSize({width:r.w, height:Math.min(r.h,16000)});
    await pg.screenshot({path:'shots/'+n+'.png', fullPage:true});
    console.log(n, JSON.stringify(r));
  }
  fs.writeFileSync('sizes.json', JSON.stringify(sizes));
  await b.close();
})();
