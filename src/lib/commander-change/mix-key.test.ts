import { afterEach, describe, expect, it, vi } from "vitest";

const select = vi.fn();
vi.mock("../../db", () => ({ db: { select: (...a: unknown[]) => select(...a) } }));
const { commanderKeyParts } = await import("./mix-key");

afterEach(() => { delete process.env.CHANGE_COMMANDER_ENABLED; select.mockReset(); });

describe("commanderKeyParts", () => {
  it("adds nothing, and reads nothing, with the switch off: every deck keeps today's key", async () => {
    expect(await commanderKeyParts("d1")).toEqual([]);
    expect(select).not.toHaveBeenCalled();
  });

  it("adds the live commander and partner as plain strings with the switch on", async () => {
    process.env.CHANGE_COMMANDER_ENABLED = "true";
    select.mockReturnValue({ from: () => ({ where: async () => [{ c: "korvold", p: null }] }) });
    expect(await commanderKeyParts("d1")).toEqual(["korvold", "-"]);
  });
});
