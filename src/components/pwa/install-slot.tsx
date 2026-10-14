"use client";

import { useCallback, useEffect, useState } from "react";

import { pwaInstallCopy as copy } from "../../lib/copy/pwa-install";
import { dismissOnce, dismissalState } from "../../lib/pwa/install-dismissal";
import { isIphoneSafari, isStandalone, takeEarlyPrompt, type BeforeInstallPromptEvent } from "../../lib/pwa/install-detect";
import { IosInstallSheet } from "./ios-install-sheet";

/**
 * The install slot in the phone header (Concert Crawl's `InstallSlot`; phone only by d9's call 1, since
 * desktop browsers show their own install button). It holds the browser's `beforeinstallprompt` and
 * shows that prompt on a press; on iPhone Safari, which has no such event, the press opens the how-to
 * sheet. It draws nothing once installed, after a dismiss (`install-dismissal.ts`), or when there is
 * neither a held prompt nor iPhone Safari. It decides after mount, so the server draws nothing.
 */
export function InstallSlot() {
  const [held, setHeld] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    // Read after mount on purpose: none of these exist on the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIos(isIphoneSafari());
    setHeld(takeEarlyPrompt());
    setDismissed(dismissalState() !== "active");
    const onPrompt = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      // The head script keeps the event too; this one is held here, so it is taken from there.
      takeEarlyPrompt();
      setHeld(event);
    };
    const onInstalled = () => setHeld(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const onPress = useCallback(async () => {
    if (!held) {
      if (ios) setSheetOpen(true);
      return;
    }
    try {
      await held.prompt();
      await held.userChoice;
    } catch {
      // The browser refused the prompt; the slot just goes.
    } finally {
      setHeld(null);
    }
  }, [held, ios]);

  if (dismissed || (!held && !ios)) return null;
  return (
    <>
      <div className="flex items-center" data-install-slot>
        <button
          type="button"
          onClick={onPress}
          aria-label={copy.slotAria}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-[6px] rounded-[12px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-raised)] px-[10px] text-[13px] font-semibold text-[color:var(--fg)]"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 2v7M7 9L4 6M7 9l3-3M2 12h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="hidden sm:inline">{copy.slotLabel}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            dismissOnce();
            setDismissed(true);
          }}
          aria-label={copy.dismissAria}
          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center text-[color:var(--fg-faint)]"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {sheetOpen ? <IosInstallSheet onClose={() => setSheetOpen(false)} /> : null}
    </>
  );
}
