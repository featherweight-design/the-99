import { afterEach, describe, expect, it, vi } from "vitest";

const select = vi.fn();
vi.mock("../../db", () => ({ db: { select: (...a: unknown[]) => select(...a) } }));
const { commanderKeyParts } = await import("./mix-key");

afterEach(() => { select.mockReset(); });

describe("commanderKeyParts", () => {
  it("adds the live commander and partner as plain strings", async () => {
    select.mockReturnValue({ from: () => ({ where: async () => [{ c: "korvold", p: null }] }) });
    expect(await commanderKeyParts("d1")).toEqual(["korvold", "-"]);
  });
});
