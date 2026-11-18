const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1040,height:560}});
await p.goto('file://'+process.cwd()+'/fan.html');await p.waitForTimeout(1500);
await p.screenshot({path:'r2/launch-fan@2x.png',omitBackground:true});await b.close();})();
