// Fits your decks takes the reader's env down to its claim read (admin PR 6f-2): the read's two actions
// hand it to `readFitsRead` / `pressFitsRead`, and `loadFitsReadInputs` hands it to `loadFits`. Opposite to
// the environment on NEVER_CUT_ENABLED and CHANGE_COMMANDER_ENABLED, so a dropped argument would read the
// other way; checked by identity, never compared.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { envViewWith } from "@/test/env-view";

const ENV = vi.hoisted(() => ({ value: null as NodeJS.ProcessEnv | null }));
const stub = vi.hoisted(() => ({
  read: vi.fn(async () => null),
  press: vi.fn(async () => ({ ok: false, reason: "notFound" })),
  fits: vi.fn(async () => null),
}));
vi.mock("../../db", () => ({ db: {} }));
vi.mock("../auth", () => ({ requireUserId: async () => "user_1" }));
vi.mock("../switches/request", () => ({ requestSwitchEnv: async () => ENV.value }));
vi.mock("./flag", () => ({ findADeckReadEnabled: () => true }));
vi.mock("./fits-read-run", () => ({ readFitsRead: stub.read, pressFitsRead: stub.press }));
vi.mock("./fits", async (orig) => ({ ...(await orig<typeof import("./fits")>()), loadFits: stub.fits }));

const { pressFitsReadAction, readFitsReadAction } = await import("./fits-read-actions");
const { loadFitsReadInputs } = await import("./fits-read-load");

const CARD = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  vi.stubEnv("NEVER_CUT_ENABLED", "false");
  vi.stubEnv("CHANGE_COMMANDER_ENABLED", "false");
  ENV.value = envViewWith({ NEVER_CUT_ENABLED: "true", CHANGE_COMMANDER_ENABLED: "true" });
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

  it("is handed by loadFitsReadInputs to loadFits", async () => {
    expect(await loadFitsReadInputs("u", CARD, {}, ENV.value!)).toBeNull();
    const call = stub.fits.mock.calls[0] as unknown[];
    expect(call.slice(0, 2)).toEqual(["u", CARD]);
    expect(call[2] === ENV.value).toBe(true);
  });
});
