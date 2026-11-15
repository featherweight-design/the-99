"use client";

import { useCardSearch } from "../card-search/card-search";
import { useHelpOn } from "../help/help-root";
import { useOnlineStatus } from "../../lib/pwa/use-online-status";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { pwaInstallCopy as copy } from "../../lib/copy/pwa-install";
import { dismissOnce, dismissalState } from "../../lib/pwa/install-dismissal";
import { iphoneInstallBrowser, isStandalone, takeEarlyPrompt, type BeforeInstallPromptEvent, type InstallBrowser } from "../../lib/pwa/install-detect";
import { markInstalledAction } from "../../app/install-actions";
import { TargetBox } from "../discovery/targets-provider";
import { installServerState, installState, offerInstallAsk, retireInstallRow, subscribeInstall } from "./install-ask";
import { IosInstallSheet } from "./ios-install-sheet";

/** Set once this launch has stamped (or tried to stamp) `installed_at`: the installed app's window gets a fresh
 * `sessionStorage` on every launch, as the app loader's `LAUNCH_SEEN_KEY` relies on. */
const INSTALLED_STAMP_KEY = "the99.installed.stamped";

/**
 * Stamps the account as installed from the installed app on a phone (install onboarding call 7): once per launch, and
 * only while the shell read the stamp as unset. A phone only, since the slot only ever asks phones (d9 call 1): an
 * install on a desktop says nothing about the phone. A failed write is tried again on the next launch.
 */
function stampInstalled(): void {
  try {
    // By the device, not the window: a phone held sideways is wider than any breakpoint, and a tablet is not a phone.
    if (!/iPhone|iPod|Android.*Mobile/.test(navigator.userAgent)) return;
    if (window.sessionStorage.getItem(INSTALLED_STAMP_KEY)) return;
    window.sessionStorage.setItem(INSTALLED_STAMP_KEY, "1");
  } catch {
    // Storage blocked: stamp anyway. The write is a no-op once the stamp is set.
  }
  markInstalledAction().catch(() => {
    try {
      window.sessionStorage.removeItem(INSTALLED_STAMP_KEY);
    } catch {
      // Nothing to undo.
    }
  });
}

/**
 * The install slot in the phone header (Concert Crawl's `InstallSlot`; phone only by d9's call 1, since
 * desktop browsers show their own install button). It holds the browser's `beforeinstallprompt` and
 * shows that prompt on a press; on an iPhone in Safari, Chrome or Firefox, which have no such event, the press opens the how-to
 * sheet for that browser. It draws nothing once installed, after a dismiss (`install-dismissal.ts`), or when there is
 * neither a held prompt nor one of those iPhone browsers, nor once the account has opened the installed app on a phone
 * (`installed`, `user_prefs.installed_at`; the installed app itself stamps it). It decides after mount, so the server
 * draws nothing.
 */
export function InstallSlot({ installed }: { installed: boolean }) {
  const search = useCardSearch() !== null;
  const help = useHelpOn();
  const online = useOnlineStatus();
  const crowd = online ? "" : search && help ? "max-[429px]:hidden" : search || help ? "max-[390px]:hidden" : "";
  const [held, setHeld] = useState<BeforeInstallPromptEvent | null>(null);
  const [browser, setBrowser] = useState<InstallBrowser | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      if (!installed) stampInstalled();
      return;
    }
    // Installed elsewhere on this account: no ask in any browser (install onboarding call 7).
    if (installed) return;
    // Read after mount on purpose: none of these exist on the server.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBrowser(iphoneInstallBrowser());
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
  }, [installed]);

  const onPress = useCallback(async () => {
    // Selecting the ask anywhere retires the checklist's fallback row for good (install onboarding G6).
    retireInstallRow();
    if (!held) {
      if (browser) setSheetOpen(true);
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
  }, [held, browser]);

  // `installed` read here too: a tab open since before the stamp keeps its state when the shell hands it true.
  const drawn = !installed && !dismissed && (held !== null || browser !== null);
  const button = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  // While it draws on a phone, the tour's Install stop can ask which ask this is and press it (install onboarding G2). A
  // held prompt in a narrow desktop window still draws the slot as shipped, but offers no tour stop: its copy is a phone's.
  useEffect(() => {
    if (!drawn) return;
    const kind = browser ?? (/Android.*Mobile/.test(navigator.userAgent) ? "android" : null);
    if (!kind) return;
    return offerInstallAsk({
      kind,
      press: () => void onPress(),
      button: () => button.current,
      dismiss: () => {
        dismissOnce();
        setDismissed(true);
      },
      closeButton: () => closeButton.current,
    });
  }, [drawn, browser, onPress]);

  // The checklist's fallback row is the ask while it draws: the slot steps aside, keeping its ask offered (the row presses
  // it) and its sheet. When the row goes, the slot reads its dismissal again, since the row's ✕ counted as one.
  const { row } = useSyncExternalStore(subscribeInstall, installState, installServerState);
  const [rowWas, setRowWas] = useState(row);
  if (row !== rowWas) {
    setRowWas(row);
    if (!row) setDismissed(dismissalState() !== "active");
  }

  if (!drawn) return null;
  if (row) return sheetOpen && browser ? <IosInstallSheet browser={browser} onClose={() => setSheetOpen(false)} /> : null;
  return (
    <>
      {/* While offline the slot steps aside when the header cannot hold it, and returns the moment the offline pill
          goes (card search G5). The widths, from `MobileHeader` in nav.tsx, measured in Chromium with the app's IBM
          Plex Mono (PR #2023, round 2): padding 40 (px-5 twice), wordmark 64 ("THE" 27 + gap 3 + the 99's 34px
          svg), Offline pill 96.4 (88.4 + mr 8), this slot 88 (two 44px buttons, its label hidden below sm), card
          search 46 (44 + mr 2), the ? 50 (44 + the 6px gap), avatar 44 (38 + its 3px ring). With card search AND the ?
          that is 428.4px, so the slot goes below 429px; with one of them 378.4 (search) or 382.4 (the ?), so G5's
          390px holds for either. Without the slot the fullest header is 340.4px, inside the narrowest phone (360). */}
      <div className={`relative flex items-center ${crowd}`} data-install-slot>
        {/* The tour's Install stop lights the whole slot, Install and its ✕ (install onboarding call 3). */}
        <TargetBox id="tour:install" />
        <button
          ref={button}
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
          ref={closeButton}
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
      {sheetOpen && browser ? <IosInstallSheet browser={browser} onClose={() => setSheetOpen(false)} /> : null}
    </>
  );
}
