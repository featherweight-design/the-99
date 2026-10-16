/**
 * A visit (handoff G4, plan `2026-10-16-moments.md`): one app session, ended by 30 minutes away. Kept in
 * `localStorage`, not `sessionStorage`, so two tabs make one visit and a moment shown in one is the visit's for both.
 * Nothing about a visit is stored on the server.
 *
 * The rule is pure (`nextVisit`); the storage around it never throws: a read that fails is a fresh visit with no
 * moment taken, and a write that fails is dropped.
 */
export const VISIT_GAP_MS = 30 * 60 * 1000;
export const VISIT_KEY = "the99.moments.visit";

export type Visit = { last: number; taken: boolean; claim?: { tab: string; at: number } };

/** How long a tab's provisional claim stands without a spend: a tab that died mid-bubble frees the visit after it. */
export const CLAIM_MS = 5000;

/** The visit as of `now`, given what storage held: the same one, touched, or a new one after the gap. */
export function nextVisit(stored: unknown, now: number): Visit {
  const v = stored as Partial<Visit> | null;
  if (v === null || typeof v !== "object" || typeof v.last !== "number" || typeof v.taken !== "boolean") {
    return { last: now, taken: false };
  }
  if (now - v.last > VISIT_GAP_MS || v.last > now) return { last: now, taken: false };
  const c = v.claim;
  const claim = c && typeof c.tab === "string" && typeof c.at === "number" && now - c.at < CLAIM_MS ? c : undefined;
  return claim ? { last: now, taken: v.taken, claim } : { last: now, taken: v.taken };
}

function read(): unknown {
  try {
    const raw = window.localStorage.getItem(VISIT_KEY);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function write(v: Visit) {
  try {
    window.localStorage.setItem(VISIT_KEY, JSON.stringify(v));
  } catch {
    // Storage blocked or full: the visit lives for this page alone.
  }
}

/** Marks the reader present now and answers the visit: a read and a write, so call it on activity, not per frame. */
export function touchVisit(now = Date.now()): Visit {
  const v = nextVisit(read(), now);
  write(v);
  return v;
}

/**
 * Claims this visit's moment for `tab`, provisionally: false when the visit is taken or another tab holds a live claim.
 * The spend (`takeVisit`) makes it final; a teardown before it gives it back (`releaseClaim`).
 */
export function claimVisit(tab: string, now = Date.now()): boolean {
  const v = nextVisit(read(), now);
  if (v.taken || (v.claim !== undefined && v.claim.tab !== tab)) return false;
  write({ last: now, taken: false, claim: { tab, at: now } });
  return true;
}

export function releaseClaim(tab: string, now = Date.now()) {
  const v = nextVisit(read(), now);
  if (v.claim?.tab === tab) write({ last: now, taken: v.taken });
}

/** This visit's moment is taken, in every tab. */
export function takeVisit(now = Date.now()) {
  write({ last: now, taken: true });
}
