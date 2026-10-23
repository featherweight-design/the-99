// The rule behind Vercel's Ignored Build Step (`scripts/vercel-ignore.mjs`, wired by `ignoreCommand` in
// vercel.json). Pure, so it is tested alone. The one bias: when anything is unsure, BUILD. A wrongly built
// deploy costs about a minute of build time; a wrongly skipped one leaves a stale site.

/** The Vercel project that serves staging. Both projects build main; this one must never build anything else. */
export const STAGING_PROJECT_ID = "prj_1Wx9XFF4CBTahn7ca05T1alEAAnd";

/**
 * Paths a deployed build cannot read. An ALLOWLIST: a path matching nothing here is built for.
 * `docs/superpowers/eval` is read at runtime by the admin Costs page (`readEvalLedgers`), so it is not skippable.
 * `scripts/` is not here either: `tsconfig.json` includes it, so `next build` type-checks it.
 */
const EVAL_LEDGERS = /^docs\/superpowers\/eval(\/|$)/;
const SKIPPABLE_PREFIXES = ["docs/", "design/", ".github/", ".claude/"];
const ROOT_MARKDOWN = /^[^/]+\.md$/;

export function skippablePath(path) {
  if (EVAL_LEDGERS.test(path)) return false;
  if (ROOT_MARKDOWN.test(path)) return true;
  return SKIPPABLE_PREFIXES.some((p) => path.startsWith(p));
}

/**
 * @param {{ projectId?: string, env?: string, ref?: string, changed?: readonly string[] | null }} input
 * @returns {{ build: boolean, reason: string }}
 */
export function decide({ projectId, env, ref, changed }) {
  if (projectId === STAGING_PROJECT_ID && (env === "preview" || (ref && ref !== "main"))) {
    return { build: false, reason: `staging builds main only (env ${env ?? "?"}, ref ${ref ?? "?"})` };
  }
  if (!Array.isArray(changed) || changed.length === 0) return { build: true, reason: "no changed-file list: building" };
  const read = changed.filter((p) => !skippablePath(p));
  if (read.length > 0) return { build: true, reason: `${read.length} changed path(s) the build may read, first: ${read[0]}` };
  return { build: false, reason: `${changed.length} changed path(s), none the build reads` };
}

/**
 * The git arguments that list what a deploy would change. `-z` because git quotes a non-ASCII path otherwise
 * (the quote hides the prefix); `--no-renames` because a rename reports only its destination, so moving a
 * deployed file under `docs/` would hide the deletion of its source.
 */
export function diffArgs(previous) {
  return ["diff", "--name-only", "-z", "--no-renames", previous, "HEAD"];
}
