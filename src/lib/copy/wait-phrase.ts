/**
 * How long until something works again, in words: whole minutes rounded up, then whole hours once it passes an hour.
 * Pure, so a client component can draw a server refusal's `waitMs` without importing the limiter.
 */
export function waitPhrase(ms: number): string {
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  if (minutes < 60) return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  const hours = Math.ceil(minutes / 60);
  return hours === 1 ? "1 hour" : `${hours} hours`;
}
