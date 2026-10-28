// The About page's captures follow the reader's theme, and they are chosen on the server from the theme cookie. The
// account menu's theme picker repaints the page in place (`data-theme` on <html>, and the cookie) without a round trip,
// so this asks the server again when the theme moves away from the one the page was drawn in. The six themes' manifest
// stays on the server.

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ThemeRefresh({ drawnIn }: { drawnIn: string }) {
  const router = useRouter();
  useEffect(() => {
    const html = document.documentElement;
    const watch = new MutationObserver(() => {
      const now = html.dataset.theme;
      if (now && now !== drawnIn) router.refresh();
    });
    watch.observe(html, { attributes: true, attributeFilter: ["data-theme"] });
    return () => watch.disconnect();
  }, [drawnIn, router]);
  return null;
}
