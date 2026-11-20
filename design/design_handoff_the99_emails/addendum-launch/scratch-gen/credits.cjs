const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1400,height:1000},deviceScaleFactor:2});
await p.goto('file://'+process.cwd()+'/lpr/Page-390.html');await p.waitForTimeout(2500);
await p.evaluate(()=>{
 const els=[...document.querySelectorAll('div')].filter(e=>e.classList.contains('val3'));
 const box=els[0]; box.id='VAL';
 for (const k of [...box.children]) if(!['vbig','vplus'].includes(k.className)) k.style.display='none';
 box.style.padding='30px 34px'; box.style.gap='20px'; box.style.marginTop='0'; box.style.width='390px';
 let e=box.parentElement; while(e){e.style.background='transparent';e.style.backgroundColor='transparent';e.style.overflow='visible';e.style.width='auto';e.style.maxWidth='none';e=e.parentElement;}
 document.documentElement.style.background='transparent';
});
await p.addStyleTag({content:'body,html{background:transparent!important}'});
const bb=await p.locator('#VAL').boundingBox();await p.screenshot({path:'cr.png',omitBackground:true,fullPage:true,clip:{x:Math.floor(bb.x)-2,y:Math.floor(bb.y)-2,width:Math.ceil(bb.width)+4,height:Math.ceil(bb.height)+4}});await b.close();})();
