import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import { actionName, tally } from "./action-names.mjs";

const manifest = () => {
  const dir = mkdtempSync(join(tmpdir(), "action-names-"));
  const file = join(dir, "server-reference-manifest.json");
  writeFileSync(file, JSON.stringify({ node: { abc123: { exportedName: "fetchSynopsis" }, def456: { exportedName: "fetchDeckProfile" } } }));
  return pathToFileURL(file);
};

describe("actionName", () => {
  it("names an id the manifest holds", () => {
    expect(actionName("abc123", manifest())).toBe("fetchSynopsis");
  });
  it("names an id it does not hold, or a missing manifest, unknown", () => {
    expect(actionName("zzz999", manifest())).toBe("unknown:zzz999");
    expect(actionName("abc123", pathToFileURL(join(tmpdir(), "no-such-manifest.json")))).toBe("unknown:abc123");
  });
});

describe("tally", () => {
  it("counts by name, sorted", () => {
    const m = manifest();
    expect(tally(["def456", "abc123", "abc123"], (id) => actionName(id, m))).toBe("fetchDeckProfile×1, fetchSynopsis×2");
    expect(tally([])).toBe("none");
  });
});
