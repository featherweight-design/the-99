import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { adminEnvironment, type AdminEnv } from "./environment";

/**
 * Who may open the admin (admin brief, ruling 5 and locked rule 10). SERVER-ONLY: the list is read
 * here and nowhere else, and only a boolean ever leaves the server (the account menu's
 * `adminDoor`). Every `/admin` layout, page and action calls `requireAdmin()` first.
 *
 * `ADMIN_USER_IDS` is a comma-separated list of Clerk user ids. Unset or empty, nobody is an admin.
 * An unlabelled environment (`environment.ts`) has no admin either.
 */
export function adminUserIds(value: string | undefined = process.env.ADMIN_USER_IDS): ReadonlySet<string> {
  return new Set((value ?? "").split(",").map((id) => id.trim()).filter(Boolean));
}

export function isAdmin(userId: string | null | undefined): boolean {
  return !!userId && adminEnvironment() !== null && adminUserIds().has(userId);
}

/**
 * A route's own metadata for the admin, and nothing for anyone else. Next resolves metadata apart
 * from the render, so a static `metadata` export would name the page (its title, its `robots`) on
 * the 404 a stranger gets, where an unknown path carries only the root's (STATES must-not).
 */
export async function adminMetadata<T extends object>(meta: T): Promise<T | Record<string, never>> {
  const { userId } = await auth();
  return isAdmin(userId) ? meta : {};
}

/**
 * The admin and the environment it administers, or the app's own 404 for anyone else, signed out
 * included (STATES D3, D4). Never a refusal: nothing says `/admin` exists.
 */
export async function requireAdmin(): Promise<{ userId: string; env: AdminEnv }> {
  const { userId } = await auth();
  const env = adminEnvironment();
  if (!userId || !env || !isAdmin(userId)) notFound();
  return { userId, env };
}
