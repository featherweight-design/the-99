import { describe, expect, it } from "vitest";

describe("downloadTextFile", () => {
  it("is exported as a function", async () => {
    const mod = await import("./download");
    expect(typeof mod.downloadTextFile).toBe("function");
  });
});
