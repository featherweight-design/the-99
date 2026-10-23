// The weekly cost check (`.github/workflows/cost-check.yml`). READ-ONLY: GETs against Vercel and Neon, nothing else.
// Reads VERCEL_USAGE_TOKEN, NEON_API_KEY_READONLY and COST_CHECK_VERCEL_TEAM_ID from the environment, never a file.
// Writes the summary to $GITHUB_STEP_SUMMARY and --report, this run's Neon snapshot to --snapshot, and exits 1 when
// a rule fires or either source cannot be read. Previous snapshot: --previous <file> (optional).
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { fetchCharges, fetchDeployments, fetchNeon, neonWeek, parsePrevious, splitWeeks, summariseNeon } from "./lib/cost-sources.mjs";
import { evaluate } from "./lib/cost-thresholds.mjs";
import { renderReport } from "./lib/cost-report.mjs";

const PROJECTS = { "the-99": "prj_gxP72IqpQEQxbpW9qVdSTv8aB7OC", "the-99-staging": "prj_1Wx9XFF4CBTahn7ca05T1alEAAnd" };
const NEON_PROJECT = process.env.NEON_PROJECT_ID || "misty-rain-01681654";

const args = process.argv.slice(2);
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const now = new Date();
const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
const weekStart = new Date(today.getTime() - 7 * 86_400_000);
const prevStart = new Date(today.getTime() - 14 * 86_400_000);

let vercel = null, builds = null, neon = null, week = null;
const problems = [];

try {
  const token = process.env.VERCEL_USAGE_TOKEN, teamId = process.env.COST_CHECK_VERCEL_TEAM_ID;
  if (!token || !teamId) throw new Error("VERCEL_USAGE_TOKEN or COST_CHECK_VERCEL_TEAM_ID is not set");
  vercel = splitWeeks(await fetchCharges({ token, teamId, from: prevStart, to: today }), weekStart);
  builds = {};
  for (const [name, projectId] of Object.entries(PROJECTS)) builds[name] = (await fetchDeployments({ token, teamId, projectId, from: weekStart, to: today })).length;
} catch (e) {
  problems.push(`Vercel: ${e.message}`);
  vercel = null;
}

try {
  const token = process.env.NEON_API_KEY_READONLY;
  if (!token) throw new Error("NEON_API_KEY_READONLY is not set");
  neon = summariseNeon(await fetchNeon({ token, projectId: NEON_PROJECT }), now);
  const prevFile = flag("--previous");
  // A missing or unparsable baseline only skips the weekly comparison; it must not discard this run's own reads.
  const text = prevFile && existsSync(prevFile) ? readFileSync(prevFile, "utf8") : null;
  const previous = text === null ? null : parsePrevious(text);
  if (text !== null && previous === null) problems.push("Neon: the previous snapshot could not be read; the weekly comparison was skipped");
  week = neonWeek(neon, previous);
  if (flag("--snapshot")) writeFileSync(flag("--snapshot"), JSON.stringify(neon));
} catch (e) {
  problems.push(`Neon: ${e.message}`);
  neon = null;
}

const verdict = evaluate({ vercel, neon, neonWeek: week });
let md = renderReport({ date: now.toISOString().slice(0, 10), vercel, neon, neonWeek: week, verdict, builds });
if (problems.length) md += `\n### Could not read\n\n${problems.map((p) => `- ${p}`).join("\n")}\n`;
console.log(md);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);
if (flag("--report")) writeFileSync(flag("--report"), md);
process.exit(verdict.red ? 1 : 0);
