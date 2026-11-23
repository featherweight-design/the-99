"use client";
// Change store (store choice handoff, call 2, Shopping P1 to P3, K1 to K3): trails the provenance line on a deck's
// Shopping strip and the all-decks cart's checkout box as ` · Change store`, inline in the line's own mono 9.5, the link
// in --fg-muted with an underline and the inline 44px coarse hit, to `/settings#settings-store`. Its accessible name
// says the current store. Drawn only while the reader may change their store (`useCanChangeStore`); otherwise nothing,
// so the line reads as it shipped.

import Link from "next/link";
import { storeCopy } from "../../lib/copy/store";
import { PendingReporter } from "../shell/pending-reporter";
import { STORE_SETTINGS_HREF } from "../../lib/stores/info";
import { TOUCH_HIT_INLINE } from "../ui/touch-hit";
import { useCanChangeStore, useStoreInfo } from "./store-provider";

export function StoreDoor() {
  const store = useStoreInfo();
  const canChange = useCanChangeStore();
  if (!canChange) return null;
  return (
    <>
      <span aria-hidden="true">{" · "}</span>
      <Link
        href={STORE_SETTINGS_HREF}
        aria-label={storeCopy.changeAria(store)}
        data-store-door=""
        className={`${TOUCH_HIT_INLINE} rounded-[3px] text-[color:var(--fg-muted)] underline decoration-1 underline-offset-[2px] decoration-[color-mix(in_srgb,var(--fg-muted)_50%,transparent)] hover:text-[color:var(--fg)]`}
      >
        {storeCopy.change}
        <PendingReporter href={STORE_SETTINGS_HREF} />
      </Link>
    </>
  );
}
