const { chromium } = require('playwright'); const fs=require('fs');
(async()=>{const b=await chromium.launch(); const pg=await b.newPage({viewport:{width:1900,height:1200},deviceScaleFactor:2});
let src=fs.readFileSync('out/bg.dc.html','utf8').replace('<script src="./support.js"></script>','').replace(/<script type="text\/x-dc"[\s\S]*?<\/script>/,'').replace('<x-dc>','<div>').replace('</x-dc>','</div>').replace('<helmet>','').replace('</helmet>','');
fs.writeFileSync('out/_bg.html',src); await pg.goto('file://'+process.cwd()+'/out/_bg.html'); await pg.waitForLoadState('networkidle'); await pg.evaluate('document.fonts.ready');
await (await pg.$('.ph')).screenshot({path:'out/bg-phone.png'}); await (await pg.$('.dk')).screenshot({path:'out/bg-desk.png'});
const r=await pg.evaluate(()=>[document.querySelector('.ph').getBoundingClientRect().toJSON(),document.querySelector('.dk').getBoundingClientRect().toJSON()]); console.log(JSON.stringify(r)); await b.close();})();
