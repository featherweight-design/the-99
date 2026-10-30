import { readFileSync, writeFileSync } from "node:fs";
import { contrast, chroma, hueOk, hueGap, deltaEOk, oklab } from "./color.ts";
import { parseThemeBlocks } from "./parse-css.ts";
const T = parseThemeBlocks(readFileSync("/home/claude/the-99/src/app/globals.css","utf8"));
const G = ["bg","surface","surface-raised","surface-sunken","surface-rail","elevated"];
const TARGET = Number(process.argv[2] ?? 4.6);
function lin(c:number){const v=c<=0.0031308?12.92*c:1.055*c**(1/2.4)-0.055;return v;}
function fromLch(L:number,C:number,h:number):string|null{
  const A=C*Math.cos(h*Math.PI/180),B=C*Math.sin(h*Math.PI/180);
  const l_=L+0.3963377774*A+0.2158037573*B,m_=L-0.1055613458*A-0.0638541728*B,s_=L-0.0894841775*A-1.291485548*B;
  const [l,m,s]=[l_**3,m_**3,s_**3];
  const rgb=[4.0767416621*l-3.3077115913*m+0.2309699292*s,-1.2684380046*l+2.6097574011*m-0.3413193965*s,-0.0041960863*l-0.7034186147*m+1.707614701*s];
  if(rgb.some(c=>c<-0.0005||c>1.0005))return null;
  return "#"+rgb.map(c=>Math.round(Math.min(1,Math.max(0,lin(c)))*255).toString(16).padStart(2,"0")).join("").toUpperCase();
}
const lch=(h:string)=>{const o=oklab(h);return {L:o.L,C:chroma(h),h:hueOk(h)};};
const minOn=(hex:string,t:Map<string,string>)=>Math.min(...G.map(g=>contrast(hex,t.get(g)!)));
// lift L holding hue; hold chroma, shed it only when out of gamut
function lift(hex:string,t:Map<string,string>,target:number){
  const o=lch(hex);
  if(minOn(hex,t)>=target) return hex;
  for(let L=o.L;L<1;L+=0.0005){
    for(let C=o.C;C>=0;C-=0.002){ const x=fromLch(L,C,o.h); if(x){ if(minOn(x,t)>=target) return x; break; } }
  }
  throw new Error("no lift");
}
const out:any={target:TARGET,themes:{}};
for(const [n,t] of T){
  const acc=t.get("accent")!, hov=t.get("accent-hover")!, faint=t.get("fg-faint")!, muted=t.get("fg-muted")!;
  const nAcc=lift(acc,t,TARGET);
  // hover: keep shipped OKLab L step over the accent, same hue/chroma ratio
  const dL=lch(hov).L-lch(acc).L;
  let nHov=hov;
  if(nAcc!==acc){ const h=lch(hov); let x:string|null=null; for(let C=h.C;C>=0&&!x;C-=0.002) x=fromLch(lch(nAcc).L+dL,C,h.h); nHov=x!; }
  nHov=lift(nHov,t,TARGET);
  const nFaint=lift(faint,t,TARGET);
  const g=(k:string,h:string)=>G.map(gg=>+contrast(h,t.get(gg)!).toFixed(2));
  const others=["w","u","b","r","g","success","warning","danger"];
  out.themes[n]={
    accent:{from:acc,to:nAcc,before:g("",acc),after:g("",nAcc),hueShift:+hueGap(acc,nAcc).toFixed(2),dE:+deltaEOk(acc,nAcc).toFixed(3),
      bgLabel:+contrast(t.get("bg")!,nAcc).toFixed(2),
      sep:Object.fromEntries(others.map(k=>[k,{dE:+deltaEOk(nAcc,t.get(k)!).toFixed(3),hue:+hueGap(nAcc,t.get(k)!).toFixed(1),dEwas:+deltaEOk(acc,t.get(k)!).toFixed(3)}]))},
    hover:{from:hov,to:nHov,before:g("",hov),after:g("",nHov)},
    faint:{from:faint,to:nFaint,before:g("",faint),after:g("",nFaint),chroma:+chroma(nFaint).toFixed(4),hueShift:+hueGap(faint,nFaint).toFixed(2),
      dLtoMutedBefore:+(lch(muted).L-lch(faint).L).toFixed(3),dLtoMutedAfter:+(lch(muted).L-lch(nFaint).L).toFixed(3),
      mutedOnElevated:+contrast(muted,t.get("elevated")!).toFixed(2), placeholder:t.get("fg-placeholder"), locked:t.get("fg-locked"),
      lockedGapAfter:+(lch(nFaint).L-lch(t.get("fg-locked")!).L).toFixed(3)},
    muted,
  };
}
writeFileSync(`solve-${TARGET}.json`,JSON.stringify(out,null,1));
for(const [n,r] of Object.entries<any>(out.themes)){
  console.log(n.padEnd(9),"accent",r.accent.from,"→",r.accent.to,"min",Math.min(...r.accent.after),"hue±",r.accent.hueShift,"bgLabel",r.accent.bgLabel,
   "minSep", Object.entries<any>(r.accent.sep).sort((a,b)=>a[1].dE-b[1].dE).slice(0,2).map(([k,v])=>`${k}:${v.dE}(was ${v.dEwas}) ${v.hue}°`).join(" "));
  console.log(" ".repeat(9),"hover ",r.hover.from,"→",r.hover.to,"min",Math.min(...r.hover.after));
  console.log(" ".repeat(9),"faint ",r.faint.from,"→",r.faint.to,"min",Math.min(...r.faint.after),"C",r.faint.chroma,"hue±",r.faint.hueShift,"ΔL→muted",r.faint.dLtoMutedBefore,"→",r.faint.dLtoMutedAfter, "muted@elev",r.faint.mutedOnElevated);
}
