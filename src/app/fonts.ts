import localFont from "next/font/local";

// The root layout and `global-error.tsx` both draw a whole document, and global-error replaces the
// layout rather than rendering inside it, so the faces are declared once here and carried by both.

// SELF-HOSTED, not `next/font/google`.
//
// `next/font/google` fetches from Google at BUILD time, so a network blip is a
// failed build rather than a slow one: CI's Build step failed twice overnight
// doing exactly that and passed on a re-run. The files now live in
// `./fonts/`, fetched once by `pnpm fetch:fonts`, which is the only thing that
// may change them — it downloads exactly the weights declared here, at the latin
// subset, and refuses anything that is not a woff2.
//
// Every family keeps its variable name, weights, `display` and `preload`, so
// nothing about what renders changes. The licences sit beside the files because
// self-hosting is redistribution: Syncopate is Apache, the other seven are OFL.
//
// The six display faces, one per theme. `preload: false` on every one of them
// is load-bearing: Next emits all six @font-face blocks unconditionally, and the
// browser only fetches a family when it first renders an element matched by a
// rule using it. Since only the active theme's --font-display-face is ever
// resolved, only that family is fetched — unless a <link rel="preload"> drags
// all six down on every page, which is exactly what preload: true does.
//
// That is invisible to a screenshot, which is why the parity probe counts font
// REQUESTS on a cold load rather than only comparing computed font-family.
const cinzel = localFont({
  // ONE variable file for the whole 600-900 span, which is what
  // `next/font/google` was serving. Four static weights render identically and
  // cost three extra requests on any page that draws more than one of them.
  src: [{ path: "./fonts/cinzel-variable.woff2", weight: "600 900", style: "normal" }],
  variable: "--font-cinzel",
  display: "swap",
  preload: false,
  // SERIF. `next/font/google` derived the metric-matched fallback from the
  // family's category; `next/font/local` defaults to Arial for every face, so a
  // serif display face would swap in from sans-serif metrics and shift the line.
  adjustFontFallback: "Times New Roman",
});

const chakraPetch = localFont({
  src: [
    { path: "./fonts/chakra-petch-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/chakra-petch-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/chakra-petch-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-chakra-petch",
  display: "swap",
  preload: false,
});

const trirong = localFont({
  src: [
    { path: "./fonts/trirong-600.woff2", weight: "600", style: "normal" },
    { path: "./fonts/trirong-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-trirong",
  display: "swap",
  preload: false,
  // SERIF. `next/font/google` derived the metric-matched fallback from the
  // family's category; `next/font/local` defaults to Arial for every face, so a
  // serif display face would swap in from sans-serif metrics and shift the line.
  adjustFontFallback: "Times New Roman",
});

const syncopate = localFont({
  src: [
    { path: "./fonts/syncopate-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/syncopate-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-syncopate",
  display: "swap",
  preload: false,
});

// The lightest display face in the set. 400 is deliberately not loaded: the
// handoff rules it out at heading sizes, and omitting it means a display site
// that asks for 400 anyway resolves to the real 600 rather than to a stem that
// vanishes.
const cormorantGaramond = localFont({
  src: [{ path: "./fonts/cormorant-garamond-variable.woff2", weight: "600 700", style: "normal" }],
  variable: "--font-cormorant-garamond",
  display: "swap",
  preload: false,
  // SERIF. `next/font/google` derived the metric-matched fallback from the
  // family's category; `next/font/local` defaults to Arial for every face, so a
  // serif display face would swap in from sans-serif metrics and shift the line.
  adjustFontFallback: "Times New Roman",
});

// Metamorphous ships exactly one static weight, 400. See the First Frost rule in
// globals.css for what that means for `font-bold`.
const metamorphous = localFont({
  src: [{ path: "./fonts/metamorphous-400.woff2", weight: "400", style: "normal" }],
  variable: "--font-metamorphous",
  display: "swap",
  preload: false,
});

// THE ONLY FAMILY WITH A STYLE AXIS. `style: ["normal", "italic"]` was declared
// here before self-hosting, and dropping it renders every italic in body text as
// a browser-synthesized oblique of the upright rather than the real italic face.
//
// TWO CALLS, ONE FAMILY. `preload` is per call, and no first screen draws the italic
// (measured on staging, 2026-10-13: 0 of 18 route and width first screens). Preloaded,
// its 44KB shared a slow phone's line with the one render-blocking stylesheet on every
// page. So the italic is its own call, not preloaded, and names the upright's family in
// its `@font-face` (`declarations`; both calls spell the family out, since a font call takes
// literals only), which is what keeps `font-style: italic` picking
// the real italic face rather than a synthesized oblique. It brings no fallback face of
// its own: the upright's metric-matched fallback already carries that name.
const plexSans = localFont({
  src: [{ path: "./fonts/ibm-plex-sans-variable.woff2", weight: "400 600", style: "normal" }],
  variable: "--font-plex-sans",
  declarations: [{ prop: "font-family", value: "plexSans" }],
  display: "swap",
});

const plexSansItalic = localFont({
  src: [{ path: "./fonts/ibm-plex-sans-italic-variable.woff2", weight: "400 600", style: "italic" }],
  // Read by nothing: it is on <html> only so the @font-face is emitted with the rest.
  variable: "--font-plex-sans-italic",
  declarations: [{ prop: "font-family", value: "plexSans" }],
  adjustFontFallback: false,
  display: "swap",
  preload: false,
});

const plexMono = localFont({
  src: [
    { path: "./fonts/ibm-plex-mono-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/ibm-plex-mono-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/ibm-plex-mono-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});

/** Every family's CSS variable, for the `<html>` of a document this app draws. */
export const FONT_VARIABLES = [
  cinzel, chakraPetch, trirong, syncopate, cormorantGaramond, metamorphous, plexSans, plexSansItalic, plexMono,
].map((font) => font.variable).join(" ");
