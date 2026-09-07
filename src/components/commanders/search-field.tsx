"use client";

// The filter bar's search field (§4.3). Narrows the list in place: it does not
// navigate, does not open a surface, and does not re-sort.
//
// One subtree with responsive classes rather than a desktop copy and a mobile
// copy — the two differ by a height, a gap and a font size, and a split subtree
// would put the same input in the accessibility tree twice.

import { planeCopy } from "../../lib/copy/commanders-plane";
import { SearchField } from "../ui/text-field";

const copy = planeCopy.search;

export function CommanderSearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <SearchField
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={copy.placeholder}
      aria-label={copy.inputAria}
      // The caption instead of the shared `⌕`, mirroring `COLORS` inside the pip
      // wrapper. `aria-hidden`, because the input's own label already says what
      // the field is for and the caption would only repeat it.
      leading={
        <span
          aria-hidden
          className="font-mono text-[10px] tracking-[0.12em] shrink-0 text-[color:var(--fg-faint)]"
        >
          {copy.caption}
        </span>
      }
      containerClassName="h-[38px] gap-[7px] px-[10px] flex-1 min-w-0 sm:h-[30px] sm:gap-[8px] sm:flex-none sm:w-[280px]"
      // 16px on the phone is the iOS zoom floor (#101), not the drawn 13px: below
      // it Safari zooms the whole page on focus, which moves the list out from
      // under the reader as they type. The 38px field was already tall enough.
      // Placeholder drops to `--fg-locked`, a step under the shared chrome's
      // `--fg-faint`, so it cannot be read as a value already typed.
      className="text-[16px] sm:text-[12.5px] placeholder:text-[color:var(--fg-locked)]"
      trailing={
        value !== "" ? (
          <button
            type="button"
            aria-label={copy.clearAria}
            onClick={() => onChange("")}
            className="shrink-0 cursor-pointer bg-transparent border-0 p-0 leading-none text-[11px] text-[color:var(--fg-faint)]"
          >
            ✕
          </button>
        ) : null
      }
    />
  );
}
