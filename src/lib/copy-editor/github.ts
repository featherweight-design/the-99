// The two GitHub calls the copy editor makes, both with `COPY_EDIT_DISPATCH_TOKEN` (a fine-grained token for this
// repository: Actions write to start the workflow, Pull requests read for the status lookup; a 403 there reads as `unknown`). It starts the `Copy edit` workflow and reads whether that workflow's pull request exists. It never
// creates a branch, a commit or a pull request: the workflow does, with its own token. The token is read by the route and passed in, never logged.
import { EDIT_BRANCH_RE, type SubmittedEdit } from "../../../scripts/lib/copy-sheet/submission.mts";

export const REPO = "featherweight-design/the-99";
export const WORKFLOW_FILE = "copy-edit.yml";
const API = "https://api.github.com";

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "User-Agent": "the-99-copy-editor",
});

/** Starts the workflow on main with the branch name and the edits (one JSON string). True when GitHub accepted it (204). Never throws. */
export async function dispatchCopyEdit(token: string, branch: string, edits: readonly SubmittedEdit[], doFetch: typeof fetch = fetch): Promise<boolean> {
  try {
    const res = await doFetch(`${API}/repos/${REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`, {
      method: "POST",
      headers: { ...headers(token), "Content-Type": "application/json" },
      body: JSON.stringify({ ref: "main", inputs: { branch, edits: JSON.stringify(edits) } }),
      signal: AbortSignal.timeout(10_000),
    });
    return res.status === 204;
  } catch {
    return false;
  }
}

export type PrState = { state: "none" } | { state: "unknown" } | { state: "open" | "merged" | "closed"; number: number; url: string };

/** The pull request the workflow opened from `branch`, if it has. `unknown` on any GitHub error (the token may lack Pull requests: read). Never throws. */
export async function findCopyEditPr(token: string, branch: string, doFetch: typeof fetch = fetch): Promise<PrState> {
  if (!EDIT_BRANCH_RE.test(branch)) return { state: "unknown" };
  try {
    const res = await doFetch(`${API}/repos/${REPO}/pulls?state=all&per_page=1&head=${encodeURIComponent(`${REPO.split("/")[0]}:${branch}`)}`, {
      headers: headers(token),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { state: "unknown" };
    const [pr] = (await res.json()) as { number: number; html_url: string; state: string; merged_at: string | null }[];
    if (!pr) return { state: "none" };
    return { state: pr.merged_at ? "merged" : pr.state === "open" ? "open" : "closed", number: pr.number, url: pr.html_url };
  } catch {
    return { state: "unknown" };
  }
}
