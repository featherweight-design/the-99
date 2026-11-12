// Whether a pull request changes only files nothing in CI reads, so the heavy jobs (install, build, test shards)
// can be skipped. Pure; `scripts/ci-docs-only.mjs` gathers the diff. An ALLOWLIST: a path that matches nothing
// here counts as code, and one unsure path means the full job runs.
//
// Narrower than `scripts/lib/vercel-ignore.mjs` on purpose: Vercel skips builds for any `docs/`, but CI's
// tree-reading guards DO read some of it (`docs/superpowers/design-tables` for `check:copy-drift`,
// `docs/superpowers/inventories` for `check:shared`, `docs/superpowers/eval`, `docs/superpowers/benchmarks`,
// `docs/superpowers/design-briefs`, and one handoff under `design/`). Add a prefix here only after checking
// that no test or check reads it.
const ALLOWED = [
  /^[^/]+\.md$/,
  /^docs\/agents\//,
  /^docs\/probes\.md$/,
  /^docs\/superpowers\/(plans|specs)\//,
  /^\.claude\//,
  /^design\/(?!design_handoff_the99_combo_awareness\/)/,
];

/** @param {readonly string[]} changed */
export function docsOnly(changed) {
  return changed.length > 0 && changed.every((p) => ALLOWED.some((re) => re.test(p)));
}
