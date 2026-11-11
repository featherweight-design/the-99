// /sign-in/tasks and /sign-in/tasks/<key>: where a pending session is sent (`lib/auth/session-tasks.ts`). With `signInUrl`
// set to the app's own `/sign-in`, Clerk's proxy sends a pending session to `/sign-in/tasks`; this page has no task screens of
// its own, so it hands the reader to Clerk's hosted task page, query kept, which finishes the task and sends them back.
// Public in `src/proxy.ts`: a pending session reads as signed out there, so a protected page here would redirect in a loop.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { hostedTaskUrl } from "../../../../lib/auth/session-tasks";
import { clerkFrontendHost } from "../../../../lib/security/headers";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SignInTasksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) query.append(key, v);
  }
  const search = query.toString();
  const host = clerkFrontendHost(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  // No key to read the hosted page from (a misconfigured deploy): Home, which is public, rather than a loop.
  redirect(host ? hostedTaskUrl(host, search ? `?${search}` : "") : "/");
}
