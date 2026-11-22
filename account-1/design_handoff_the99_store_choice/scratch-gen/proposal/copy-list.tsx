"use client";
// Store choice R1·Q3 PROPOSAL: where the store has no whole-list link but has a page that takes a pasted list
// (TCGplayer Mass Entry, Card Kingdom Deck Builder), the link's 44px row holds two presses: Copy the list (a button
// in the link's own face, the export dialog's clipboard logic and 1.5s swap to Copied, announced) and the store's
// paste page as an ExternalLink. The text is `1 Name` lines of the shown selection, Mana Pool's text form.
import { useEffect, useRef, useState } from "react";
import { storeCopy } from "../../lib/copy/store";
import type { Store } from "../../lib/store/stores";
import { ExternalLink } from "../ui/external-link";
import { TOUCH_HIT_INLINE } from "../ui/touch-hit";

const PRESS =
  "inline cursor-pointer rounded-[6px] border-0 bg-transparent p-0 text-[14px] font-medium leading-[1.45] text-[color:var(--accent-hover)] " +
  "underline decoration-1 underline-offset-[3px] decoration-[color-mix(in_srgb,var(--accent-hover)_45%,transparent)] " +
  "hover:text-[color:var(--fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]";

/** Placeholder: the plan measures each store's paste page URL (READINESS G3). */
const PASTE_HREF: Record<string, string> = { tcgplayer: "https://www.tcgplayer.com/massentry", cardkingdom: "https://www.cardkingdom.com/builder" };

export function CopyList({ store, lines, copied: drawn = false }: { store: Store; lines: { name: string; qty: number }[]; copied?: boolean }) {
  const [copied, setCopied] = useState(drawn);
  const [status, setStatus] = useState("");
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (t.current) clearTimeout(t.current); }, []);
  if (!store.paste) return null;
  const text = lines.map((l) => `${l.qty} ${l.name}`).join("\n");
  const copy = () =>
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setStatus(storeCopy.copied);
      if (t.current) clearTimeout(t.current);
      t.current = setTimeout(() => { setCopied(false); setStatus(""); }, 1500);
    });
  return (
    <div data-copy-list="" className="mt-[2px] flex min-h-[44px] flex-wrap items-center gap-x-[18px] gap-y-[4px]">
      <button type="button" onClick={copy} aria-label={storeCopy.copyAria(lines.length)} className={`${TOUCH_HIT_INLINE} ${PRESS}`}>
        {copied ? (<><span aria-hidden="true" className="mr-[5px] inline-block text-[color:var(--success)]">✓</span>{storeCopy.copied}</>) : storeCopy.copyList}
      </button>
      <ExternalLink href={PASTE_HREF[store.id] ?? "#"} label={storeCopy.openPaste(store)} />
      <span role="status" className="sr-only">{status}</span>
    </div>
  );
}
