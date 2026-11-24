// SingletonFooterNote — server component.
// §Search singleton footer note: mono 10px, var(--fg-locked), center, padding 6px 0, line-height 1.5.
// Desktop-only per the design table (Mobile column shows "—" for all properties).

import { addPanelCopy } from "../../lib/copy/decks-builder";

export function SingletonFooterNote() {
  return (
    <p
      className="hidden md:block font-mono text-[10px] text-center leading-[1.5]"
      style={{ color: "var(--fg-locked)", padding: "6px 0" }}
    >
      {addPanelCopy.singletonNote}
    </p>
  );
}
