# Date added: when a holding reached the collection (plan)

Hugh's ask (relayed by the orchestrator, 2026-10-15): sort Collection by date added, from ManaBox if its export
carries it, and tracked for cards added by hand. Approved by the orchestrator as Hugh's proxy on the plan below.

## Premise (measured, staging, SELECT only)

- ManaBox's export carries no date (its sample header: Name, Set code, Set name, Collector number, Foil, Rarity,
  Quantity, ManaBox ID, Scryfall ID, Purchase price, Misprint, Altered, Condition, Language, Purchase price
  currency). Moxfield, Archidekt and Deckbox headers are unverified here; the parser reads no date column, and the
  raw file is not kept (`csv_uploads` stores only the parsed `pendingItems`).
- What the app can derive: the first confirmed upload holding a holding, and the ledger (from 2026-10-11) for hand
  adds. On the reference account, 3,234 of 3,416 holdings (95%) first appear in one file, so their date can only
  honestly read "in your collection since" that file.

## Rulings

- `collection_items.added_at` (timestamp, null = unknown) and `added_exact` (boolean). A holding is the key
  (oracle, set, number, finish): a different printing is a different holding with its own date.
- Exact means something real brought it: a hand add (Add cards, I got it, a precon add), an edit, a revert, or a
  file arriving into a collection that already had content. The file that FILLS an empty collection dates every
  holding to its day, inexact.
- Written by every path through the two places that write rows (`applyCollectionChange`, so Replace, Add, Sync,
  edit and revert, and the legacy `replaceCollection`); a standing holding keeps its date through any write,
  including a quantity change and a Replace. A removal then a re-add is a new date. The ledger's before-side
  carries the date so a revert of a removal puts it back (`HistoryRowState.addedAt`, not compared).
- Backfill: one script per database, `pnpm db:backfill:added-at`, naming its target by branch and failing closed
  (`pull:staging` rule), `--dry-run` first, run after that database's migration deploys. Staging, then
  production. Never through the Neon MCP.
- The backfill dates a holding from the ledger when its CURRENT ownership began with a hand entry (exact, and not when a
  later entry removed it), else from the first confirmed upload holding it, INEXACT always: a snapshot says a holding was
  there by then, not when it arrived, and a Sync can leave a file's card unapplied. Each account is written in its own
  transaction under the per-user advisory lock both writers take.
- The sort ties inexact dates and falls to name, so it never orders holdings a file brought in one batch; unknown
  dates sort last. Dates read exact only where `added_exact`, else "in your collection since <day>".

## PRs

1. Migration 0127, the writers, the ledger field, the backfill script, `probe:added-at`. No UI. (This PR.)
2. The "Date added" option in Collection's existing sort control, the payload (`addedAt` is a column every
   card keeps, since the sort reads it: re-run `probe:payload`, the budget is 1.05MB at 0.959MB), the row's "since"
   tag, tests, contact sheet. No Design round (a sort option). No About entry (not a new capability a reader needs
   announced); an ordinary edit to the Collection entry if Hugh wants it named.
