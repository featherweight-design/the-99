// Makes the PostHog dashboards in scripts/lib/posthog-dashboards/definitions.mts. DRY RUN BY DEFAULT: it reads the
// project (GET only) and prints what it would create or update. `--apply` writes.
//
//   pnpm posthog:dashboards            # dry run
//   pnpm posthog:dashboards --apply    # create and update, by name; never deletes
//
// WHAT IT WRITES TO: the PostHog project named by POSTHOG_PROJECT_ID, with the personal API key POSTHOG_PERSONAL_API_KEY
// (a personal key, NOT the `phc_` project key the browser sends events with). Both come through `scripts/lib/env.mjs`
// locally and from repository secrets in the `PostHog dashboards` workflow, which is where the production project is
// written. Only dashboards and insights are touched, and only ones with the names in the definitions.
import { requireEnv } from "./lib/env.mjs";
import { apiHostFor, makeClient } from "./lib/posthog-dashboards/client.mts";
import { DASHBOARDS } from "./lib/posthog-dashboards/definitions.mts";
import { planRun, summarize } from "./lib/posthog-dashboards/plan.mts";

async function main() {
  const apply = process.argv.includes("--apply");
  const { POSTHOG_PERSONAL_API_KEY, POSTHOG_PROJECT_ID } = requireEnv(["POSTHOG_PERSONAL_API_KEY", "POSTHOG_PROJECT_ID"]);
  const host = apiHostFor({ POSTHOG_API_HOST: process.env.POSTHOG_API_HOST, NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST });
  const client = makeClient(host, POSTHOG_PROJECT_ID!, POSTHOG_PERSONAL_API_KEY!);

  const [dashboards, insights] = await Promise.all([client.dashboards(), client.insights()]);
  const steps = planRun(DASHBOARDS, dashboards, insights);
  console.log(`${apply ? "APPLY" : "DRY RUN"} against ${host}, project ${POSTHOG_PROJECT_ID}`);
  for (const s of steps) console.log(`  ${s.action.padEnd(6)} ${s.kind.padEnd(9)} ${s.name}`);
  console.log(summarize(steps));
  if (!apply) {
    console.log("Nothing written. Re-run with --apply to write.");
    return;
  }

  const dashIds = new Map<string, number>(dashboards.map((d) => [d.name, d.id]));
  for (const def of DASHBOARDS) {
    if (!dashIds.has(def.name)) dashIds.set(def.name, (await client.createDashboard(def)).id);
    const dashboardId = dashIds.get(def.name)!;
    for (const ins of def.insights) {
      const step = steps.find((s) => s.kind === "insight" && s.name === ins.name)!;
      if (step.action === "create") await client.createInsight(ins, dashboardId);
      else if (step.action === "update") {
        const have = insights.find((i) => i.id === step.id)!;
        await client.updateInsight(step.id!, ins, [...new Set([...(have.dashboards ?? []), dashboardId])]);
      }
    }
  }
  console.log("Done.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "failed");
  process.exit(1);
});
