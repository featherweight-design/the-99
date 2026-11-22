// Store choice R1 PROPOSAL: the in-context door. Trails the provenance line as ` · Change store`, inline text in the line's
// own mono 9.5 and ink, underlined; to /settings#settings-store. A coarse pointer gets the inline 44px hit.
import { storeCopy } from "../../lib/copy/store";
import { currentStore } from "../../lib/store/stores";
import { TOUCH_HIT_INLINE } from "../ui/touch-hit";
export function StoreDoor() {
  const s = currentStore();
  return (
    <>
      <span aria-hidden="true">{" · "}</span>
      <a href="/settings#settings-store" aria-label={storeCopy.changeAria(s)} data-store-door=""
        className={`${TOUCH_HIT_INLINE} rounded-[3px] text-[color:var(--fg-muted)] underline decoration-1 underline-offset-[2px] decoration-[color-mix(in_srgb,var(--fg-muted)_50%,transparent)] hover:text-[color:var(--fg)]`}>
        {storeCopy.change}
      </a>
    </>
  );
}
