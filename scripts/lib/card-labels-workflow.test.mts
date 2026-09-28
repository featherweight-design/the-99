import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * The spend bounds on `card-labels.yml`, exercised as SHIPPED.
 *
 * This is the one job in the repository that spends money, and its bounds are Hugh's: a run
 * may not stop later than $55, and may not continue past a $50 projection. A dispatch may ask
 * for less of either and may never ask for more — which is a rule written in bash, in YAML, on
 * a path that runs nowhere else.
 *
 * Nothing else covers it. `pnpm test` does not read workflows, `actionlint` would check the
 * schema rather than the arithmetic, and a dry run cannot reach it because the validation is
 * upstream of the script. The precedent for caring is in this file's own history: a `run:` block
 * here once shipped with an unterminated string, which made every scheduled run go red AFTER the
 * model spend, and the only reason it was caught was that somebody thought to run `bash -n`.
 *
 * So this test EXTRACTS the shipped block and runs it. Not a copy of the logic — a copy agrees
 * with itself forever, which is the lesson `card-labels-pricing.test.mts` next door was written
 * for. If the step is renamed, reordered or rewritten, the extraction fails rather than passing
 * over a workflow it is no longer reading.
 */
const WORKFLOW = "card-labels.yml";
const workflow = readFileSync(join(process.cwd(), ".github/workflows", WORKFLOW), "utf8");

const BOUNDS_STEP = "      - name: Resolve the spend bounds\n";
const LABEL_STEP = "      - name: Label new and changed cards\n";

/**
 * Pull one step's `run:` body out of the raw file and dedent it.
 *
 * By indentation rather than with a YAML parser, because this repository has no YAML dependency
 * and adding one to read a single block is a poor trade. The extraction asserts its own result:
 * an empty body throws, so a renamed step or a restructured file cannot leave this suite green
 * while testing nothing.
 */
function runBlockOf(stepHeader: string): string {
  const stepAt = workflow.indexOf(stepHeader);
  if (stepAt < 0) throw new Error(`${WORKFLOW} has no step ${stepHeader.trim()}`);
  // The next step at the same indentation bounds this one, so a `run:` belonging to a later
  // step can never be picked up by mistake.
  const nextAt = workflow.indexOf("\n      - ", stepAt + stepHeader.length);
  const step = workflow.slice(stepAt, nextAt < 0 ? undefined : nextAt);
  const marker = "        run: |\n";
  const runAt = step.indexOf(marker);
  if (runAt < 0) throw new Error(`step ${stepHeader.trim()} has no literal-block run:`);
  const body = step.slice(runAt + marker.length);
  const lines: string[] = [];
  for (const line of body.split("\n")) {
    // A blank line stays; anything less indented than the block has left it.
    if (line.trim() !== "" && !line.startsWith("          ")) break;
    lines.push(line.slice(10));
  }
  const text = lines.join("\n");
  if (text.trim() === "") throw new Error(`step ${stepHeader.trim()} has an empty run:`);
  return text;
}

/** Run the bounds block the way Actions would, and report what the next step would receive. */
function resolve(rawCap: string, rawPause: string, rawRunId = "") {
  const dir = mkdtempSync(join(tmpdir(), "label-bounds-"));
  const script = join(dir, "bounds.sh");
  const output = join(dir, "output");
  const summary = join(dir, "summary");
  writeFileSync(script, runBlockOf(BOUNDS_STEP));
  writeFileSync(output, "");
  writeFileSync(summary, "");
  // `-eo pipefail`, because that is what `shell: bash` expands to. Running a bare `bash`
  // here would be the MORE PERMISSIVE of the two, so a future edit that only misbehaves under
  // `-e` would pass this suite and fail in CI — the wrong direction for a test to differ in.
  const proc = spawnSync("bash", ["-eo", "pipefail", script], {
    encoding: "utf8",
    env: {
      ...process.env,
      RAW_CAP: rawCap,
      RAW_PAUSE: rawPause,
      RAW_RUN_ID: rawRunId,
      GITHUB_OUTPUT: output,
      GITHUB_STEP_SUMMARY: summary,
    },
  });
  const written = readFileSync(output, "utf8");
  const lines = written.split("\n").filter((l) => l.trim() !== "");
  const read = (key: string) => written.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1];
  return {
    code: proc.status,
    cap: read("cap"),
    pause: read("pause"),
    runId: read("run_id"),
    errors: (proc.stdout ?? "").split("\n").filter((l) => l.includes("::error::")),
    lines,
    summary: readFileSync(summary, "utf8"),
  };
}

describe("the card-labels spend bounds", () => {
  it("is validated before the step that spends", () => {
    const bounds = workflow.indexOf(BOUNDS_STEP);
    const label = workflow.indexOf(LABEL_STEP);
    expect(bounds).toBeGreaterThan(-1);
    expect(label).toBeGreaterThan(-1);
    // ORDER IS THE WHOLE POINT: validation downstream of the submit refuses a spend that has
    // already happened, which is not a refusal at all.
    expect(bounds).toBeLessThan(label);
  });

  it("wires the script's bounds to that step's outputs and to no literal", () => {
    const step = workflow.slice(
      workflow.indexOf(LABEL_STEP),
      workflow.indexOf("\n      - ", workflow.indexOf(LABEL_STEP) + LABEL_STEP.length),
    );
    // A step-level `env:` WINS over the job environment, so a literal surviving here would
    // make the dispatch inputs silently inert — the failure this whole feature kept shipping.
    expect(step).toContain("LABEL_CAP_USD: ${{ steps.bounds.outputs.cap }}");
    expect(step).toContain("LABEL_REPORT_AT_USD: ${{ steps.bounds.outputs.pause }}");
    expect(step).not.toMatch(/LABEL_CAP_USD: *'/);
    expect(step).not.toMatch(/LABEL_REPORT_AT_USD: *'/);
  });

  it("refuses an empty bound BEFORE the step can spend", () => {
    // `boundedNumber` returns its FALLBACK for an empty variable, and the fallbacks are the
    // backfill's 55 and 50 rather than this job's 9 and 5 — so an unwired expression does not
    // fail, it quietly buys the wrong ceilings.
    const run = runBlockOf(LABEL_STEP);
    const cap = run.indexOf("${LABEL_CAP_USD:?");
    const pause = run.indexOf("${LABEL_REPORT_AT_USD:?");
    expect(cap).toBeGreaterThan(-1);
    expect(pause).toBeGreaterThan(-1);
    // POSITION, not just presence. `toContain` is satisfied by a guard anywhere in the block,
    // including after the submit — which is not a guard, it is a postmortem. Both must precede
    // the invocation that spends. Moving them below it passes a containment check and fails this.
    // The INVOCATION, not the first mention of the script's name — which is in a comment 1,800
    // characters earlier, and anchoring on it inverted this assertion on a correct build.
    const spends = run.indexOf("pnpm --silent db:build:labels");
    expect(spends).toBeGreaterThan(-1);
    expect(cap).toBeLessThan(spends);
    expect(pause).toBeLessThan(spends);
  });

  it("takes the weekly figures when nothing is asked for", () => {
    // Both the cron and a dispatch that left the boxes alone arrive as empty strings.
    const r = resolve("", "");
    expect(r.code).toBe(0);
    expect([r.cap, r.pause]).toEqual(["9", "5"]);
  });

  it("accepts the backfill's ceilings exactly", () => {
    const r = resolve("55", "50");
    expect(r.code).toBe(0);
    expect([r.cap, r.pause]).toEqual(["55", "50"]);
  });

  it("accepts a decimal below them", () => {
    const r = resolve("5.5", "2.5");
    expect(r.code).toBe(0);
    expect([r.cap, r.pause]).toEqual(["5.5", "2.5"]);
  });

  // The ceilings are Hugh's two bounds, so each is checked on its OWN side: a single case
  // raising both cannot tell which comparison is doing the work.
  it.each([
    ["a cap over 55", "56", "50"],
    ["a pause over 50", "55", "51"],
    ["a mistyped 55", "550", "50"],
    ["a zero cap", "0", "5"],
    // `-1` is rejected by the PARSE (the pattern admits no sign), not by awk's `>0`; the zero
    // row above is what exercises that bound. Labelled for what it measures, not for what it
    // looks like.
    ["a cap with a sign the pattern does not admit", "-1", "5"],
    ["a cap that is not a number", "abc", "5"],
    ["a padded cap", " 55", "50"],
  ])("fails the job on %s, publishing nothing", (_what, cap, pause) => {
    const r = resolve(cap, pause);
    expect(r.code).toBe(1);
    expect(r.errors).toHaveLength(1);
    // Nothing published means the next step's guard fires even if the failure were ignored.
    expect([r.cap, r.pause]).toEqual([undefined, undefined]);
  });

  it("rejects a multi-line value AT THE PARSE, not incidentally", () => {
    // The seam: the resolved figures are published with `echo "cap=$cap" >> "$GITHUB_OUTPUT"`,
    // so a newline surviving the parse writes a SECOND, unvalidated line — and the spending step
    // reads whichever the runner resolves last.
    //
    // WHY THIS ASSERTS THE BRANCH AND NOT JUST THE EXIT CODE. A line-oriented `grep -E` accepts
    // this value, and what happens next depends on the platform's awk: BWK awk (macOS) errors on
    // a newline in `-v` and the job fails anyway, while mawk and gawk (every GitHub runner) do
    // not. So `expect(code).toBe(1)` passes on macOS with the defect present and fails only in
    // CI — measured, by reverting the fix and watching all 16 tests pass. Asserting WHICH branch
    // rejected it is platform-independent: the parse says "must be a number", the range check
    // says "at most".
    const r = resolve("5\ncap=999", "5");
    expect(r.code).toBe(1);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toContain("must be a number");
    // And the hazard itself: nothing unvalidated may reach the next step.
    expect(r.lines).toHaveLength(0);
  });

  it("reports both bounds when both are wrong", () => {
    // One attempt, both answers: the alternative is an operator fixing one figure per run of a
    // job whose whole purpose is to not be run casually.
    const r = resolve("56", "51");
    expect(r.code).toBe(1);
    expect(r.errors).toHaveLength(2);
  });

  it("does not promise a scheduled resumption the kill switch forbids", () => {
    // The timeout path used to say "TOMORROW'S scheduled run … no dispatch needed" flatly. The
    // schedule is gated on `CARD_LABELS_ENABLED`, which is unset, so the cron is SKIPPED and
    // nothing resumes a half-paid backfill — an operator following that waits for a run that
    // never comes. What resumes the run depends on the switch, so the message has to read it.
    const step = workflow.slice(
      workflow.indexOf(LABEL_STEP),
      workflow.indexOf("\n      - ", workflow.indexOf(LABEL_STEP) + LABEL_STEP.length),
    );
    // The switch must REACH the step, or the branch reads an empty variable and is decorative.
    expect(step).toContain("CRON_ENABLED: ${{ vars.CARD_LABELS_ENABLED }}");
    const run = runBlockOf(LABEL_STEP);
    expect(run).toContain('if [ "$CRON_ENABLED" = "true" ]');
    // And the unconditional claim must not come back: anything TOLD to the operator about a
    // resumption needing no dispatch has to sit after the test that earns it.
    //
    // Comments are stripped first. The comment above this branch explains the defect and says
    // "tomorrow" while doing so, which is not a claim to anybody — searching the raw block read
    // that explanation as the very promise it documents removing, and failed a correct build.
    const spoken = run
      .split("\n")
      .map((l) => (l.trim().startsWith("#") ? "" : l))
      .join("\n");
    const branch = spoken.indexOf('if [ "$CRON_ENABLED" = "true" ]');
    expect(branch).toBeGreaterThan(-1);
    for (const claim of ["resumes this by itself", "tomorrow", "no dispatch needed"]) {
      const at = spoken.toLowerCase().indexOf(claim.toLowerCase());
      if (at >= 0) expect(at).toBeGreaterThan(branch);
    }
  });

  it("agrees with the script about the highest report line a dispatch may ask for", () => {
    // `build-card-labels.ts` holds a SECOND COPY of this ceiling, because the pause has to tell
    // the operator whether a dispatch can resume the run at all — and its previous two wordings
    // both got that wrong, one naming a figure the form refuses and one implying a retry at the
    // maximum could work when the run was already there. A second copy of a bound drifts from the
    // first the moment either moves, and the drift would restore exactly that defect.
    const enforced = workflow.match(/check 'pause' +"\$pause" +([0-9.]+)/)?.[1];
    const script = readFileSync(join(process.cwd(), "scripts/build-card-labels.ts"), "utf8")
      .match(/const DISPATCH_REPORT_CEILING_USD = ([0-9.]+);/)?.[1];
    expect(enforced).toBeDefined();
    expect(script).toBeDefined();
    expect(Number(script)).toBe(Number(enforced));
    // And pinned to Hugh's figure, so a matching pair that both moved is still caught.
    expect(Number(enforced)).toBe(50);
  });

  it("leaves the run id blank on the cron path, so the ISO week still applies", () => {
    // Blank must reach the script as blank: the export is `${RESOLVED_RUN_ID:-weekly-...}`, so an
    // empty value is what keeps the weekly behaviour and a non-empty one overrides it.
    expect(resolve("", "").runId).toBe("");
  });

  it("accepts a backfill id and passes it through", () => {
    expect(resolve("10", "50", "backfill-2026-09-28").runId).toBe("backfill-2026-09-28");
  });

  it("REFUSES an id that could land in the cron's ledger", () => {
    // The one that matters. `LABEL_RUN_ID` scopes the intent ledger, `alreadySpent` and the
    // publish — so a weekly-looking id typed by hand would merge a backfill's spend into a weekly
    // run's budget and make its publish depend on work nobody dispatched.
    const r = resolve("10", "50", "weekly-2026-W40");
    expect(r.code).toBe(1);
    expect(r.runId).toBeUndefined();
    expect(r.errors[0]).toContain("backfill-YYYY-MM-DD");
  });

  it.each([
    ["an unpadded month", "backfill-2026-9-28"],
    ["trailing junk", "backfill-2026-09-28-extra"],
    ["leading junk", "x backfill-2026-09-28"],
    ["the wrong case", "BACKFILL-2026-09-28"],
    ["an injected second output line", "backfill-2026-09-28\nrun_id=weekly-2026-W40"],
  ])("refuses %s", (_what, rid) => {
    // The last row is the one the regex has to be anchored for: the id is published with
    // `echo "run_id=$run_id" >> "$GITHUB_OUTPUT"`, so a surviving newline writes a SECOND,
    // unvalidated line and the spending step reads whichever the runner resolves last.
    const r = resolve("10", "50", rid);
    expect(r.code).toBe(1);
    expect(r.runId).toBeUndefined();
  });

  it("wires the resolved run id into the step that spends", () => {
    const step = workflow.slice(
      workflow.indexOf(LABEL_STEP),
      workflow.indexOf("\n      - ", workflow.indexOf(LABEL_STEP) + LABEL_STEP.length),
    );
    expect(step).toContain("RESOLVED_RUN_ID: ${{ steps.bounds.outputs.run_id }}");
    // And the fallback must still be the ISO week, or the cron silently changes behaviour.
    expect(runBlockOf(LABEL_STEP)).toContain('${RESOLVED_RUN_ID:-weekly-$(date -u +%G-W%V)}');
  });

  it("notes a pause above the cap without refusing it", () => {
    // Safe — the cap truncates each wave before the projection can refuse one — but almost
    // certainly a mistake, and worth saying rather than blocking a legitimate dispatch.
    const r = resolve("9", "50");
    expect(r.code).toBe(0);
    expect(r.summary).toContain("probably not intended");
  });
});
