import { readFileSync, writeFileSync } from "node:fs";
const F = "../src/app/fonts/";
const faces = [["Cinzel","cinzel-variable","600 900"],["Chakra","chakra-petch-500","500"],["Chakra","chakra-petch-600","600"],["Chakra","chakra-petch-700","700"],["Trirong","trirong-600","600"],["Trirong","trirong-700","700"],["Syncopate","syncopate-400","400"],["Syncopate","syncopate-700","700"],["Cormorant","cormorant-garamond-variable","600 700"],["Metamorphous","metamorphous-400","400"],["PlexSans","ibm-plex-sans-variable","400 600"],["PlexMono","ibm-plex-mono-400","400"],["PlexMono","ibm-plex-mono-500","500"],["PlexMono","ibm-plex-mono-600","600"]]
 .map(([f,file,w])=>`@font-face{font-family:${f};src:url(${F}${file}.woff2) format("woff2");font-weight:${w};font-style:normal}`).join("")
 + `@font-face{font-family:PlexSans;src:url(${F}ibm-plex-sans-italic-variable.woff2) format("woff2");font-weight:400 600;font-style:italic}`;
const vars = `html{--font-cinzel:Cinzel;--font-chakra-petch:Chakra;--font-trirong:Trirong;--font-syncopate:Syncopate;--font-cormorant-garamond:Cormorant;--font-metamorphous:Metamorphous;--font-plex-sans:PlexSans;--font-plex-mono:PlexMono}`;
export function page(body, theme) {
  return `<!doctype html><html data-theme="${theme}" class="h-full antialiased"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="app.css"><style>${faces}${vars}</style></head><body class="flex min-h-full flex-col bg-[color:var(--bg)] text-[color:var(--fg)]">${body}</body></html>`;
}
if (process.argv[2]) { const [, , inp, theme, out] = process.argv; writeFileSync(out, page(readFileSync(inp, "utf8"), theme)); }
