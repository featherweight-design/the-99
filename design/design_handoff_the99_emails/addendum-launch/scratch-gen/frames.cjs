const { chromium } = require('playwright');
const dir=process.argv[2], out=process.argv[3];
const jobs=[['launch',648],['launch',375],['launch-flyer',375],['launch',375,'invert'],['launch',648,'invert'],['launch',648,'noimg'],['launch',375,'noimg']];
(async()=>{const b=await chromium.launch();const sizes={};
for (const [n,w,mode] of jobs){const p=await b.newPage({viewport:{width:w,height:400},deviceScaleFactor:2});
 if(mode==='noimg') await p.route('**/*.png',r=>r.abort());
 await p.goto('file://'+dir+'/'+n+'.html');
 if(mode==='invert') await p.addStyleTag({content:'html{filter:invert(1) hue-rotate(180deg);background:#14110E} img{filter:invert(1) hue-rotate(180deg)}'});
 await p.waitForTimeout(300);
 const h=await p.evaluate(()=>document.documentElement.scrollHeight);
 const f=`${n}-${w}${mode?'-'+mode:''}.png`; sizes[f]=[w,h];
 await p.screenshot({path:out+'/'+f,fullPage:true}); await p.close();}
console.log(JSON.stringify(sizes));await b.close();})();
