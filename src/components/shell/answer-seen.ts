// An answer opened over Home (small items item 3) is seen one by one, so the Friends badge, which the root layout drew
// and a client navigation never redraws, must drop by it at once. `/friends` is revalidated only after the action's
// response (revalidating Home would clear every diamond there), so the page announces the drop and `useSeenBadges`
// takes it off until the layout next sends a count, which already leaves the answer out.
const EVENT = "the99:friends-answer-seen";

/** One answer the Friends badge counted is now seen. */
export function announceAnswerSeen(): void {
  window.dispatchEvent(new Event(EVENT));
}

/** Calls `on` for each announced answer; returns the unsubscribe. */
export function onAnswerSeen(on: () => void): () => void {
  window.addEventListener(EVENT, on);
  return () => window.removeEventListener(EVENT, on);
}
