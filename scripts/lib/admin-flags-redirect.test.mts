// The admin's flag pages moved from /admin/switches to /admin/flags (flags-in-DB plan §7): every old URL, the list and
// each flag's page, must land on its new path with a permanent redirect, so a bookmark keeps working. Read from the
// source, not imported: next.config.ts wraps the config in Sentry's build plugin. Paths are from the repo root, as
// public-reads.test.mts reads src/proxy.ts.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = readFileSync(join(root, "next.config.ts"), "utf8");

describe("the /admin/switches redirect", () => {
  it("sends every old path, the [name] segment included, to /admin/flags permanently", () => {
    expect(source).toMatch(/\{\s*source:\s*"\/admin\/switches\/:path\*",\s*destination:\s*"\/admin\/flags\/:path\*",\s*permanent:\s*true\s*\}/);
  });

  it("leaves no page at the old path", () => {
    expect(existsSync(join(root, "src/app/admin/switches/page.tsx"))).toBe(false);
    expect(existsSync(join(root, "src/app/admin/flags/page.tsx"))).toBe(true);
  });
});
