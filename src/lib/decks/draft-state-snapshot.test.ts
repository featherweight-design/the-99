import { describe, expect, it } from "vitest";
import { READ_SNAPSHOT } from "./draft-state";

describe("readDraft's snapshot", () => {
  it("pins one instant without opening a read-only transaction", () => {
    // A read-only transaction poisoned the pooled connection for the next one (see cuts-read.ts).
    expect(READ_SNAPSHOT).toEqual({ isolationLevel: "repeatable read" });
    expect(READ_SNAPSHOT).not.toHaveProperty("accessMode");
  });
});
