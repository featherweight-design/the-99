"use client";

import { pwaCopy } from "../../lib/copy/pwa";
import { useOnlineStatus } from "../../lib/pwa/use-online-status";

/**
 * The offline pill (Concert Crawl's PWA cluster, `OfflinePill`): drawn only while the browser is
 * offline. The live region (`role="status"`, `aria-live="polite"`) is ALWAYS mounted, empty while
 * online, so going offline changes its content and is announced; a region that arrives already
 * filled often is not. It speaks the whole sentence, and the dot's color is never the only signal.
 *
 * `header` sits in the phone's top header, left of the account avatar; `rail` sits at the foot of
 * the desktop rail, above the account trigger, and fits the rail's 62px.
 */
export function OfflinePill({ place }: { place: "header" | "rail" }) {
  const online = useOnlineStatus();
  return (
    <div role="status" aria-live="polite" data-offline-status={place}>
      {online ? null : (
        <div
          data-offline-pill={place}
          className={
            "inline-flex items-center font-mono font-semibold " +
            "bg-[color:color-mix(in_oklab,var(--warning)_14%,transparent)] text-[color:var(--fg)] " +
            // The rail is 62px wide, so there the dot stands above a smaller label rather than beside it.
            (place === "header"
              ? "gap-[6px] rounded-full min-h-[36px] px-[12px] text-[12px] mr-[8px]"
              : "flex-col gap-[4px] rounded-[8px] px-[6px] py-[6px] text-[9px] mb-[10px]")
          }
        >
          <span aria-hidden="true" className="h-[8px] w-[8px] shrink-0 rounded-full bg-[color:var(--warning)]" />
          <span aria-hidden="true">{pwaCopy.offline.pill}</span>
          <span className="sr-only">{pwaCopy.offline.pillAria}</span>
        </div>
      )}
    </div>
  );
}
