import { GhostButton } from "@/components/ui/button";
import { refreshCopy } from "../../lib/copy/refresh";

/**
 * The link into `/decks/import`. Ghost rather than filled beside
 * `NewDeckButton`: building here is the primary act, and bringing a deck over
 * is the other door.
 *
 * The label is the long one on a phone, where the pair is full-width and has
 * the room, and the short one in the desktop header row. Both are rendered and
 * one is hidden, because the breakpoint is a CSS fact — reading the viewport in
 * JS would paint the wrong label first.
 */
export function ImportDeckButton() {
  return (
    <GhostButton
      href="/decks/import"
      className="flex h-[44px] flex-auto items-center justify-center rounded-[10px] text-[14px] font-normal sm:h-[32px] sm:flex-none sm:justify-start sm:rounded-[8px] sm:px-[13px] sm:text-[12.5px]"
    >
      <span className="sm:hidden">{refreshCopy.decks.importLong}</span>
      <span className="hidden sm:inline">{refreshCopy.decks.importShort}</span>
    </GhostButton>
  );
}
