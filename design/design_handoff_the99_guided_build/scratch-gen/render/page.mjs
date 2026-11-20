import { readFileSync, writeFileSync } from "node:fs";
const F = "../src/app/fonts/";
const faces = [["Cinzel","cinzel-variable","600 900"],["Chakra","chakra-petch-500","500"],["Chakra","chakra-petch-600","600"],["Chakra","chakra-petch-700","700"],["Trirong","trirong-600","600"],["Trirong","trirong-700","700"],["Syncopate","syncopate-400","400"],["Syncopate","syncopate-700","700"],["Cormorant","cormorant-garamond-variable","600 700"],["Metamorphous","metamorphous-400","400"],["PlexSans","ibm-plex-sans-variable","400 600"],["PlexMono","ibm-plex-mono-400","400"],["PlexMono","ibm-plex-mono-500","500"],["PlexMono","ibm-plex-mono-600","600"]]
 .map(([f,file,w])=>`@font-face{font-family:${f};src:url(${F}${file}.woff2) format("woff2");font-weight:${w};font-style:normal}`).join("")
 + `@font-face{font-family:PlexSans;src:url(${F}ibm-plex-sans-italic-variable.woff2) format("woff2");font-weight:400 600;font-style:italic}`;
const vars = `html{--font-cinzel:Cinzel;--font-chakra-petch:Chakra;--font-trirong:Trirong;--font-syncopate:Syncopate;--font-cormorant-garamond:Cormorant;--font-metamorphous:Metamorphous;--font-plex-sans:PlexSans;--font-plex-mono:PlexMono}`;
const still = `*,*::before,*::after{animation:none!important;transition:none!important}`;
export function page(body, theme = "amonkhet", extra = "") {
  return `<!doctype html><html data-theme="${theme}" class="h-full antialiased"><head><meta charset="utf-8"><link rel="stylesheet" href="app.css"><style>${faces}${vars}${still}${extra}</style></head><body class="flex min-h-full flex-col bg-[color:var(--bg)] text-[color:var(--fg)]">${body}</body></html>`;
}
// shell: phone top header + bottom nav; desktop rail
export function shell(dev, tab, inner, full = false) {
  if (dev === "p" && full) return `<div style="height:78px;background:url(shell-p-top-${tab}.png) 0 0/390px 78px"></div>${inner}<div style="height:75px;background:url(shell-p-nav-${tab}.png) 0 0/390px 75px"></div>`;
  if (dev === "p") return `<div style="position:fixed;top:0;left:0;right:0;height:78px;background:url(shell-p-top-${tab}.png) 0 0/390px 78px;z-index:5"></div><div style="padding-top:78px;padding-bottom:75px">${inner}</div><div style="position:fixed;bottom:0;left:0;right:0;height:75px;background:url(shell-p-nav-${tab}.png) 0 0/390px 75px;z-index:5"></div>`;
  return `<div style="position:fixed;top:0;bottom:0;left:0;width:62px;background:rgb(25,22,16);z-index:5"><div style="position:absolute;top:0;left:0;width:62px;height:533px;background:url(rail-top-${tab}.png) 0 0/62px 533px"></div><div style="position:absolute;bottom:0;left:0;width:62px;height:133px;background:url(rail-bot-${tab}.png) 0 0/62px 133px"></div></div><div style="margin-left:62px">${inner}</div>`;
}
