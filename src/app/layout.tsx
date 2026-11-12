import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import Shell from "../components/shell/shell";
import { SIGN_IN_PATH, SIGN_UP_PATH } from "../components/public/links";
import { TASK_URLS } from "../lib/auth/session-tasks";
import { resolveTheme } from "../lib/theme/server";
import { preload } from "react-dom";
import { MANA_SPRITE_PATH } from "../lib/cards/mana-sprite";
import { ZoneCookie } from "../components/zone-cookie";
import { ServiceWorker } from "../components/shell/service-worker";
import { HomeUnderneath } from "../components/shell/home-underneath";
import { Analytics } from "../components/shell/analytics";
import { INSTALL_PROMPT_CAPTURE } from "../lib/pwa/install-detect";
import { LAUNCH_DETECT } from "../lib/pwa/launch-detect";
import { STARTUP_IMAGES } from "../lib/pwa/startup-images";
import { FONT_VARIABLES } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "The 99",
  description: "MTG Commander companion",
  // What iOS draws while the installed app launches (`lib/pwa/startup-images.ts`). Android draws its own from the manifest.
  appleWebApp: { startupImage: STARTUP_IMAGES },
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
    // renders it: signing in is the app's own page and managing the account opens Clerk's hosted page
    // (Hugh, 2026-10-12), so on a slow phone that bundle no longer shares the line with the app's own.
    // `signInUrl` and `signUpUrl` send every `<SignInButton mode="redirect">` to the app's own pages, with
    // the page to come back to as `redirect_url` (the proxy hands `auth.protect()` the same two).
    // `taskUrls`: a session left pending by a session task goes to the app's `/sign-in/tasks/<key>`, which hands it to
    // Clerk's hosted task page; the app draws no task screens (`lib/auth/session-tasks.ts`).
    <ClerkProvider prefetchUI={false} signInUrl={SIGN_IN_PATH} signUpUrl={SIGN_UP_PATH} taskUrls={TASK_URLS}>
      {/* `suppressHydrationWarning`: the launch script below sets `data-launch` on this element while the document
          parses, so the attribute is in the DOM before React hydrates and in none of its markup. It is the one
          attribute written there, and only a cold start of the installed app writes it (`launch-detect.ts`). */}
      <html
        lang="en"
        data-theme={theme}
        className={`${FONT_VARIABLES} h-full antialiased`}
        suppressHydrationWarning
      >
        <head>
          {/* Keeps an install offer that arrives before hydration (`install-detect.ts`). A plain
              inline script, not next/script: `beforeInteractive` waits for Next's own bootstrap. */}
          <script dangerouslySetInnerHTML={{ __html: INSTALL_PROMPT_CAPTURE }} />
          {/* Marks a cold start of the installed app before the first paint, so the app loader's overlay is on screen
              in the first frame (`launch-detect.ts`). Inline for the same reason as the script above. */}
          <script dangerouslySetInnerHTML={{ __html: LAUNCH_DETECT }} />
        </head>
        {/* Signed-out routes render without the shell, so the stretch chain has
            to start here or a full-height child has nothing to grow into. */}
        <body className="flex min-h-full flex-col bg-[color:var(--bg)] text-[color:var(--fg)]">
          <Shell theme={theme}>{children}</Shell>
          <ServiceWorker />
          <HomeUnderneath />
          <ZoneCookie />
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  );
}
