const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1240,height:900},deviceScaleFactor:2});
await p.goto('file://'+process.argv[2]);await p.waitForTimeout(1500);await p.evaluate(()=>document.fonts.ready);
for(const id of ['D1','D2','P1','O1','O2','O3']){await p.locator('#'+id).screenshot({path:process.argv[3]+'/'+id+'.png'});}
await b.close();})();
