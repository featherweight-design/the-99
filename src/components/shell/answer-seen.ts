// An answer opened over Home (small items item 3) is seen one by one, so the Friends badge, which the root layout drew
// and a client navigation never redraws, must drop by it at once. `/friends` is revalidated only after the action's
// response (revalidating Home would clear every diamond there), so the page announces the drop and `useSeenBadges`
// takes it off until the layout next sends a count, which already leaves the answer out.
const EVENT = "the99:friends-answer-seen";

/** One answer the Friends cursor had not covered is now seen; `answeredAt` (ISO) says whether the bar's count held it. */
export function announceAnswerSeen(answeredAt: string): void {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: answeredAt }));
}

/** Calls `on` with each announced answer's time; returns the unsubscribe. */
export function onAnswerSeen(on: (answeredAt: string) => void): () => void {
  const listener = (e: Event) => on((e as CustomEvent<string>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
