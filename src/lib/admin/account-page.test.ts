import { describe, expect, it, vi } from "vitest";

// The batch spend's `system` sentinel has `model_calls` rows but is never an account, so its page is
// the app's 404, decided before any read.
const listAccounts = vi.fn();
const readSwitchSnapshot = vi.fn();
const execute = vi.fn();
vi.mock("../../db", () => ({ db: { select: () => { throw new Error("no read expected"); }, execute } }));
vi.mock("./accounts", () => ({ listAccounts }));
vi.mock("../switches/snapshot", () => ({ readSwitchSnapshot }));

describe("loadAccountPage", () => {
  it("answers null for the system sentinel, reading nothing", async () => {
    const { loadAccountPage } = await import("./account-page");
    expect(await loadAccountPage("system")).toBeNull();
    expect(listAccounts).not.toHaveBeenCalled();
    expect(readSwitchSnapshot).not.toHaveBeenCalled();
  });
});
