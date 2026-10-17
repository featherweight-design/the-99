import { clerkClient } from "@clerk/nextjs/server";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { adminUserIds } from "./access";
import { maskEmail, maskName } from "./mask";

/**
 * The accounts this environment's admin counts (READINESS audit finding 6). The app stores only
 * Clerk ids, so the set comes from Clerk, server-side; nothing Clerk returns is stored (READINESS G4).
 * When Clerk cannot be read, or does not answer within `CLERK_DEADLINE_MS` across every page, the
 * ids are the distinct `user_id`s of `user_data_stamps` and `model_calls`, with no names, and
 * `clerk: "down"` tells the page to say so (STATES A3). `system` is never an account.
 *
 * Switches counts `N of T on` over this set and Check an account picks from it; the Accounts page
 * (admin PR 9) is built on it.
 *
 * MASKED AT THE SOURCE (Admin R3, rulings 1 and 4): `name` and `email` are the masked forms (`Colin R.`,
 * `c•••@g•••.com`), so nothing built on this list can put a whole name or address in a page payload. Raw
 * values leave this module only through `readIdentity`, which a logged reveal calls, and no other module
 * reads a Clerk user's name or email fields (`clerk-pii.test.ts`). `named` is false for an account Clerk
 * holds no name for (`Account ·9xQe`), which draws the diamond instead of initials (D4).
 */
export type Account = { id: string; name: string; email: string | null; named: boolean };
export type AccountList = { accounts: Account[]; clerk: "ok" | "down" };

const PAGE = 500;
/**
 * The whole Clerk read's budget, every page together. `@clerk/backend` takes no abort signal, so a
 * request that hangs would hang the admin page with it and the fallback would never run; past this,
 * the page is drawn from the stored ids instead and the late answer is dropped.
 */
export const CLERK_DEADLINE_MS = 5_000;
/**
 * Far past this admin's audience (Hugh and friends): a guard against an unbounded loop, not a cap.
 * A read that fills every page has not reached the end, so it is refused rather than reported as the
 * whole list, and the page takes the stored ids with its notice instead.
 */
export const MAX_PAGES = 20;

type ClerkUser = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  username?: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
};

/** The masked account for a Clerk user, or for a bare id when Clerk could not be read. */
function masked(u: Pick<ClerkUser, "id" | "firstName" | "lastName" | "username"> & { email: string | null }): Account {
  const { name, named } = maskName({ id: u.id, firstName: u.firstName ?? null, lastName: u.lastName ?? null, username: u.username ?? null });
  return { id: u.id, name, email: u.email ? maskEmail(u.email) : null, named };
}
type ListUsers = (params: { limit: number; offset: number }) => Promise<{ data: ClerkUser[] }>;

export type AccountsDeps = { listUsers: ListUsers; storedUserIds: () => Promise<string[]>; ownerIds: ReadonlySet<string>; deadlineMs?: number };

type Deadline = { expired: boolean };

/**
 * `work(deadline)`, or a rejection once `ms` have passed, whichever comes first. The race cannot
 * cancel `work`, so `deadline.expired` turns true at the same moment and `work` checks it before
 * starting anything more: a read that lost the race stops instead of fetching on unobserved.
 */
function withDeadline<T>(work: (deadline: Deadline) => Promise<T>, ms: number): Promise<T> {
  const deadline: Deadline = { expired: false };
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      deadline.expired = true;
      reject(new Error(`Clerk did not answer within ${ms}ms`));
    }, ms);
  });
  return Promise.race([work(deadline), late]).finally(() => clearTimeout(timer));
}

async function readClerk(listUsers: ListUsers, deadline: Deadline): Promise<ClerkUser[]> {
  const users: ClerkUser[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    if (deadline.expired) throw new Error("Clerk read abandoned at the deadline");
    const { data } = await listUsers({ limit: PAGE, offset: page * PAGE });
    users.push(...data);
    // A short page is the last one: the list is whole.
    if (data.length < PAGE) return users;
  }
  throw new Error(`Clerk listed more than ${MAX_PAGES * PAGE} accounts; the list would be partial`);
}

async function clerkListUsers(params: { limit: number; offset: number }) {
  return (await clerkClient()).users.getUserList({ ...params, orderBy: "created_at" });
}

async function storedUserIds(): Promise<string[]> {
  const rows = await db.execute<{ user_id: string }>(sql`
    select user_id from user_data_stamps where user_id <> 'system'
    union
    select user_id from model_calls where user_id <> 'system'
  `);
  return rows.rows.map((r) => r.user_id);
}

/** The owner first, then A to Z by masked name, the accounts with no name after them, then by id. */
export function orderAccounts(accounts: readonly Account[], ownerIds: ReadonlySet<string>): Account[] {
  const key = (a: Account) => a.name.toLocaleLowerCase("en-US");
  return [...accounts].sort((a, b) => {
    const owner = Number(ownerIds.has(b.id)) - Number(ownerIds.has(a.id));
    if (owner !== 0) return owner;
    const unnamed = Number(!a.named) - Number(!b.named);
    if (unnamed !== 0) return unnamed;
    const byKey = key(a).localeCompare(key(b), "en-US");
    return byKey !== 0 ? byKey : a.id.localeCompare(b.id);
  });
}

export async function listAccounts(
  deps: AccountsDeps = { listUsers: clerkListUsers, storedUserIds, ownerIds: adminUserIds() },
): Promise<AccountList> {
  try {
    const users = await withDeadline((deadline) => readClerk(deps.listUsers, deadline), deps.deadlineMs ?? CLERK_DEADLINE_MS);
    const accounts = users
      .filter((u) => u.id !== "system")
      .map((u) => masked({ ...u, email: u.primaryEmailAddress?.emailAddress ?? null }));
    return { accounts: orderAccounts(accounts, deps.ownerIds), clerk: "ok" };
  } catch (error) {
    console.error("admin: accounts could not be read from Clerk; listing stored ids", error);
    const ids = [...new Set(await deps.storedUserIds())].filter((id) => id !== "system");
    return { accounts: orderAccounts(ids.map((id) => masked({ id, email: null })), deps.ownerIds), clerk: "down" };
  }
}

/** One account's whole name and email, for a logged reveal only (`revealAccount`); null when Clerk has no such user. */
export type Identity = { id: string; fullName: string | null; email: string | null };

type GetUser = (id: string) => Promise<ClerkUser | null>;
type FindByEmail = (email: string) => Promise<{ id: string; emailAddresses: { emailAddress: string }[] }[]>;
export type IdentityDeps = { getUser: GetUser; findByEmail: FindByEmail; deadlineMs?: number };

const identityDeps: IdentityDeps = {
  getUser: async (id) => {
    try {
      return await (await clerkClient()).users.getUser(id);
    } catch (error) {
      // Clerk answers a missing user with a 404; anything else is a failure the caller reports.
      if ((error as { status?: number }).status === 404) return null;
      throw error;
    }
  },
  findByEmail: async (email) => (await (await clerkClient()).users.getUserList({ emailAddress: [email], limit: 2 })).data,
};

/** The raw identity behind one account. Throws when Clerk fails or is late, so the reveal shows and logs nothing. */
export async function readIdentity(id: string, deps: IdentityDeps = identityDeps): Promise<Identity | null> {
  const u = await withDeadline(() => deps.getUser(id), deps.deadlineMs ?? CLERK_DEADLINE_MS);
  if (!u) return null;
  const fullName = [u.firstName, u.lastName].map((p) => p?.trim()).filter(Boolean).join(" ") || u.fullName || u.username || null;
  return { id: u.id, fullName, email: u.primaryEmailAddress?.emailAddress ?? null };
}

/**
 * The one account holding exactly `email` (already trimmed and case-folded), or null (D10 to D12). Clerk's own
 * filter is not trusted alone: an account is kept only when one of its addresses equals `email` exactly, and two
 * accounts holding it answer null. Throws when Clerk fails or is late.
 */
export async function findAccountIdByEmail(email: string, deps: IdentityDeps = identityDeps): Promise<string | null> {
  const users = await withDeadline(() => deps.findByEmail(email), deps.deadlineMs ?? CLERK_DEADLINE_MS);
  const exact = users.filter((u) => u.emailAddresses.some((e) => e.emailAddress.trim().toLocaleLowerCase("en-US") === email));
  if (exact.length > 1) console.error("admin: more than one account holds one email; the lookup answers none");
  return exact.length === 1 ? exact[0].id : null;
}
