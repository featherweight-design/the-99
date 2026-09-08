// src/lib/copy/in-flight.ts
//
// In-flight feedback for control flips that fetch. See
// design/design_handoff_the99_in_flight/RULING-in-flight-feedback.md
//
// Three strings, one per fetching control. Each REPLACES the subtitle clause its control owns —
// it is never appended. Constraint: a pending clause is never longer than the clause it replaces,
// at any width, so the subtitle's wrap point can only move earlier.
//
// One string per state. No desktop/phone variants: the pressed control is showing a crown where
// its label was, so the participle does not need to name its object.
//
// The subtitle has FOUR clauses under a scope (page-header.tsx:66-89). Clause 3,
// `read against N cards`, is owned by NOBODY and has no pending state: it names the whole
// collection by design and is locked and tested (list-wiring.test.ts:110-114). R1's `re-reading…`
// was assigned to it in error and is retired — do not reintroduce it.

export const PENDING_GATE_MS = 500; // one threshold, all three controls

export const inFlightCopy = {
  // clause 1 — population, owned by the scope control
  scope: 'counting…',
  // clause 2 — ordering, owned by the sort control
  sort: 're-ranking…',
  // clause 4 — the pool, owned by `Score against`. The clause is a bare noun phrase with no verb
  // of its own, so the verb comes from its control; 11 chars against the 15 of `free cards only`,
  // its shortest form.
  avail: 're-scoring…',
} as const;

// Clause 3 is intentionally absent from this map. There is no `collection` key.

// `re-ranking…` is reachable only under the discovery scope — the owned scope has no sort control.
// Two participles under `I own`, three under `To play`.

export type FetchingControl = keyof typeof inFlightCopy;

// The subtitle is assembled from three clauses. `pending` is the control whose flip is in flight
// past PENDING_GATE_MS, or null. On failure, call with null: the outgoing sentence returns whole.
export function discoverySubtitle(
  parts: {
    population: string;
    ordering?: string; // absent under the owned scope — no sort control there
    collection: string;
    pool: string;
  },
  pending: FetchingControl | null,
): string {
  return [
    pending === 'scope' ? inFlightCopy.scope : parts.population,
    pending === 'sort' ? inFlightCopy.sort : parts.ordering,
    parts.collection, // never pending
    pending === 'avail' ? inFlightCopy.avail : parts.pool,
  ]
    .filter(Boolean)
    .join(' · ');
}

// Example, all four sentences:
//
//   counting… · ranked by best fit · read against 2,805 cards · free cards only
//   3,100 commanders you have not built · re-ranking… · read against 2,805 cards · free cards only
//   3,100 commanders you have not built · ranked by best fit · read against 2,805 cards · re-scoring…
//   3,100 commanders you have not built · ranked by best fit · read against 2,805 cards · free cards only
//
// Search (findExcludedMatches, discovery-view.tsx:404) filters client-side and has NO treatment:
// no crown in the field, no participle, no clause.
//
// Nothing else is added. No second-tier string at any duration, no "this is taking a moment",
// no error clause — an error is the route's, not the subtitle's.

// The subtitle's pending clause is aria-hidden; PendingLabel's accessible name is the only
// in-flight announcement and the page's live region speaks once on settle with the shipped
// message. Nothing here is announced.
