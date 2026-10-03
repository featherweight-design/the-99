"use client";

// An upload that completes while this page is open does NOT relight the grid.
//
// A page that silently refills cells while someone is reading it destroys the one thing
// this surface sells: that what you see is what you own. So the stale page holds every
// figure it was serving and offers the update as an act.
//
// Nothing in the app pushes, and the handoff names no mechanism — so this asks on window
// focus and compares the answer to what the page was rendered with. Not a toast (it
// expires, and a reader who scrolled past would keep reading a page they had been told was
// wrong), and not dismissible (it leaves when the grid is right).
//
// A FINGERPRINT rather than a count: swapping one owned printing for another, or changing
// its finish, leaves a count identical while the art and the foil mark on screen are
// stale. The strip says how many cards moved, and renders whenever anything did.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ownedFingerprintForSet } from "../../app/collection/(list)/sets/actions";
import { holdingCountOf } from "../../lib/sets/completion";
import { setPageCopy } from "../../lib/copy/set-collections";



export function DeltaStrip({
  code,
  fingerprint,
  indexed,
  recheckKey,
  onFiring,
}: {
  code: string;
  /** What the page was rendered against. */
  fingerprint: string;
  /**
   * Changes whenever something in this tab could have moved a fill — closing the card
   * modal, where the printing picker lives. Window focus never fires for a same-tab
   * action, so without this a pick made in the modal changed the grid's data and the page
   * went on showing the old cell with nothing offering a refresh.
   */
  recheckKey?: string;
  /**
   * Only poll an indexed set. While the catalog is mid-refresh the page renders no cells
   * at all, so its baseline is empty and any classified row the server counts would read
   * as an upload the reader never made.
   */
  indexed: boolean;
  /**
   * §31: while this strip is showing a message the head may not collapse — it is the one
   * member of that block which is news rather than reference, and collapsing it away hides
   * the only offer to refresh a page the reader has been told is stale.
   */
  onFiring?: (firing: boolean) => void;
}) {
  const router = useRouter();
  const [changed, setChanged] = useState<string | null>(null);
  // Every focus event starts a request and they can resolve out of order; only the latest
  // may speak, exactly as the index's search does.
  const latest = useRef(0);

  useEffect(() => {
    if (!indexed) return;
    let cancelled = false;
    const check = () => {
      const ticket = ++latest.current;
      void ownedFingerprintForSet(code)
        .then((now) => {
          if (cancelled || ticket !== latest.current) return;
          setChanged(now === fingerprint ? null : now);
        })
        .catch(() => {
          // A failed check leaves the page exactly as it was, which is the honest default.
        });
    };
    window.addEventListener("focus", check);
    // Also on mount and whenever `recheckKey` changes, which is what catches a same-tab
    // pick: the modal closing is the moment the fill may have moved.
    if (recheckKey !== undefined) check();
    return () => {
      cancelled = true;
      window.removeEventListener("focus", check);
    };
  }, [code, fingerprint, indexed, recheckKey]);

  const firing = indexed && changed !== null;
  // A LAYOUT effect, so the head opens on the same frame this message appears. A passive
  // one runs after paint, which put the message under the collapsed one-row bar for a
  // frame. Still an effect and not render: this is a parent's state, and setting it while
  // rendering a child is the update-during-render React refuses.
  useLayoutEffect(() => {
    onFiring?.(firing);
    // Going FALSE on unmount matters as much as going true: the head would otherwise stay
    // pinned open after the strip left the page.
    return () => onFiring?.(false);
  }, [firing, onFiring]);

  // `indexed` can go true to false under a catalog rebuild without this remounting, and a
  // retained `changed` would then report an upload delta on a page with no baseline.
  if (!firing) return null;

  // Holdings only. A pick is part of the fingerprint — it changes which cell is filled —
  // but it is not a card gained or lost, and counting it said one had been.
  const delta = holdingCountOf(changed) - holdingCountOf(fingerprint);

  return (
    // A polite live region: the strip appears after a focus-time check rather than after
    // anything the reader did, so without this a screen-reader user is never told the page
    // they are reading has gone stale.
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="mt-[10px] flex flex-wrap items-center gap-[10px] rounded-[8px] px-[10px] py-[8px]"
      style={{ border: "1px solid var(--accent)", background: "var(--surface-sunken)" }}
    >
      <span className="text-[12px]" style={{ color: "var(--fg-body)" }}>
        {delta > 0
          ? setPageCopy.staleAfterUpload.line(delta)
          : delta < 0
            ? setPageCopy.staleAfterUpload.removed(-delta)
            : setPageCopy.staleAfterUpload.swapped}
      </span>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="ml-auto min-h-[44px] md:min-h-[32px] rounded-[6px] px-[10px] text-[12px]
                   text-[color:var(--accent)] border border-[color:var(--accent)]
                   hover:bg-[color:var(--elevated)]"
      >
        {setPageCopy.staleAfterUpload.action}
      </button>
    </div>
  );
}
