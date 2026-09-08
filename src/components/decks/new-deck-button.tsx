import { PrimaryButton } from "@/components/ui/button";
import { refreshCopy } from "../../lib/copy/refresh";

/**
 * The one filled button on the Decks surface. Server component: `PrimaryButton`
 * renders a next/link here rather than a button, because it is given an `href`.
 *
 * Phone puts it first in a full-width pair under the header row at the 44px
 * touch floor; desktop puts it last in the header row at 32px.
 */
export function NewDeckButton() {
  return (
    <PrimaryButton
      href="/decks/new"
      className="flex h-[44px] flex-auto items-center justify-center rounded-[10px] text-[14px] sm:h-[32px] sm:flex-none sm:justify-start sm:rounded-[8px] sm:px-[14px] sm:text-[12.5px]"
    >
      {refreshCopy.decks.newDeck}
    </PrimaryButton>
  );
}
