import { readFileSync } from "node:fs";
import { contrast, chroma, hueOk, hueGap, deltaEOk, oklab } from "./color.ts";
import { parseThemeBlocks } from "./parse-css.ts";
const T = parseThemeBlocks(readFileSync("/home/claude/the-99/src/app/globals.css","utf8"));
const G = ["bg","surface","surface-raised","surface-sunken","surface-rail","elevated"];
const O=["w","u","b","r","g","success","warning","danger"];
function lin(c:number){return c<=0.0031308?12.92*c:1.055*c**(1/2.4)-0.055;}
function fromLch(L:number,C:number,h:number){const A=C*Math.cos(h*Math.PI/180),B=C*Math.sin(h*Math.PI/180);
 const l_=L+0.3963377774*A+0.2158037573*B,m_=L-0.1055613458*A-0.0638541728*B,s_=L-0.0894841775*A-1.291485548*B;
 const [l,m,s]=[l_**3,m_**3,s_**3];const rgb=[4.0767416621*l-3.3077115913*m+0.2309699292*s,-1.2684380046*l+2.6097574011*m-0.3413193965*s,-0.0041960863*l-0.7034186147*m+1.707614701*s];
 if(rgb.some(c=>c<0||c>1))return null;return "#"+rgb.map(c=>Math.round(lin(c)*255).toString(16).padStart(2,"0")).join("").toUpperCase();}
const t=T.get("phyrexia")!; const acc=t.get("accent")!;
console.log("phyrexia others", O.map(k=>`${k}=${t.get(k)} h${hueOk(t.get(k)!).toFixed(0)} C${chroma(t.get(k)!).toFixed(3)} L${oklab(t.get(k)!).L.toFixed(3)}`).join("\n"));
console.log("accent",acc,"h",hueOk(acc).toFixed(1),"C",chroma(acc).toFixed(3),"L",oklab(acc).L.toFixed(3));
const res:any[]=[];
for(let dh=-12;dh<=12;dh+=1)for(let C=0.03;C<=0.12;C+=0.004)for(let L=0.5;L<0.75;L+=0.002){
 const x=fromLch(L,C,hueOk(acc)+dh); if(!x)continue;
 const m=Math.min(...G.map(g=>contrast(x,t.get(g)!))); if(m<4.55||m>4.75)continue;
 const sep=Math.min(...O.map(k=>deltaEOk(x,t.get(k)!)));
 res.push({x,dh,C:+C.toFixed(3),m:+m.toFixed(2),sep:+sep.toFixed(3),worst:O.reduce((a,k)=>deltaEOk(x,t.get(k)!)<deltaEOk(x,t.get(a)!)?k:a),dE:+deltaEOk(x,acc).toFixed(3)});
 break;
}
for(const lim of [0,2,4,6,9,12]){
 const best=res.filter(r=>Math.abs(r.dh)<=lim).sort((a,b)=>b.sep-a.sep)[0];
 console.log("hue within ±"+lim+"°", JSON.stringify(best));
}
console.log("straight lift, sep>=0.10 needs:", JSON.stringify(res.filter(r=>r.dh===0&&r.sep>=0.1).sort((a,b)=>a.dE-b.dE)[0]));
