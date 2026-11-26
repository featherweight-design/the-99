const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();const dir=process.argv[2];
for(const [f,w,h] of [['Main',1600,2060],['Phone-F1',390,844],['Phone-F2',390,844],['Phone-F3',390,844],['Desktop-F1',1300,900],['Desktop-F2',1300,900],['Desktop-F3',1300,900]]){
const p=await b.newPage({viewport:{width:w,height:h},deviceScaleFactor:1});await p.goto('file://'+dir+'/'+f+'.dc.html');await p.waitForTimeout(800);
const sh=await p.evaluate(()=>{const r=document.querySelector('x-dc > div');const c=r.firstElementChild;return [r.scrollHeight, c?c.scrollHeight:0]});console.log(f,sh);
await p.screenshot({path:dir+'/'+f+'.png'});}
await b.close();})();
