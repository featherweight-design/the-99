import { classifyTokenEntry, isTokenEntry, tokenPartIds } from "./catalog";

/**
 * The daily canary's token half (`pnpm check:scryfall`). The first-entry check cannot see tokens:
 * only a tenth of `default_cards` carries `all_parts`, and the first entry says nothing about the
 * link a token needs. This scans for ANY entry that proves the whole chain: a token printing the
 * ingest would accept, and a card naming it as a `component: "token"` part by id.
 *
 * It stops at the first proof, so the usual cost is a few thousand entries, and reads the whole
 * file only when the contract is broken, which is when the full read is worth paying for.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw Scryfall bulk JSON is untyped by design.
export async function tokenContractFailures(entries: AsyncIterable<Record<string, any>>): Promise<string[]> {
  const tokenIds = new Set<string>();
  const pending = new Set<string>();
  let tokenEntries = 0, rejectedTokens = 0, partsSeen = 0;
  for await (const entry of entries) {
    if (isTokenEntry(entry)) {
      tokenEntries++;
      if (!classifyTokenEntry(entry)) { if (entry.digital !== true) rejectedTokens++; continue; }
      tokenIds.add(entry.id);
      if (pending.delete(entry.id)) return [];
      continue;
    }
    for (const id of tokenPartIds(entry)) {
      partsSeen++;
      if (tokenIds.has(id)) return [];
      pending.add(id);
    }
  }
  const failures: string[] = [];
  if (tokenEntries === 0) failures.push("default_cards: no entry has a token layout (`token` or `double_faced_token`)");
  else if (rejectedTokens === tokenEntries) failures.push("default_cards: every token entry failed the ingest's token read (a required field moved)");
  if (partsSeen === 0) failures.push("default_cards: no card names a `component: \"token\"` part in `all_parts`");
  else failures.push("default_cards: no token part id resolved to a token printing in the same bulk");
  return failures;
}
