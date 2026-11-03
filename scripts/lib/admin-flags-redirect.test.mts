// The admin's flag pages moved from /admin/switches to /admin/flags (flags-in-DB plan §7): every old URL, the list and
// each flag's page, must land on its new path with a permanent redirect, so a bookmark keeps working. Read from the
// source, not imported: next.config.ts wraps the config in Sentry's build plugin.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../../next.config.ts", import.meta.url), "utf8");

describe("the /admin/switches redirect", () => {
  it("sends every old path, the [name] segment included, to /admin/flags permanently", () => {
    expect(source).toMatch(/\{\s*source:\s*"\/admin\/switches\/:path\*",\s*destination:\s*"\/admin\/flags\/:path\*",\s*permanent:\s*true\s*\}/);
  });

  it("leaves no page at the old path", () => {
    expect(() => readFileSync(new URL("../../src/app/admin/switches/page.tsx", import.meta.url))).toThrow();
  });
});
