"use client";

import { useCardSearch } from "../card-search/card-search";
import { useHelpOn } from "../help/help-root";
import { useOnlineStatus } from "../../lib/pwa/use-online-status";
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
  const search = useCardSearch() !== null;
  const help = useHelpOn();
  const online = useOnlineStatus();
  const crowd = online ? "" : search && help ? "max-[429px]:hidden" : search || help ? "max-[390px]:hidden" : "";
  const [held, setHeld] = useState<BeforeInstallPromptEvent | null>(null);
  const [ios, setIos] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    // Read after mount on purpose: none of these exist on the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIos(isIphoneSafari());
    // Only when there is one: Strict Mode replays this effect, and the replay finds it taken.
    const early = takeEarlyPrompt();
    if (early) setHeld(early);
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
      {/* While offline the slot steps aside when the header cannot hold it, and returns the moment the offline pill
          goes (card search G5). The widths, from `MobileHeader` in nav.tsx, measured in Chromium with the app's IBM
          Plex Mono (PR #2023, round 2): padding 40 (px-5 twice), wordmark 64 ("THE" 27 + gap 3 + the 99's 34px
          svg), Offline pill 96.4 (88.4 + mr 8), this slot 88 (two 44px buttons, its label hidden below sm), card
          search 46 (44 + mr 2), the ? 50 (44 + the 6px gap), avatar 44 (38 + its 3px ring). With card search AND the ?
          that is 428.4px, so the slot goes below 429px; with one of them 378.4 (search) or 382.4 (the ?), so G5's
          390px holds for either. Without the slot the fullest header is 340.4px, inside the narrowest phone (360). */}
      <div className={`flex items-center ${crowd}`} data-install-slot>
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
