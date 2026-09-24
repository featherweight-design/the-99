import { describe, expect, it, vi } from "vitest";

// The pin swallows its own failures, because the commit it follows has already answered. What a
// unit test can say is that a failure stays swallowed; that it copies the right row, only onto
// the newest version and only once, is `probe:synopsis`'s.
vi.mock("../../db", () => ({ db: { select: () => { throw new Error("db down"); } } }));

import { pinSynopsisToVersion } from "./pin";

describe("pinSynopsisToVersion", () => {
  it("never throws into the commit's after()", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(pinSynopsisToVersion("d", "u", { versionId: "v", list: "l" })).resolves.toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
