"use client";
// The root layout itself threw. This REPLACES the layout, so it draws its own document: the
// stylesheet, the fonts and the reader's theme, which the layout reads from a cookie on the server
// and this has to read on the client. No shell: the shell is part of what failed.

import { useSyncExternalStore } from "react";

import { CrashWordmark } from "../components/feedback/crash-wordmark";
import { reportCopy } from "../lib/copy/report";
import { ErrorNotice } from "../components/shell/error-notice";
import { DEFAULT_THEME, themeCookieValue, themeFor } from "../lib/theme/themes";
import { FONT_VARIABLES } from "./fonts";
import "./globals.css";

function cookieTheme(): string {
  return themeFor(themeCookieValue(document.cookie));
}

const noSubscription = () => () => {};

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  // The server draws the default theme; the client then takes the reader's own.
  const theme = useSyncExternalStore(noSubscription, cookieTheme, () => DEFAULT_THEME);
  return (
    <html lang="en" data-theme={theme} className={`${FONT_VARIABLES} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-[color:var(--bg)] text-[color:var(--fg)]">
        <title>The 99</title>
        <CrashWordmark />
        <ErrorNotice boundary="root" error={error} retry={retry} />
        {/* The error code, when the server gave one (small items 8, board 6: C1); nothing is drawn without it. */}
        {error.digest && (
          <p data-testid="crash-code" className="m-0 pb-[24px] text-center font-mono text-[11px] text-[color:var(--fg-faint)]">
            {reportCopy.codeLine(error.digest)}
          </p>
        )}
      </body>
    </html>
  );
}
