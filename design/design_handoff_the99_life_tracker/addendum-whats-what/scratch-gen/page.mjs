const F = "file://<repo>/src/app/fonts/";
const faces = [["Cinzel","cinzel-variable","400 900"],["PlexSans","ibm-plex-sans-variable","400 700"],["PlexMono","ibm-plex-mono-400","400"],["PlexMono","ibm-plex-mono-500","500"],["PlexMono","ibm-plex-mono-600","600"],["Chakra","chakra-petch-600","600"],["Trirong","trirong-600","600"],["Cormorant","cormorant-garamond-variable","600 700"]]
 .map(([f,file,w])=>`@font-face{font-family:${f};src:url(${F}${file}.woff2) format("woff2");font-weight:${w};font-style:normal}`).join("");
const vars = `html{--font-cinzel:Cinzel;--font-chakra-petch:Chakra;--font-trirong:Trirong;--font-cormorant-garamond:Cormorant;--font-plex-sans:PlexSans;--font-plex-mono:PlexMono}`;
export function page({ fix, css = "app.css", js = "app.js", extra = "" }) {
  return `<!doctype html><html data-theme="amonkhet" class="h-full antialiased"><head><meta charset="utf-8"><link rel="stylesheet" href="${css}"><style>${faces}${vars}</style>${extra}</head><body class="flex min-h-full flex-col bg-[color:var(--bg)] text-[color:var(--fg)]"><div id="root" class="flex flex-1 flex-col"></div><script>window.FIX=${JSON.stringify(fix)}</script><script type="module" src="${js}"></script></body></html>`;
}
