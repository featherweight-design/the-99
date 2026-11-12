// @vitest-environment node
import { describe, expect, it } from "vitest";
import { docsOnly } from "./ci-docs-only.mjs";

describe("docsOnly", () => {
  it("is true when every path is documentation nothing reads", () => {
    expect(docsOnly(["AGENTS.md", "docs/agents/ci.md", "docs/superpowers/plans/x.md", ".claude/x.md", "design/design_handoff_x/a.html"])).toBe(true);
  });
  it.each([
    "src/a.ts", "scripts/x.mjs", ".github/workflows/ci.yml", "package.json", "docs/superpowers/design-tables/a.md",
    "docs/superpowers/inventories/a.json", "docs/superpowers/eval/ledger.jsonl", "docs/superpowers/benchmarks/a.json",
    "docs/superpowers/design-briefs/a.md", "design/design_handoff_the99_combo_awareness/a.html", "design/design_handoff_the99_deck_analysis/assets/a.svg", "docs/superpowers/plans/2026-09-25-card-labels-report.md", "docs.md/x.ts", "src/docs/x.md",
  ])("is false when %s changes", (p) => {
    expect(docsOnly(["AGENTS.md", p])).toBe(false);
  });
  it("is false for an empty diff", () => {
    expect(docsOnly([])).toBe(false);
  });
});
