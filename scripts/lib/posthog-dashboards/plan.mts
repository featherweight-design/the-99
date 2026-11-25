// What a run would do, as data. Pure: it reads the project's existing dashboards and insights (as the API lists them)
// and the definitions, and names one action per dashboard and insight. `scripts/posthog-dashboards.mts` prints the plan
// and, only with --apply, carries it out. Matching is by name; nothing is ever deleted.
import type { DashboardDef, InsightDef } from "./definitions.mts";

export type Existing = { id: number; name: string };
export type ExistingInsight = Existing & { description?: string | null; query?: unknown; dashboards?: number[] };

export type PlanStep =
  | { kind: "dashboard"; action: "create" | "keep"; name: string; id?: number }
  | { kind: "insight"; action: "create" | "update" | "keep"; name: string; dashboard: string; id?: number };

/** Everything the definition sets is in what PostHog returned (it adds defaults of its own, which are not a difference). */
export function contains(have: unknown, want: unknown): boolean {
  if (Array.isArray(want)) return Array.isArray(have) && have.length === want.length && want.every((w, i) => contains(have[i], w));
  if (want && typeof want === "object") {
    if (!have || typeof have !== "object" || Array.isArray(have)) return false;
    return Object.entries(want as Record<string, unknown>).every(([k, w]) => contains((have as Record<string, unknown>)[k], w));
  }
  return have === want;
}

function insightChanged(have: ExistingInsight, want: InsightDef, dashboardId: number | undefined): boolean {
  if ((have.description ?? "") !== want.description) return true;
  if (!contains(have.query, want.query)) return true;
  return dashboardId !== undefined && !(have.dashboards ?? []).includes(dashboardId);
}

export function planRun(defs: readonly DashboardDef[], dashboards: readonly Existing[], insights: readonly ExistingInsight[]): PlanStep[] {
  const steps: PlanStep[] = [];
  for (const def of defs) {
    const dash = dashboards.find((d) => d.name === def.name);
    steps.push(dash ? { kind: "dashboard", action: "keep", name: def.name, id: dash.id } : { kind: "dashboard", action: "create", name: def.name });
    for (const ins of def.insights) {
      const have = insights.find((i) => i.name === ins.name);
      if (!have) steps.push({ kind: "insight", action: "create", name: ins.name, dashboard: def.name });
      else steps.push({ kind: "insight", action: insightChanged(have, ins, dash?.id) ? "update" : "keep", name: ins.name, dashboard: def.name, id: have.id });
    }
  }
  return steps;
}

export function summarize(steps: readonly PlanStep[]): string {
  const count = (kind: PlanStep["kind"], action: string) => steps.filter((s) => s.kind === kind && s.action === action).length;
  return `dashboards: ${count("dashboard", "create")} to create, ${count("dashboard", "keep")} kept; insights: ${count("insight", "create")} to create, ${count("insight", "update")} to update, ${count("insight", "keep")} unchanged`;
}
