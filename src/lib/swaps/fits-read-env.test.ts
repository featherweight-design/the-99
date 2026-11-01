// Fits your decks hands the reader's env to its run (admin PR 6f-2): the read's two actions hand it to
// `readFitsRead` / `pressFitsRead`, for the allowance. Checked by identity, never compared, so a dropped argument is seen.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { envViewWith } from "@/test/env-view";

const ENV = vi.hoisted(() => ({ value: null as NodeJS.ProcessEnv | null }));
const stub = vi.hoisted(() => ({
  read: vi.fn(async () => null),
  press: vi.fn(async () => ({ ok: false, reason: "notFound" })),
}));
vi.mock("../../db", () => ({ db: {} }));
vi.mock("../auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../switches/request", () => ({ requestSwitchEnv: async () => ENV.value }));
vi.mock("./fits-read-run", () => ({ readFitsRead: stub.read, pressFitsRead: stub.press }));

const { pressFitsReadAction, readFitsReadAction } = await import("./fits-read-actions");

const CARD = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  ENV.value = envViewWith({});
  stub.read.mockClear();
  stub.press.mockClear();
});
afterEach(() => vi.unstubAllEnvs());

describe("Fits your decks' env", () => {
  it("is handed by both read actions to the run", async () => {
    await readFitsReadAction(CARD);
    await pressFitsReadAction(CARD);
    const read = stub.read.mock.calls[0] as unknown[];
    const press = stub.press.mock.calls[0] as unknown[];
    expect([read[0], read[1], press[0], press[1]]).toEqual(["user_1", CARD, "user_1", CARD]);
    expect(read[3] === ENV.value).toBe(true);
    expect(press[3] === ENV.value).toBe(true);
  });

  // Swap tools, the read's parent, is retired (always on): a reader whose env sets it false still reaches the run, where
  // only the model-call kill switch stops a spend.
  it("reaches the run whatever SWAP_TOOLS_ENABLED says", async () => {
    ENV.value = envViewWith({ SWAP_TOOLS_ENABLED: "false" });
    await readFitsReadAction(CARD);
    await pressFitsReadAction(CARD);
    expect(stub.read).toHaveBeenCalledTimes(1);
    expect(stub.press).toHaveBeenCalledTimes(1);
  });

  it("answers nothing for a malformed id, never reaching the run", async () => {
    expect(await readFitsReadAction("x")).toBeNull();
    expect(await pressFitsReadAction("x")).toEqual({ ok: false, reason: "notFound" });
    expect(stub.read).not.toHaveBeenCalled();
    expect(stub.press).not.toHaveBeenCalled();
  });
});
