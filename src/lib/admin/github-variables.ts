import { JOB_VARIABLE_NAMES, type JobVariable } from "./models";

/**
 * The job switches' values, read from GitHub's repository variables (admin STATES M1, M2). SERVER-ONLY:
 * it reads `ADMIN_GITHUB_TOKEN`, and `src/lib/client-imports.test.ts` fails if any client component
 * reaches this module. Read only.
 *
 * The token never leaves this function: it is sent in one request header and is in no return value,
 * no log line and no error. No token is `{ values: null }` (M2) with no log line, since the token is
 * optional; a failed read (a non-2xx, a timeout, a body that is not the shape below) is the same, with
 * ONE fixed log line that carries nothing from the request or the response. Of the response, only the values of the listed names are kept.
 */

export const GITHUB_VARIABLES_URL = "https://api.github.com/repos/HartiganHM/the-99/actions/variables?per_page=100";
export const GITHUB_TIMEOUT_MS = 5_000;
/** A value longer than this is cut: these are switches and dollar figures, never prose. */
const MAX_VALUE_CHARS = 64;

/** Each listed variable's value, null when the repository does not set it; `values: null` when unread. */
export type JobValues = { values: Readonly<Record<JobVariable, string | null>> | null };

const UNREAD: JobValues = { values: null };

export type GithubDeps = {
  token: string | undefined;
  fetch: typeof fetch;
  log: (line: string) => void;
};

const defaultDeps = (): GithubDeps => ({
  token: process.env.ADMIN_GITHUB_TOKEN,
  fetch: globalThis.fetch,
  log: (line) => console.warn(line),
});

export const UNREAD_LOG = "[admin] job switch values unread";

/** Pure: the listed variables' values out of an API body, or null when the body is not the documented shape. */
export function pickJobValues(body: unknown): Record<JobVariable, string | null> | null {
  if (typeof body !== "object" || body === null) return null;
  const list = (body as { variables?: unknown }).variables;
  if (!Array.isArray(list)) return null;
  const out = Object.fromEntries(JOB_VARIABLE_NAMES.map((n) => [n, null])) as Record<JobVariable, string | null>;
  for (const v of list) {
    if (typeof v !== "object" || v === null) continue;
    const { name, value } = v as { name?: unknown; value?: unknown };
    if (typeof name !== "string" || typeof value !== "string") continue;
    if (!(JOB_VARIABLE_NAMES as readonly string[]).includes(name)) continue;
    out[name as JobVariable] = value.slice(0, MAX_VALUE_CHARS);
  }
  return out;
}

export async function readJobValues(deps: GithubDeps = defaultDeps()): Promise<JobValues> {
  const token = deps.token?.trim();
  if (!token) return UNREAD;
  try {
    const res = await deps.fetch(GITHUB_VARIABLES_URL, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      cache: "no-store",
      signal: AbortSignal.timeout(GITHUB_TIMEOUT_MS),
    });
    if (!res.ok) {
      deps.log(UNREAD_LOG);
      return UNREAD;
    }
    const values = pickJobValues(await res.json());
    if (!values) {
      deps.log(UNREAD_LOG);
      return UNREAD;
    }
    return { values };
  } catch {
    deps.log(UNREAD_LOG);
    return UNREAD;
  }
}
