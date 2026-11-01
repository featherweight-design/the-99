const { chromium } = require('playwright'); const fs=require('fs');
const [f, sel] = process.argv.slice(2);
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:2000,height:1000}});
let src=fs.readFileSync(f,'utf8').replace('<script src="./support.js"></script>','').replace(/<script type="text\/x-dc"[\s\S]*?<\/script>/,'').replace('<helmet>','').replace('</helmet>','');
fs.writeFileSync('/home/user/si9/out/_m.html',src);await p.goto('file:///home/user/si9/out/_m.html');
const r=await p.evaluate((sel)=>[...document.querySelectorAll(sel)].map(e=>{const r=e.getBoundingClientRect();const cs=getComputedStyle(e);return [e.className,Math.round(r.y),Math.round(r.height),cs.display,cs.height]}),sel);console.log(JSON.stringify(r));await b.close();})();
