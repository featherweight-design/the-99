const {chromium}=require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:2000,height:1000},deviceScaleFactor:1});const sizes={};
for(const n of (process.argv.slice(2).length?process.argv.slice(2):['Main','Themes','Pairs'])){
 await p.setViewportSize({width:2000,height:1000});
 await p.goto('file://'+process.cwd()+'/gout/'+n+'.flat.html');await p.waitForTimeout(2500);await p.evaluate(()=>document.fonts.ready);
 const r=await p.evaluate(()=>{const b=document.querySelector('.board');if(!b)return null;const r=b.getBoundingClientRect();
  const broken=[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.src);
  const wide=[...b.querySelectorAll('.frames,.sec,.bh,.tbl2,.gset,.tb,.pairs')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.className);
  const over=[...b.querySelectorAll('.ph,.dk,.mrow,.lgd .r,.wall>span,.gc')].filter(e=>e.scrollWidth>e.clientWidth+1).map(e=>e.className+':'+e.textContent.slice(0,30));
  return {w:Math.ceil(r.width),h:Math.ceil(b.scrollHeight),broken,wide,over};});
 console.log(n,JSON.stringify(r)); if(!r) continue; sizes[n]=[r.w,r.h];
 await p.setViewportSize({width:r.w,height:Math.min(r.h,16000)});await p.screenshot({path:'gout/'+n+'.png',fullPage:true});}
fs.writeFileSync('gsizes.json',JSON.stringify(sizes));await b.close();})();
