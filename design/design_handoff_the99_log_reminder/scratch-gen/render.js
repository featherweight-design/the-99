const fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const [,,dir,src,out]=process.argv;fs.mkdirSync(out,{recursive:true});
(async()=>{const b=await chromium.launch();const res={};
for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.dc.html'))){let s=fs.readFileSync(path.join(dir,f),'utf8');
 const w=+s.match(/"\$preview":\{"width":(\d+)/)[1];
 let body=s.match(/<x-dc>([\s\S]*)<\/x-dc>/)[1].replace(/<helmet>([\s\S]*?)<\/helmet>/,'$1');
 const miss=[...body.matchAll(/@@([^@]+)@@/g)].map(m=>m[1]).filter(k=>!fs.existsSync(path.join(src,k)));
 body=body.replace(/@@([^@]+)@@/g,(_,k)=>'file://'+path.join(src,k));
 const tmp=path.join(out,'tmp.html');fs.writeFileSync(tmp,'<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0">'+body+'</body></html>');
 const p=await b.newPage({viewport:{width:w,height:600}});await p.goto('file://'+tmp);await p.waitForTimeout(300);
 const r=await p.evaluate(()=>{const root=document.querySelector("body>div");const h=Math.ceil(root.getBoundingClientRect().height);
  const clipped=[...document.querySelectorAll('*')].filter(e=>{const cs=getComputedStyle(e);return (cs.overflow!=='visible'||cs.textOverflow==='ellipsis')&&e.scrollWidth>e.clientWidth+1&&!e.classList.contains('wash')&&!e.classList.contains('hc')}).map(e=>e.className+':'+e.textContent.slice(0,30));
  const over=[...document.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>root.getBoundingClientRect().right+1&&!e.closest('.wash')).length;
  return {h,clipped,over};});
 await p.setViewportSize({width:w,height:r.h});await p.screenshot({path:path.join(out,f.replace('.dc.html','.png'))});
 res[f]={w,...r,miss};await p.close();}
console.log(JSON.stringify(res,null,1));await b.close();})();
