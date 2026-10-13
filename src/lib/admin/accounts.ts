import { clerkClient } from "@clerk/nextjs/server";
import { sql } from "drizzle-orm";
import { db } from "../../db";
import { adminUserIds } from "./access";

/**
 * The accounts this environment's admin counts (READINESS audit finding 6). The app stores only
 * Clerk ids, so the set comes from Clerk, server-side; nothing Clerk returns is stored (READINESS G4).
 * When Clerk cannot be read, the ids are the distinct `user_id`s of `user_data_stamps` and
 * `model_calls`, with no names, and the page says so (STATES A3). `system` is never an account.
 *
 * Switches counts `N of T on` over this set and Check an account picks from it; the Accounts page
 * (admin PR 9) is built on it.
 */
export type Account = { id: string; name: string | null; email: string | null };
export type AccountList = { accounts: Account[]; clerk: "ok" | "down" };

const PAGE = 500;
// Far past this admin's audience (Hugh and friends): a guard against an unbounded loop, not a cap.
const MAX_PAGES = 20;

type ClerkUser = {
  id: string;
  fullName: string | null;
  username?: string | null;
  primaryEmailAddress: { emailAddress: string } | null;
};
type ListUsers = (params: { limit: number; offset: number }) => Promise<{ data: ClerkUser[] }>;

export type AccountsDeps = { listUsers: ListUsers; storedUserIds: () => Promise<string[]>; ownerIds: ReadonlySet<string> };

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

/** The owner first, then A to Z by name, then email, then id. */
export function orderAccounts(accounts: readonly Account[], ownerIds: ReadonlySet<string>): Account[] {
  const key = (a: Account) => (a.name ?? a.email ?? a.id).toLocaleLowerCase("en-US");
  return [...accounts].sort((a, b) => {
    const owner = Number(ownerIds.has(b.id)) - Number(ownerIds.has(a.id));
    if (owner !== 0) return owner;
    const byKey = key(a).localeCompare(key(b), "en-US");
    return byKey !== 0 ? byKey : a.id.localeCompare(b.id);
  });
}

export async function listAccounts(
  deps: AccountsDeps = { listUsers: clerkListUsers, storedUserIds, ownerIds: adminUserIds() },
): Promise<AccountList> {
  try {
    const users: ClerkUser[] = [];
    for (let page = 0; page < MAX_PAGES; page++) {
      const { data } = await deps.listUsers({ limit: PAGE, offset: page * PAGE });
      users.push(...data);
      if (data.length < PAGE) break;
    }
    const accounts = users
      .filter((u) => u.id !== "system")
      .map((u) => ({ id: u.id, name: u.fullName || u.username || null, email: u.primaryEmailAddress?.emailAddress ?? null }));
    return { accounts: orderAccounts(accounts, deps.ownerIds), clerk: "ok" };
  } catch (error) {
    console.error("admin: accounts could not be read from Clerk; listing stored ids", error);
    const ids = [...new Set(await deps.storedUserIds())].filter((id) => id !== "system");
    return { accounts: orderAccounts(ids.map((id) => ({ id, name: null, email: null })), deps.ownerIds), clerk: "down" };
  }
}
