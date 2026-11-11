// A session Clerk made but holds "pending" until the reader finishes a session task (choosing an organization, resetting a
// compromised password, setting up a second factor). The app draws none of those screens, so a pending session goes to
// Clerk's HOSTED task page, which finishes the task and sends the reader back. Every way there passes through one in-app
// address, `/sign-in/tasks/<key>` (`app/sign-in/tasks`), which redirects to the hosted page: it is where Clerk's proxy
// redirect lands (`${signInUrl}/tasks`, in `createRedirect` in @clerk/backend), what `ClerkProvider`'s `taskUrls` name,
// and where the in-app sign-in sends a session `finalize` left pending. No React and no Node here: the client reads it too.

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
 * (`buildAccountsBaseUrl` in @clerk/shared): `clerk.<domain>` is `accounts.<domain>`, and a development instance's
 * `<name>.clerk.accounts.dev` is `<name>.accounts.dev`.
 */
export function accountsOrigin(frontendHost: string): string {
  return `https://${frontendHost.replace(/clerk\.accountsstage\./, "accountsstage.").replace(/clerk\.accounts\.|clerk\./, "accounts.")}`;
}

/**
 * The hosted task page, keeping `search` as given: Clerk's own `/sign-in/tasks` on the Account Portal, the address its proxy
 * redirect used before the cutover, which works out the session's current task itself. The hosted page reads `redirect_url`
 * from `search` and checks it against the instance's own allowed origins.
 */
export function hostedTaskUrl(frontendHost: string, search: string): string {
  return `${accountsOrigin(frontendHost)}/sign-in/tasks${search}`;
}
