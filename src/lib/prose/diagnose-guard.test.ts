import { describe, expect, it } from "vitest";
import { diagnoseRefusal, type DiagnoseCheck } from "./diagnose-guard";

const ok: DiagnoseCheck = { name: "Jace, Multiverse Architect", dryRun: false, oneCallUsd: 0.01, maxUsd: 0.1, matches: 1, suppressed: false };

describe("diagnoseRefusal", () => {
  it("lets one call through for one commander under the cap", () => {
    expect(diagnoseRefusal(ok)).toBeNull();
  });
  it("refuses a missing name or a flag read as the name", () => {
    expect(diagnoseRefusal({ ...ok, name: undefined })).toMatch(/needs a commander name/);
    expect(diagnoseRefusal({ ...ok, name: "--dry-run" })).toMatch(/needs a commander name/);
  });
  it("refuses to combine with --dry-run, which promises no call", () => {
    expect(diagnoseRefusal({ ...ok, dryRun: true })).toMatch(/--dry-run/);
  });
  it("refuses when one call's worst case is over the cap", () => {
    expect(diagnoseRefusal({ ...ok, oneCallUsd: 0.2 })).toMatch(/over PROSE_MAX_USD \$0\.10/);
  });
  it("refuses no match, an ambiguous name and a suppressed commander", () => {
    expect(diagnoseRefusal({ ...ok, matches: 0 })).toMatch(/0 commanders are named/);
    expect(diagnoseRefusal({ ...ok, matches: 2 })).toMatch(/2 commanders are named/);
    expect(diagnoseRefusal({ ...ok, suppressed: true })).toMatch(/suppressed/);
  });
});
