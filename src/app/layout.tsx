import type { Metadata } from "next";
import {
  Chakra_Petch,
  Cinzel,
  Cormorant_Garamond,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
  Metamorphous,
  Syncopate,
  Trirong,
} from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import Shell from "../components/shell/shell";
import { clerkAppearance } from "../lib/shell/clerk-appearance";
import { resolveTheme } from "../lib/theme/server";
import "./globals.css";

// The six display faces, one per theme. `preload: false` on every one of them
// is load-bearing: Next emits all six @font-face blocks unconditionally, and the
// browser only fetches a family when it first renders an element matched by a
// rule using it. Since only the active theme's --font-display-face is ever
// resolved, only that family is fetched — unless a <link rel="preload"> drags
// all six down on every page, which is exactly what preload: true does.
const cinzel = Cinzel({
  variable: "--font-cinzel",
  weight: ["600", "700", "800", "900"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const chakraPetch = Chakra_Petch({
  variable: "--font-chakra-petch",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const trirong = Trirong({
  variable: "--font-trirong",
  weight: ["600", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const syncopate = Syncopate({
  variable: "--font-syncopate",
  weight: ["400", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

// The lightest display face in the set. 400 is deliberately not loaded: the
// handoff rules it out at heading sizes, and omitting it means a display site
// that asks for 400 anyway resolves to the real 600 rather than to a stem that
// vanishes.
const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  weight: ["600", "700"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

// Metamorphous ships exactly one static weight, 400. See the First Frost rule in
// globals.css for what that means for `font-bold`.
const metamorphous = Metamorphous({
  variable: "--font-metamorphous",
  weight: ["400"],
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
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
        </body>
      </html>
    </ClerkProvider>
  );
}
