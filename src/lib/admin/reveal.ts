// Show (Admin R3, D5 to D8, A2, A6, B2): the one answer that carries an account's whole name and email off the
// server. It reads Clerk first, so a Clerk failure shows nothing and logs nothing; then it writes the reveal to
// `admin_events` (`account_revealed`, the actor and the account) and only then answers. A failed write answers
// `failed` with no raw value in it (STATES A6, must-not).

import { db } from "../../db";
import { adminEvents } from "../../db/schema";
import { readIdentity, type Identity } from "./accounts";

/** How long a reveal stands before the page re-masks it (D7). */
export const REVEAL_MS = 5 * 60 * 1000;

export type RevealResult =
  | { ok: true; id: string; name: string | null; email: string | null; hidesAt: string }
  | { ok: false; error: "invalid" | "failed" };

export type RevealDeps = {
  readIdentity: (id: string) => Promise<Identity | null>;
  /** Writes the reveal and answers the row's `at`. */
  logReveal: (actorId: string, accountId: string) => Promise<Date>;
};

const DEPS: RevealDeps = {
  readIdentity: (id) => readIdentity(id),
  logReveal: async (actorId, accountId) => {
    const [row] = await db.insert(adminEvents).values({ actorId, kind: "account_revealed", userId: accountId }).returning({ at: adminEvents.at });
    return row.at;
  },
};

export async function revealAccountIn(actorId: string, accountId: unknown, deps: RevealDeps = DEPS): Promise<RevealResult> {
  if (typeof accountId !== "string" || accountId.trim() === "" || accountId.length > 200) return { ok: false, error: "invalid" };
  let identity: Identity | null;
  try {
    identity = await deps.readIdentity(accountId);
  } catch (error) {
    console.error("admin: a reveal could not read Clerk; nothing was shown or logged", error);
    return { ok: false, error: "failed" };
  }
  if (!identity) return { ok: false, error: "failed" };
  let at: Date;
  try {
    at = await deps.logReveal(actorId, accountId);
  } catch (error) {
    console.error("admin: a reveal could not be logged; nothing was shown", error);
    return { ok: false, error: "failed" };
  }
  return { ok: true, id: identity.id, name: identity.name, email: identity.email, hidesAt: new Date(at.getTime() + REVEAL_MS).toISOString() };
}
