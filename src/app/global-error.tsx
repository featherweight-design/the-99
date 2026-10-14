"use client";
// The root layout itself threw. This REPLACES the layout, so it draws its own document: the
// stylesheet, the fonts and the reader's theme, which the layout reads from a cookie on the server
// and this has to read on the client. No shell: the shell is part of what failed.

import { useSyncExternalStore } from "react";

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
      <body className="flex min-h-full flex-col justify-center bg-[color:var(--bg)] text-[color:var(--fg)]">
        <title>The 99</title>
        <ErrorNotice boundary="root" error={error} retry={retry} />
      </body>
    </html>
  );
}
