const F = "fonts/";
const faces = [["Cinzel","cinzel-variable","600 900"],["PlexSans","ibm-plex-sans-variable","400 600"],["PlexMono","ibm-plex-mono-400","400"],["PlexMono","ibm-plex-mono-500","500"],["PlexMono","ibm-plex-mono-600","600"],["Chakra","chakra-petch-600","600"],["Trirong","trirong-600","600"],["Cormorant","cormorant-garamond-variable","600 700"],["Metamorphous","metamorphous-400","400"]]
 .map(([f,file,w])=>`@font-face{font-family:${f};src:url(${F}${file}.woff2) format("woff2");font-weight:${w};font-style:normal}`).join("");
const vars = `html{--font-cinzel:Cinzel;--font-chakra-petch:Chakra;--font-trirong:Trirong;--font-cormorant-garamond:Cormorant;--font-metamorphous:Metamorphous;--font-plex-sans:PlexSans;--font-plex-mono:PlexMono}`;
export function page(body, theme) {
  return `<!doctype html><html data-theme="${theme}" class="h-full antialiased"><head><meta charset="utf-8"><link rel="stylesheet" href="app.css"><style>${faces}${vars}</style></head><body class="flex min-h-full flex-col bg-[color:var(--bg)] text-[color:var(--fg)]">${body}</body></html>`;
}
