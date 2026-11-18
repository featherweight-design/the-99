const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:560,height:540},deviceScaleFactor:1});
await p.goto('file://'+process.cwd()+'/hand.html');await p.waitForTimeout(1500);
await p.screenshot({path:'launch-hand.png',omitBackground:true,clip:{x:0,y:0,width:560,height:540}});await b.close();})();
