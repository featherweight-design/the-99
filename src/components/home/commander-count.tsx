import { getRankedList } from "../../lib/recs/ranked-list";

/**
 * How many commanders the collection can field, for the dashboard's two stat
 * surfaces (#14).
 *
 * The appshell table calls this "Commanders buildable" (§Stats line, §Collection
 * stats panel), but the commanders surface retired that word: there is no
 * buildable threshold anywhere in the app, and `commander-discovery.ts` settled
 * on "commanders you own". The figure here is the same `candidateCount` that
 * surface reports, so it uses the same noun — a reader who follows the stat
 * through to /commanders must not meet a different number under a different name.
 *
 * `getRankedList` is React-cached, so the two call sites below cost one read
 * between them, and the cached-scores path makes that read cheap. It is still
 * the expensive branch on a cold miss, which is why each caller streams this
 * inside its own Suspense boundary rather than blocking the dashboard shell.
 */
export async function CommanderCount({ userId }: { userId: string }) {
  const { candidateCount } = await getRankedList(userId);
  return <>{candidateCount.toLocaleString()}</>;
}

/**
 * Stand-in while the count streams. An em dash rather than a spinner or a zero:
 * the stat sits mid-sentence in the greeting line, a zero would be a claim we
 * have not verified, and reserving the glyph keeps the line from reflowing when
 * the real figure lands.
 */
export function CommanderCountFallback() {
  return <>—</>;
}
