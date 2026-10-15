import type { HistoryListEntry } from "./history";
import { DECK_SOURCE_PREFIX } from "./deck-source";

/**
 * What the history list calls an entry, from what the ledger stores. The ledger keeps six kinds
 * (`upload_replace | upload_add | upload_sync | add | edit | revert`); the list draws nine, because a removal is
 * an `edit` whose every row ends at no copies (write-path plan, Decision 2) and reads as its own
 * thing. A Shopping purchase is an `edit` too (I got it adds no ledger kind, audit finding 4), told
 * apart by its `shopping:<deck id>` source, and an import's own-these-cards add is an `add` told apart by
 * its `deck:<deck id>` source (`deckAdd`), as a precon add is an `add` with a `precon:` source. The
 * labels for these keys live in the copy module, beside the rest of the history copy.
 */
export type HistoryKind = "uploadReplace" | "uploadAdd" | "uploadSync" | "add" | "deckAdd" | "edit" | "shopping" | "remove" | "revert";

export function historyKindOf(entry: Pick<HistoryListEntry, "kind" | "removesOnly" | "source">): HistoryKind {
  switch (entry.kind) {
    case "upload_replace": return "uploadReplace";
    case "upload_add": return "uploadAdd";
    case "upload_sync": return "uploadSync";
    case "add": return entry.source?.startsWith(DECK_SOURCE_PREFIX) ? "deckAdd" : "add";
    case "edit":
      if (entry.source?.startsWith("shopping:")) return "shopping";
      return entry.removesOnly ? "remove" : "edit";
    case "revert": return "revert";
  }
}
