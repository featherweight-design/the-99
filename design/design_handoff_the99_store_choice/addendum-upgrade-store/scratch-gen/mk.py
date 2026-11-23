import json
J="const d=document.querySelector('[role=dialog]');d.style.height='auto';d.style.maxHeight='none';d.style.overflow='visible';const b=document.querySelector('[data-body]');b.style.overflow='visible';const o=d.parentElement;o.style.position='absolute';o.style.minHeight='100%';o.style.alignItems='flex-start';o.style.paddingTop='24px';[...document.querySelectorAll('*')].forEach(e=>{if(getComputedStyle(e).position==='sticky')e.style.position='static'});"
F=[]
for k in ["u-mp","u-tcg","u-ck","u-ck-gap","u-ck-none","u-off"]:
    F.append({"id":k,"dev":"phone"})
    F.append({"id":k,"dev":"desk","out":k+"-desk","vh":900})
    F.append({"id":k,"dev":"phone","js":J,"full":True,"out":k+"-full"})
json.dump(F,open("dz/sp-up.json","w"))
