// A session Clerk made but holds "pending" until the reader finishes a session task (choosing an organization, resetting a
// compromised password, setting up a second factor). The app draws none of those screens, so a pending session goes to
// Clerk's HOSTED task page, which finishes the task and sends the reader back. Every way there passes through the in-app
// `/sign-in/tasks` (`app/sign-in/tasks`), which redirects to the hosted page: Clerk's proxy redirect lands on it with no
// key (`${signInUrl}/tasks`, in `createRedirect` in @clerk/backend), as does an unknown key; `ClerkProvider`'s `taskUrls`
// and the in-app sign-in's `finalize` use `/sign-in/tasks/<key>`. The key lives in our path only: the hosted page works out
// the task from the session itself. No React and no Node here: the client reads it too.

/** The task keys Clerk names (`SessionTask['key']` in @clerk/shared). */
export const SESSION_TASKS = ["choose-organization", "reset-password", "setup-mfa"] as const;
export type SessionTaskKey = (typeof SESSION_TASKS)[number];

/** The in-app address every pending session is sent to, before the hosted page. */
export const SIGN_IN_TASKS_PATH = "/sign-in/tasks";

/** `ClerkProvider`'s `taskUrls`: each task at its in-app address. */
export const TASK_URLS: Record<SessionTaskKey, string> = Object.fromEntries(
  SESSION_TASKS.map((key) => [key, `${SIGN_IN_TASKS_PATH}/${key}`]),
) as Record<SessionTaskKey, string>;

/** The in-app task address for `key`, with the absolute page to come back to as `redirect_url` (the hosted page needs it absolute). */
export function taskPath(key: string, back: string): string {
  const known = (SESSION_TASKS as readonly string[]).includes(key) ? `/${key}` : "";
  return `${SIGN_IN_TASKS_PATH}${known}?redirect_url=${encodeURIComponent(back)}`;
}

/**
 * The Account Portal's origin for a Frontend API host, as Clerk derives it when no `signInUrl` is set
 * (`buildAccountsBaseUrl` in @clerk/shared), for the two shapes this app's keys name: a production `clerk.<domain>` is
 * `accounts.<domain>`, and a development `<name>.clerk.accounts.dev` is `<name>.accounts.dev`. Anything else is `null`, so
 * the task page falls back to Home rather than guess at a host.
 */
export function accountsOrigin(frontendHost: string): string | null {
  const dev = /^([a-z0-9-]+)\.clerk\.accounts\.dev$/i.exec(frontendHost);
  if (dev) return `https://${dev[1]}.accounts.dev`;
  const prod = /^clerk\.((?:[a-z0-9-]+\.)+[a-z]{2,})$/i.exec(frontendHost);
  return prod ? `https://accounts.${prod[1]}` : null;
}

/**
 * The hosted task page, Clerk's own `/sign-in/tasks` on the Account Portal (the address its proxy redirect used before the
 * cutover, which works out the session's current task itself), with `back` as its `redirect_url` when there is one. `null`
 * when the host names no Account Portal.
 */
export function hostedTaskUrl(frontendHost: string, back: string | null): string | null {
  const origin = accountsOrigin(frontendHost);
  if (!origin) return null;
  return `${origin}/sign-in/tasks${back ? `?redirect_url=${encodeURIComponent(back)}` : ""}`;
}
