const { chromium } = require('playwright');
const path=require('path');
(async()=>{
 const dir=process.argv[2], out=process.argv[3]; const names=process.argv.slice(4);
 const b=await chromium.launch();
 for(const nw of names){
  const [n,w]=nw.split(':'); const p=await b.newPage({viewport:{width:+w,height:900}});
  await p.goto('file://'+path.join(dir,n)); await p.waitForTimeout(500);
  const h=await p.evaluate(()=>Math.ceil(document.documentElement.scrollHeight));
  const sw=await p.evaluate(()=>Math.ceil(document.documentElement.scrollWidth));
  console.log(n, w, sw, h);
  await p.screenshot({path:path.join(out,n.replace('.dc.html','.png')),fullPage:true});
  await p.close();
 }
 await b.close();
})();
