// A support grant (admin plan A-R5): credits an admin gives an account, written as a `gift` lot in `credit_grants`.
// A gift is held and spent like any lot, after plan lots and before packs (`credit-rule.ts`), never expires, and is
// never "paid" (`PAID_SOURCES`): it is no purchase history row and raises no deletion warning. Every grant writes an
// `admin_events` row `credits_granted` (who, whom, how many, why) in the SAME transaction, so a lot never lands
// unrecorded. Idempotent on `gift:<actionId>`: a double submit of one form writes one lot and one event.
//
// The caller (A2b's server action) has already passed `requireAdmin()`; this decides only what is written.

import { eq } from "drizzle-orm";
import { db } from "../../db";
import { accountTombstones, adminEvents, creditGrants } from "../../db/schema";
import { tombstoneHash } from "../account/purge";
import { lockSenderIn } from "../invites/send";
import { readIdentity } from "./accounts";

export const GIFT_UNITS_MIN = 1;
export const GIFT_UNITS_MAX = 500;
export const GIFT_NOTE_MAX = 500;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type GiftInput = { accountId?: unknown; units?: unknown; note?: unknown; actionId?: unknown };
export type GiftRefusal = "account" | "units" | "note" | "action" | "unknown" | "deleted" | "failed";
export type GiftResult = { ok: true; id: string; repeated: boolean } | { ok: false; error: GiftRefusal };

/** Checked before anything is read: a refusal reads nothing and writes nothing. Pure. */
export function validateGift(input: GiftInput):
  | { ok: true; gift: { accountId: string; units: number; note: string; actionId: string } }
  | { ok: false; error: "account" | "units" | "note" | "action" } {
  const { accountId, units, actionId } = input;
  if (typeof accountId !== "string" || accountId.trim() === "" || accountId.length > 200) return { ok: false, error: "account" };
  if (typeof units !== "number" || !Number.isInteger(units) || units < GIFT_UNITS_MIN || units > GIFT_UNITS_MAX) return { ok: false, error: "units" };
  const note = typeof input.note === "string" ? input.note.trim() : "";
  if (note === "" || note.length > GIFT_NOTE_MAX) return { ok: false, error: "note" };
  if (typeof actionId !== "string" || !UUID.test(actionId)) return { ok: false, error: "action" };
  return { ok: true, gift: { accountId: accountId.trim(), units, note, actionId: actionId.toLowerCase() } };
}

export type GiftDeps = {
  /** Whether Clerk knows the account. Throws when Clerk cannot be read. */
  accountExists: (id: string) => Promise<boolean>;
  transaction: typeof db.transaction;
};

const DEPS: GiftDeps = {
  accountExists: async (id) => (await readIdentity(id)) !== null,
  transaction: (fn) => db.transaction(fn),
};

export async function grantGift(actorId: string, input: GiftInput, deps: GiftDeps = DEPS): Promise<GiftResult> {
  const valid = validateGift(input);
  if (!valid.ok) return valid;
  const { accountId, units, note, actionId } = valid.gift;
  let known: boolean;
  try {
    known = await deps.accountExists(accountId);
  } catch (error) {
    console.error("admin: a gift could not read Clerk; nothing was granted", error);
    return { ok: false, error: "failed" };
  }
  if (!known) return { ok: false, error: "unknown" };
  const externalId = `gift:${actionId}`;
  try {
    return await deps.transaction(async (tx): Promise<GiftResult> => {
      // The account's lock, the one `purgeAccount` takes, with its tombstone read under it: a gift racing a deletion
      // either sees the tombstone or commits before the purge's delete and is deleted by it, as `grantWelcome` does.
      await lockSenderIn(tx, accountId);
      const [gone] = await tx.select({ id: accountTombstones.idHash }).from(accountTombstones).where(eq(accountTombstones.idHash, tombstoneHash(accountId)));
      if (gone) return { ok: false, error: "deleted" };
      const inserted = await tx.insert(creditGrants)
        .values({ userId: accountId, source: "gift", units, externalId })
        .onConflictDoNothing({ target: creditGrants.externalId })
        .returning({ id: creditGrants.id });
      if (inserted.length === 0) {
        // A repeat of a grant already made: answer the lot it wrote, and record nothing more.
        const [prior] = await tx.select({ id: creditGrants.id, userId: creditGrants.userId, source: creditGrants.source })
          .from(creditGrants).where(eq(creditGrants.externalId, externalId));
        if (!prior || prior.userId !== accountId || prior.source !== "gift") return { ok: false, error: "action" };
        return { ok: true, id: prior.id, repeated: true };
      }
      await tx.insert(adminEvents).values({ actorId, kind: "credits_granted", userId: accountId, newValue: String(units), note });
      return { ok: true, id: inserted[0].id, repeated: false };
    });
  } catch (error) {
    console.error("admin: a gift could not be written; nothing was granted", error);
    return { ok: false, error: "failed" };
  }
}
