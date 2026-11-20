const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();
for (const n of ['unsub-done','unsub-broken']) for (const [w,h] of [[390,844],[1300,800]]){
 const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:2});
 await p.goto('file://'+process.cwd()+'/out/_preview/'+n+'.html');await p.waitForTimeout(1200);
 await p.screenshot({path:`art/${n}-${w}.png`});await p.close();}
await b.close();})();
