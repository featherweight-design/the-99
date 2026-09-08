// src/lib/copy/in-flight.ts
//
// In-flight feedback for control flips that fetch. See
// design/design_handoff_the99_in_flight/RULING-in-flight-feedback.md
//
// Three strings, one per fetching control. Each REPLACES the subtitle clause its control owns —
// it is never appended. Constraint, enforced by the test below: a pending clause is never longer
// than the clause it replaces, at any width, so the subtitle's wrap point can only move earlier.
//
// One string per state. No desktop/phone variants: the pressed control is showing a crown where
// its label was, so the participle does not need to name its object.

export const PENDING_GATE_MS = 500; // one threshold, all three controls

export const inFlightCopy = {
  // clause 1 — population, owned by the scope control
  scope: 'counting…',
  // clause 2 — ordering, owned by the sort control
  sort: 're-ranking…',
  // clause 3 — collection side, owned by `Score against` under discovery
  avail: 're-reading…',
} as const;

export type FetchingControl = keyof typeof inFlightCopy;

// The subtitle is assembled from three clauses. `pending` is the control whose flip is in flight
// past PENDING_GATE_MS, or null. On failure, call with null: the outgoing sentence returns whole.
export function discoverySubtitle(
  parts: { population: string; ordering: string; collection: string },
  pending: FetchingControl | null,
): string {
  return [
    pending === 'scope' ? inFlightCopy.scope : parts.population,
    pending === 'sort' ? inFlightCopy.sort : parts.ordering,
    pending === 'avail' ? inFlightCopy.avail : parts.collection,
  ].join(' · ');
}

// Example, all four sentences:
//
//   counting… · ranked by best fit · read against 2,805 cards
//   3,100 commanders you have not built · re-ranking… · read against 2,805 cards
//   3,100 commanders you have not built · ranked by best fit · re-reading…
//   3,100 commanders you have not built · ranked by best fit · read against 2,805 cards
//
// Nothing else is added. No second-tier string at any duration, no "this is taking a moment",
// no error clause — an error is the route's, not the subtitle's.

// The subtitle's pending clause is aria-hidden; PendingLabel's accessible name is the only
// in-flight announcement and the page's live region speaks once on settle with the shipped
// message. Nothing here is announced.
