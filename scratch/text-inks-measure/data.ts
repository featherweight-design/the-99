import { readFileSync, writeFileSync } from "node:fs";
import { contrast, hueGap, deltaEOk, oklab, chroma } from "./color.ts";
import { parseThemeBlocks } from "./parse-css.ts";
const T = parseThemeBlocks(readFileSync("/home/claude/the-99/src/app/globals.css","utf8"));
const G = ["bg","surface","surface-raised","surface-sunken","surface-rail","elevated"];
const NEW:any={amonkhet:{"fg-faint":"#948B78"},kamigawa:{"fg-faint":"#84899B"},ixalan:{"fg-faint":"#879383"},
 phyrexia:{"accent-text":"#5D8E85","accent-hover":"#6E9D95","fg-faint":"#87838D"},eldraine:{"fg-faint":"#8F899B"},
 kaldheim:{"accent":"#6C97DB","accent-hover":"#7CA6EA","fg-faint":"#8A999B"}};
const out:any={};
for(const [n,t] of T){
  const inks=Object.entries<string>(NEW[n]).map(([k,v])=>{
    const from = k==="accent-text"? t.get("accent")! : t.get(k)!;
    return {token:k, from, to:v,
      grounds:G.map(g=>({g, hex:t.get(g)!, was:+contrast(from,t.get(g)!).toFixed(2), now:+contrast(v,t.get(g)!).toFixed(2)})),
      minWas:+Math.min(...G.map(g=>contrast(from,t.get(g)!))).toFixed(2), minNow:+Math.min(...G.map(g=>contrast(v,t.get(g)!))).toFixed(2),
      hue:+hueGap(from,v).toFixed(2), C:+chroma(v).toFixed(3), dL:+(oklab(v).L-oklab(from).L).toFixed(3)};
  });
  const muted=t.get("fg-muted")!;
  out[n]={grounds:Object.fromEntries(G.map(g=>[g,t.get(g)])), fg:t.get("fg"), body:t.get("fg-body"), muted, accent:t.get("accent"), success:t.get("success"),
    mutedOn:G.map(g=>+contrast(muted,t.get(g)!).toFixed(2)), inks,
    faintStep:{was:+(oklab(muted).L-oklab(t.get("fg-faint")!).L).toFixed(3), now:+(oklab(muted).L-oklab(NEW[n]["fg-faint"]).L).toFixed(3)}};
}
writeFileSync("data.json",JSON.stringify(out));
for(const [n,d] of Object.entries<any>(out)) console.log(n, d.inks.map((i:any)=>`${i.token} ${i.from}→${i.to} min ${i.minWas}→${i.minNow} hue±${i.hue} dL${i.dL}`).join(" | "), "faintStep",d.faintStep.was,"→",d.faintStep.now, "mutedMin",Math.min(...d.mutedOn));
