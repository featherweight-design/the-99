import { isOurSession, isPackId, PACKS } from "./packs";

/**
 * What a reader's return from Checkout reads as (buying-credits plan E1, G5). Pure. The Session is
 * retrieved from Stripe by the id in the URL, so that id is the reader's own say-so and proves nothing:
 * a Session counts only when it is this app's (`metadata.app`), names THIS viewer (`metadata.user_id`)
 * and a pack the registry sells. Anything else, a forged id of another reader's Session included, reads
 * as `none`, which draws no band at all (never "not yours": that would confirm the Session exists).
 *
 * The Session says what was bought; our own `credit_grants` row, found by that Session's id for this
 * viewer, says whether it landed. This never grants and never trusts the URL for anything beyond the id.
 *
 * - `processing`: a paid Session of this reader's, and no grant yet. `units` is the pack's size.
 * - `added`: the grant exists. `units` is the GRANT's, what actually landed.
 * - `none`: no band.
 */
export type ReturnRead =
  | { kind: "processing"; units: number }
  | { kind: "added"; units: number }
  | { kind: "none" };

export type ReturnSession = {
  metadata: Record<string, string> | null | undefined;
  paymentStatus: string | null | undefined;
};

export function decideReturn(session: ReturnSession, viewerId: string, grantUnits: number | null): ReturnRead {
  if (!isOurSession(session.metadata)) return { kind: "none" };
  if (!viewerId || session.metadata?.user_id !== viewerId) return { kind: "none" };
  const pack = session.metadata?.pack;
  if (!isPackId(pack)) return { kind: "none" };
  if (grantUnits !== null) return { kind: "added", units: grantUnits };
  // Cards only, so a Session the reader came back from is paid; one that is not has nothing to wait for.
  if (session.paymentStatus !== "paid") return { kind: "none" };
  return { kind: "processing", units: PACKS[pack].units };
}

/** A Checkout Session id as Stripe writes it: bounded and shaped before it reaches a request or a query. */
export function isSessionId(value: unknown): value is string {
  return typeof value === "string" && /^cs_[A-Za-z0-9_]{1,200}$/.test(value);
}
