import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import Shell from "../components/shell/shell";
import { resolveTheme } from "../lib/theme/server";
import { preload } from "react-dom";
import { MANA_SPRITE_PATH } from "../lib/cards/mana-sprite";
import { ServiceWorker } from "../components/shell/service-worker";
import { INSTALL_PROMPT_CAPTURE } from "../lib/pwa/install-detect";
import { FONT_VARIABLES } from "./fonts";
import "./globals.css";

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
    // `prefetchUI={false}`: Clerk's prebuilt UI (261KB over five files) is never fetched. Nothing here
    // renders it: signing in and managing the account both open Clerk's hosted pages (Hugh,
    // 2026-10-12), so on a slow phone that bundle no longer shares the line with the app's own.
    <ClerkProvider prefetchUI={false}>
      <html
        lang="en"
        data-theme={theme}
        className={`${FONT_VARIABLES} h-full antialiased`}
      >
        <head>
          {/* Keeps an install offer that arrives before hydration (`install-detect.ts`). A plain
              inline script, not next/script: `beforeInteractive` waits for Next's own bootstrap. */}
          <script dangerouslySetInnerHTML={{ __html: INSTALL_PROMPT_CAPTURE }} />
        </head>
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
