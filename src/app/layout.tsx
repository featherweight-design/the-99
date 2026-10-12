import type { Metadata } from "next";
import localFont from "next/font/local";
import { ClerkProvider } from "@clerk/nextjs";
import Shell from "../components/shell/shell";
import { clerkAppearance } from "../lib/shell/clerk-appearance";
import { resolveTheme } from "../lib/theme/server";
import { preload } from "react-dom";
import { MANA_SPRITE_PATH } from "../lib/cards/mana-sprite";
import { ServiceWorker } from "../components/shell/service-worker";
import "./globals.css";

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
const plexSans = localFont({
  src: [
    { path: "./fonts/ibm-plex-sans-variable.woff2", weight: "400 600", style: "normal" },
    { path: "./fonts/ibm-plex-sans-italic-variable.woff2", weight: "400 600", style: "italic" },
  ],
  variable: "--font-plex-sans",
  display: "swap",
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

export const metadata: Metadata = {
  title: "The 99",
  description: "MTG Commander companion",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Resolved on the server and written into the markup, so the first paint is
  // already in the chosen theme. A client-side read would paint Amonkhet first
  // and then swap, which is the flash the cookie exists to avoid.
  const theme = await resolveTheme();
  // Every mana symbol, in one file, asked for in the head of every document: pips are drawn on most
  // routes and in the card modal that opens from all of them, and a symbol fetched only when its pip
  // painted showed an empty box first (Hugh, 2026-09-28). See `mana-sprite.ts`.
  preload(MANA_SPRITE_PATH, { as: "image", type: "image/svg+xml" });
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html
        lang="en"
        data-theme={theme}
        className={`${cinzel.variable} ${chakraPetch.variable} ${trirong.variable} ${syncopate.variable} ${cormorantGaramond.variable} ${metamorphous.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
      >
        {/* Signed-out routes render without the shell, so the stretch chain has
            to start here or a full-height child has nothing to grow into. */}
        <body className="flex min-h-full flex-col bg-[color:var(--bg)] text-[color:var(--fg)]">
          <Shell theme={theme}>{children}</Shell>
          <ServiceWorker />
        </body>
      </html>
    </ClerkProvider>
  );
}
