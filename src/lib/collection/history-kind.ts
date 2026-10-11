import type { HistoryListEntry } from "./history";

/**
 * What the history list calls an entry, from what the ledger stores. The ledger keeps five kinds
 * (`upload_replace | upload_add | add | edit | revert`); the list draws six, because a removal is
 * an `edit` whose every row ends at no copies (write-path plan, Decision 2) and reads as its own
 * thing. A Shopping purchase is an `edit` too (I got it adds no ledger kind, audit finding 4), told
 * apart by its `shopping:<deck id>` source. The labels for these keys live in the copy module, beside
 * the rest of the history copy.
 */
export type HistoryKind = "uploadReplace" | "uploadAdd" | "add" | "edit" | "shopping" | "remove" | "revert";

export function historyKindOf(entry: Pick<HistoryListEntry, "kind" | "removesOnly" | "source">): HistoryKind {
  switch (entry.kind) {
    case "upload_replace": return "uploadReplace";
    case "upload_add": return "uploadAdd";
    case "add": return "add";
    case "edit":
      if (entry.source?.startsWith("shopping:")) return "shopping";
      return entry.removesOnly ? "remove" : "edit";
    case "revert": return "revert";
  }
}
