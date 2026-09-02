import { GhostButton } from "@/components/ui/button";
import { deckImportCopy } from "../../lib/copy/deck-import";

/**
 * The link into `/decks/import`. Ghost rather than accent beside `NewDeckButton`:
 * building here is the primary act, and bringing a deck over is the other door.
 * `/decks/import` shipped unlinked; this is the entry point that opens it.
 */
export function ImportDeckButton() {
  return (
    <GhostButton
      href="/decks/import"
      className="block w-full text-center text-[14px] py-[11px] px-0 md:inline-block md:w-auto md:px-[20px]"
    >
      {deckImportCopy.entry.decksLink}
    </GhostButton>
  );
}
