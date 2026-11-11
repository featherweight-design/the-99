// /sign-in/tasks and /sign-in/tasks/<key>: where a pending session is sent (`lib/auth/session-tasks.ts`). With `signInUrl`
// set to the app's own `/sign-in`, Clerk's proxy sends a pending session to `/sign-in/tasks`; this page has no task screens of
// its own, so it hands the reader to Clerk's hosted task page, which finishes the task and sends them back.
// Public in `src/proxy.ts`: a pending session reads as signed out there, so a protected page here would redirect in a loop.
//
// Nothing of the query is forwarded as it came: anyone can write this address into a link. Only the way back goes on, made
// same-site by `signInReturn` and rebuilt as an absolute URL on the request's own host (the hosted page needs it absolute);
// with none, or an unsafe one, the hosted page uses its own default. The key in the path is ours alone: the hosted page
// works out the task from the session.

import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { HOME, requestHost, signInReturn } from "../../../../lib/auth/return-to";
import { hostedTaskUrl } from "../../../../lib/auth/session-tasks";
import { clerkFrontendHost } from "../../../../lib/security/headers";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** `http` only for a local server; every deployed host is served over https. */
const scheme = (host: string) => (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(host) ? "http" : "https");

export default async function SignInTasksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const host = requestHost(await headers());
  const path = signInReturn(await searchParams, host);
  const back = host && path !== HOME ? `${scheme(host)}://${host}${path}` : null;
  const frontendHost = clerkFrontendHost(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  // No key, or one naming no Account Portal (a misconfigured deploy): Home, which is public, rather than a loop.
  redirect((frontendHost && hostedTaskUrl(frontendHost, back)) || HOME);
}
