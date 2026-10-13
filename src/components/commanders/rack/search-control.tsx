"use client";
// The rack's search field — the leading control on both lanes (locked decision 5).
// It narrows the lane in place: it does not navigate, does not open a surface and
// has no scope of its own.
//
// One subtree, sized off the `wide` prop rather than a desktop copy and a phone
// copy: the two differ by a width, a height, a radius and a font size, and a
// split subtree would put the same input in the accessibility tree twice.

import { filterCopy } from "../../../lib/copy/lanes";
import { useEffect, useRef } from "react";
import { SearchField } from "../../ui/text-field";
import { SearchIcon } from "../../ui/search-icon";

const copy = filterCopy.search;

export function SearchControl({
  value,
  onChange,
  wide,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  wide: boolean;
  /**
   * Set only when the breakpoint closed the sheet. That close removes the
   * element `FilterSheet` had focused, and the sheet has no focus-return
   * cleanup, so without this focus falls to `<body>`.
   */
  autoFocus?: boolean;
}) {
  // The border is the state: brass with a query, hairline without. That is the
  // whole of search's "active" treatment on the rack — it is never chipped and
  // never counted by the badge (call 4).
  const filled = value !== "";

  // `autoFocus` is applied by React on MOUNT, and this component stays mounted
  // across the breakpoint — so forwarding the prop did nothing and the handoff
  // was a no-op. The focus is taken imperatively when the flag turns on.
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (autoFocus) box.current?.querySelector("input")?.focus();
  }, [autoFocus]);
  return (
    <div ref={box} className={wide ? "" : "w-full"}>
    <SearchField
      value={value}
      onChange={(e) => onChange(e.target.value)}
      // The narrow field is 44px of full width and takes the short word; the
      // rack's 300px field has room to say what is being searched.
      placeholder={wide ? copy.placeholderWide : copy.placeholder}
      // The placeholder is not a name — it disappears the moment anything is
      // typed, taking the field's accessible name with it.
      aria-label={copy.placeholderWide}
      leading={<SearchIcon size={wide ? 16 : 18} className="shrink-0 text-[color:var(--fg-faint)]" />}
      containerClassName={[
        "gap-[9px] px-[10px]",
        wide ? "h-[34px] w-[300px] rounded-lg" : "h-[44px] w-full rounded-[10px]",
        filled ? "border-[color:var(--accent)]" : "border-[color:var(--border-strong)]",
      ].join(" ")}
      // 16px on the phone is the iOS zoom floor (#101), not the drawn 13px:
      // below it Safari zooms the page on focus and moves the list out from
      // under the reader as they type. The 44px field is tall enough for it.
      className={[
        wide ? "text-[12.5px]" : "text-[16px]",
        "placeholder:text-[color:var(--fg-locked)]",
      ].join(" ")}
      trailing={
        filled ? (
          <button
            type="button"
            aria-label={copy.clear}
            onClick={() => onChange("")}
            className={[
              "shrink-0 cursor-pointer border-0 p-0 leading-none",
              "flex items-center justify-center rounded-full",
              "bg-[color:var(--border)] text-[color:var(--fg-faint)]",
              wide ? "h-[18px] w-[18px] text-[10px]" : "h-[24px] w-[24px] text-[12px]",
            ].join(" ")}
          >
            ✕
          </button>
        ) : null
      }
    />
    </div>
  );
}
