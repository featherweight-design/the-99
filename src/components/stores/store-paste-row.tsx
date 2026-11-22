"use client";

// Store choice, call 6: a store with no whole-list link but a page that takes a pasted list (TCGplayer's Mass Entry,
// Card Kingdom's Deck Builder). The link's 44px row holds two presses 18px apart: Copy the list, in the link's own
// face, writing `1 Name` lines of the shown selection and swapping to ✓ Copied for 1.5s, announced; and the store's
// paste page as an ExternalLink. Nothing is sent to the store: the reader pastes.

import { useState } from "react";
import { storeCopy } from "../../lib/copy/store";
import { pasteListText, type StoreInfo } from "../../lib/stores/info";
import { ExternalLink } from "../ui/external-link";
import { TOUCH_HIT_INLINE } from "../ui/touch-hit";
import { useCopyText } from "../ui/use-copy-text";

// ExternalLink's face on a button, without the link-out icon (it opens nothing).
const PRESS =
  "inline cursor-pointer rounded-[6px] border-0 bg-transparent p-0 text-[14px] font-medium leading-[1.45] text-[color:var(--accent-hover)] " +
  "underline decoration-1 underline-offset-[3px] decoration-[color-mix(in_srgb,var(--accent-hover)_45%,transparent)] " +
  "hover:text-[color:var(--fg)] hover:decoration-[color:var(--fg)] active:text-[color:var(--fg)] active:decoration-[color:var(--fg)] active:decoration-2 " +
  "transition-[color,text-decoration-color,text-decoration-thickness] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";

export function StorePasteRow({ store, lines }: { store: StoreInfo; lines: readonly { name: string; quantity: number }[] }) {
  const [status, setStatus] = useState("");
  const { copied, copy } = useCopyText(
    (ok) => setStatus(ok ? storeCopy.copied : storeCopy.copyFailed),
    () => setStatus(""),
  );
  if (!store.paste || lines.length === 0) return null;
  const count = lines.reduce((n, l) => n + l.quantity, 0);

  return (
    <div data-store-paste={store.id} className="flex min-h-[44px] flex-wrap items-center gap-x-[18px] gap-y-[4px]">
      <button
        type="button"
        data-copy-list=""
        onClick={() => copy(pasteListText(lines))}
        aria-label={copied ? storeCopy.copied : storeCopy.copyAria(count)}
        className={`${TOUCH_HIT_INLINE} ${PRESS}`}
      >
        {copied ? (
          <>
            <span aria-hidden="true" className="mr-[5px] inline-block text-[color:var(--success)]">✓</span>
            {storeCopy.copied}
          </>
        ) : (
          storeCopy.copyList
        )}
      </button>
      <ExternalLink href={store.paste.url} label={storeCopy.openPaste(store)} />
      <span role="status" className="sr-only">{status}</span>
    </div>
  );
}
