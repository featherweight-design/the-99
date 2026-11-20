const fs=require('fs');const {chromium}=require('playwright');
const map=JSON.parse(fs.readFileSync('../r/map.json'));
let s=fs.readFileSync(process.argv[2],'utf8');
let body=s.match(/<x-dc>([\s\S]*)<\/x-dc>/)[1].replace(/\/_blob\/([0-9a-f]{32})/g,(_,id)=>'file:///home/user/lt/assets/'+map[id]);
const style=body.match(/<style>([\s\S]*?)<\/style>/)[1];const tpl=body.replace(/<helmet>[\s\S]*?<\/helmet>/,'');
const script=s.match(/data-dc-script[^>]*>([\s\S]*?)<\/script>/)[1].replace(/\/_blob\/([0-9a-f]{32})/g,(_,id)=>'file:///home/user/lt/assets/'+map[id]);
const html=`<!doctype html><html><head><style>${style}</style></head><body><template id=t>${tpl}</template><div id=root></div><script>
class DCLogic{constructor(p){this.props=p;this.state={}}setState(u){Object.assign(this.state,typeof u==='function'?u(this.state):u);window.__r()}}
${script}
const get=(sc,p)=>p.trim().split('.').reduce((o,k)=>o==null?o:o[k],sc);
const holeOnly=v=>{const m=v.match(/^\\{\\{([^}]+)\\}\\}$/);return m?m[1]:null};
const sub=(v,sc)=>v.replace(/\\{\\{([^}]+)\\}\\}/g,(_,p)=>{const x=get(sc,p);return x==null||x===false?'':x});
function R(n,sc,out){
 if(n.nodeType===3){out.appendChild(document.createTextNode(sub(n.textContent,sc)));return}
 if(n.nodeType!==1)return;const tag=n.tagName.toLowerCase();
 if(tag==='sc-for'){const l=get(sc,holeOnly(n.getAttribute('list')))||[];const as=n.getAttribute('as');l.forEach(it=>{const s2=Object.assign(Object.create(sc),{[as]:it});n.childNodes.forEach(c=>R(c,s2,out))});return}
 if(tag==='sc-if'){if(get(sc,holeOnly(n.getAttribute('value'))))n.childNodes.forEach(c=>R(c,sc,out));return}
 const e=document.createElementNS(n.namespaceURI,n.localName);
 for(const a of n.attributes){if(a.name.startsWith('hint-'))continue;const h=holeOnly(a.value);
  if(a.name.startsWith('on')&&h){const f=get(sc,h);if(f)e.addEventListener(a.name.slice(2).toLowerCase(),f);continue}
  e.setAttribute(a.name,sub(a.value,sc))}
 n.childNodes.forEach(c=>R(c,sc,e));out.appendChild(e)}
const C=new Component({});const t=document.getElementById('t').content;
window.__r=()=>{const root=document.getElementById('root');root.innerHTML='';const v=C.renderVals();t.childNodes.forEach(c=>R(c,v,root))};window.__C=C;__r();
</script></body></html>`;
fs.writeFileSync('p.html',html);
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:390,height:844}});
const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file://'+process.cwd()+'/p.html');await p.waitForTimeout(300);
const steps=JSON.parse(process.argv[3]||'[]');let i=0;
for(const st of steps){
 if(st.click)await p.click(st.click,{force:true});
 if(st.hold){const el=await p.$(st.hold);const bx=await el.boundingBox();await p.mouse.move(bx.x+bx.width/2,bx.y+bx.height/2);await p.mouse.down();await p.waitForTimeout(st.ms);await p.mouse.up();}
 if(st.wait)await p.waitForTimeout(st.wait);
 if(st.shot)await p.screenshot({path:st.shot});
 if(st.state)console.log(JSON.stringify(await p.evaluate(()=>{const s=Object.assign({},__C.state);delete s.hist;return s})));
}
console.log('errors',errs);await b.close();})();
